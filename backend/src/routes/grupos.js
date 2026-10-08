const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");
const { recontarGrupo, liberarMensualidades, SQL_SIN_PAGAR_DESDE_HOY } = require("../utils/pagos");
const { HORARIO_MAP, generarSesiones, borrarSesiones, tieneAsistencia } = require("../utils/sesiones");
const { borrarGrupo } = require("../utils/borrado");
const { SQL_MES_VIGENTE, SQL_MES_ENTRADA, mesesDeCiclo } = require("../utils/meses");

const router = express.Router();
router.use(authenticate);

const err = (status, message) => Object.assign(new Error(message), { status });
function manejarError(res, e, ruta) {
  if (e.status) return res.status(e.status).json({ error: e.message });
  if (/cohorte_ciclo_id_entrenador_id_horario_key|23505/.test(e.message || "")) {
    return res.status(409).json({ error: "Ese entrenador ya tiene un grupo en ese ciclo con el mismo horario" });
  }
  console.error(`Error ${ruta}:`, e);
  res.status(500).json({ error: "Error interno" });
}

const ESTADOS = ["abierta", "en_curso", "cerrada", "finalizada"];

// Estadísticas de UN mes del ciclo de un grupo (alias grupo `g`, mes `cm` de la vista ciclo_mes).
// Inscritos del mes = inscripciones con mensualidad de ese mes (pagada o no).
const SQL_STATS_MES = `
  SELECT COUNT(*)                                                     AS inscritos,
         COUNT(*) FILTER (WHERE pa.estado = 'pagado')                 AS pagados,
         COUNT(*) FILTER (WHERE pa.estado = 'pendiente')              AS pendientes,
         COUNT(*) FILTER (WHERE pa.estado = 'vencido')                AS vencidos,
         COALESCE(SUM(pa.monto), 0)                                   AS esperado,
         COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado = 'pagado'), 0) AS recaudado,
         (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.asistio) / NULLIF(COUNT(*), 0))
            FROM asistencia a JOIN sesion s ON s.id = a.sesion_id
           WHERE s.grupo_id = g.id AND s.fecha BETWEEN cm.fecha_inicio AND cm.fecha_fin) AS asistencia_pct,
         (SELECT COUNT(*) FROM sesion s WHERE s.grupo_id = g.id AND s.fecha BETWEEN cm.fecha_inicio AND cm.fecha_fin) AS sesiones
  FROM pago pa JOIN inscripcion i ON i.id = pa.inscripcion_id
  WHERE i.grupo_id = g.id AND pa.mes = cm.mes`;

// ─── GET /grupos ──────────────────────────────────────────
// La configuración del grupo es la del ciclo completo; las cifras (inscritos, ingresos,
// asistencia) son del mes del ciclo en curso: mes_* .
router.get("/", authorize("admin", "entrenador"), async (req, res) => {
  try {
    const { estado, cicloId, programaId, entrenadorId, nivel } = req.query;
    let sql = `
      SELECT g.*, p.nombre AS programa_nombre, p.nivel, p.poblacion,
             ci.codigo AS ciclo_codigo, ci.anio, ci.trimestre,
             ci.fecha_inicio, ci.fecha_fin,
             cm.mes AS mes_vigente, cm.fecha_inicio AS mes_inicio, cm.fecha_fin AS mes_fin,
             to_char(cm.periodo, 'YYYY-MM') AS mes_periodo,
             st.inscritos AS mes_inscritos, st.pagados AS mes_pagados, st.pendientes AS mes_pendientes,
             st.vencidos AS mes_vencidos, st.recaudado AS mes_recaudado, st.esperado AS mes_esperado,
             st.asistencia_pct AS mes_asistencia_pct,
             m.nombre AS muro_nombre, ent.nombre AS entrenador_nombre,
             (SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = g.id AND i.estado = 'reservada') AS reservas,
             (SELECT COUNT(*) FROM sesion s WHERE s.grupo_id = g.id) AS total_sesiones,
             (SELECT MAX(s.numero_sesion) FROM sesion s WHERE s.grupo_id = g.id AND s.fecha <= CURRENT_DATE) AS sesion_actual,
             (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.asistio) / NULLIF(COUNT(*), 0))
                FROM asistencia a JOIN sesion s ON s.id = a.sesion_id WHERE s.grupo_id = g.id) AS asistencia_pct,
             (SELECT COALESCE(SUM(pa.monto), 0) FROM pago pa JOIN inscripcion i ON i.id = pa.inscripcion_id
                WHERE i.grupo_id = g.id AND pa.estado = 'pagado') AS ingresos_grupo,
             (SELECT COUNT(*) FROM pago pa JOIN inscripcion i ON i.id = pa.inscripcion_id
                WHERE i.grupo_id = g.id AND pa.estado IN ('pendiente', 'vencido')) AS pagos_pendientes_grupo
      FROM grupo g
      JOIN programa p ON g.programa_id = p.id
      JOIN ciclo ci ON g.ciclo_id = ci.id
      JOIN ciclo_mes cm ON cm.ciclo_id = ci.id AND cm.mes = ${SQL_MES_VIGENTE()}
      CROSS JOIN LATERAL (${SQL_STATS_MES}) st
      LEFT JOIN muro_aliado m ON g.muro_id = m.id
      JOIN entrenador ent ON g.entrenador_id = ent.id
      WHERE 1=1`;
    const params = [];
    if (estado)       { params.push(estado);       sql += ` AND g.estado::text = $${params.length}`; }
    if (cicloId)      { params.push(cicloId);      sql += ` AND g.ciclo_id = $${params.length}`; }
    if (programaId)   { params.push(programaId);   sql += ` AND g.programa_id = $${params.length}`; }
    if (entrenadorId) { params.push(entrenadorId); sql += ` AND g.entrenador_id = $${params.length}`; }
    if (nivel)        { params.push(nivel);        sql += ` AND p.nivel::text = $${params.length}`; }
    if (req.user.rol === "entrenador") {
      params.push(req.user.entrenador.id);
      sql += ` AND g.entrenador_id = $${params.length}`;
    }
    sql += " ORDER BY ci.anio DESC, ci.trimestre DESC, p.nombre";
    res.json(await prisma.$queryRawUnsafe(sql, ...params));
  } catch (e) { manejarError(res, e, "GET /grupos"); }
});

// ─── GET /grupos/disponibles ──────────────────────────────
// Catálogo para inscribirse: grupos abiertos o en curso de ciclos no terminados, con la tarifa
// mensual de su modalidad y el mes del ciclo en que entraría quien se inscriba hoy (y sus fechas).
router.get("/disponibles", async (req, res) => {
  try {
    const escaladorId = req.user.escalador?.id || null;
    const result = await prisma.$queryRawUnsafe(
      `SELECT g.id, g.modalidad, g.horario, g.cupo_maximo, g.estado,
              p.nombre AS programa_nombre, p.nivel, p.poblacion, p.descripcion AS programa_descripcion,
              p.incluye_fisio, p.incluye_nutricion,
              ci.codigo AS ciclo_codigo, ci.fecha_inicio, ci.fecha_fin,
              m.nombre AS muro_nombre, m.direccion AS muro_direccion,
              ent.nombre AS entrenador_nombre, ent.licencia_ley181,
              t.precio_mensual,
              me.mes AS mes_entrada, me.fecha_inicio AS mes_entrada_inicio, me.fecha_fin AS mes_entrada_fin,
              (SELECT json_agg(json_build_object('mes', cm.mes, 'fechaInicio', cm.fecha_inicio, 'fechaFin', cm.fecha_fin) ORDER BY cm.mes)
                 FROM ciclo_mes cm WHERE cm.ciclo_id = ci.id) AS meses,
              (SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = g.id AND i.estado IN ('activa','reservada')) AS inscritos_actual,
              EXISTS (SELECT 1 FROM inscripcion i WHERE i.grupo_id = g.id AND i.escalador_id = $1::uuid
                        AND i.estado IN ('activa','reservada')) AS ya_inscrito
       FROM grupo g
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       LEFT JOIN muro_aliado m ON g.muro_id = m.id
       JOIN entrenador ent ON g.entrenador_id = ent.id
       LEFT JOIN tarifa t ON t.modalidad = g.modalidad
       JOIN ciclo_mes me ON me.ciclo_id = ci.id AND me.mes = ${SQL_MES_ENTRADA()}
       WHERE g.estado IN ('abierta', 'en_curso') AND CURRENT_DATE <= ci.fecha_fin
       ORDER BY p.nombre`,
      escaladorId
    );
    res.json(result.map(g => ({ ...g, precio_mensual: g.precio_mensual != null ? parseFloat(g.precio_mensual) : null })));
  } catch (e) { manejarError(res, e, "GET /grupos/disponibles"); }
});

// ─── GET /grupos/:id ──────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT g.*, p.nombre AS programa_nombre, p.nivel, p.poblacion,
              ci.codigo AS ciclo_codigo, ci.anio, ci.trimestre, ci.fecha_inicio, ci.fecha_fin,
              m.nombre AS muro_nombre, ent.nombre AS entrenador_nombre
       FROM grupo g
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       LEFT JOIN muro_aliado m ON g.muro_id = m.id
       JOIN entrenador ent ON g.entrenador_id = ent.id
       WHERE g.id = $1`,
      req.params.id
    );
    if (!result.length) return res.status(404).json({ error: "Grupo no encontrado" });
    const grupo = result[0];

    if (req.user.rol === "entrenador" && grupo.entrenador_id !== req.user.entrenador?.id) {
      return res.status(403).json({ error: "Este grupo no es tuyo" });
    }
    const meses = await mesesDeCiclo(grupo.ciclo_id);
    if (req.user.rol === "escalador") {
      const propio = await prisma.$queryRawUnsafe(
        "SELECT 1 FROM inscripcion WHERE grupo_id = $1 AND escalador_id = $2", req.params.id, req.user.escalador?.id
      );
      if (!propio.length) return res.status(403).json({ error: "Sin acceso a este grupo" });
      return res.json({ ...grupo, meses });
    }

    // Cifras de cada mes del ciclo: inscritos, pagos, ingresos y asistencia.
    const stats = await prisma.$queryRawUnsafe(
      `SELECT cm.mes, st.* FROM grupo g
       JOIN ciclo_mes cm ON cm.ciclo_id = g.ciclo_id
       CROSS JOIN LATERAL (${SQL_STATS_MES}) st
       WHERE g.id = $1 ORDER BY cm.mes`,
      req.params.id
    );
    const statsDe = Object.fromEntries(stats.map(r => [r.mes, r]));
    const mesesConStats = meses.map(m => {
      const r = statsDe[m.mes] || {};
      return {
        ...m,
        inscritos: Number(r.inscritos || 0), pagados: Number(r.pagados || 0),
        pendientes: Number(r.pendientes || 0), vencidos: Number(r.vencidos || 0),
        esperado: parseFloat(r.esperado || 0), recaudado: parseFloat(r.recaudado || 0),
        asistenciaPct: r.asistencia_pct != null ? Number(r.asistencia_pct) : null,
        sesiones: Number(r.sesiones || 0),
      };
    });

    // Escaladores del grupo con el estado de su mensualidad en cada mes (null = no inscrito ese mes).
    // `escaladores` = inscripciones activas (lista, asistencia); `porMes` incluye a quienes ya salieron.
    const filas = await prisma.$queryRawUnsafe(
      `SELECT e.id, e.nombre, e.apellido, e.estado, e.rango_etario, u.email, i.estado AS inscripcion_estado,
              i.id AS inscripcion_id,
              (SELECT json_object_agg(pa.mes, pa.estado) FROM pago pa WHERE pa.inscripcion_id = i.id) AS meses_estado
       FROM inscripcion i
       JOIN escalador e ON i.escalador_id = e.id
       JOIN usuario u ON e.usuario_id = u.id
       WHERE i.grupo_id = $1
         AND (i.estado IN ('activa', 'reservada') OR EXISTS (SELECT 1 FROM pago pa WHERE pa.inscripcion_id = i.id))
       ORDER BY e.nombre, e.apellido`,
      req.params.id
    );
    const porMes = filas.map(f => ({ ...f, meses_estado: f.meses_estado || {} }));
    const escaladores = porMes.filter(f => f.inscripcion_estado === "activa");
    res.json({ ...grupo, meses: mesesConStats, escaladores, porMes });
  } catch (e) { manejarError(res, e, "GET /grupos/:id"); }
});

async function validarReferencias(tx, { programaId, cicloId, entrenadorId, muroId }, excluirGrupoId = null) {
  if (programaId) {
    const p = await tx.$queryRawUnsafe("SELECT 1 FROM programa WHERE id = $1 AND activo", programaId);
    if (!p.length) throw err(400, "Programa no encontrado o inactivo");
  }
  if (cicloId) {
    const c = await tx.$queryRawUnsafe("SELECT 1 FROM ciclo WHERE id = $1", cicloId);
    if (!c.length) throw err(400, "Ciclo no encontrado");
  }
  if (muroId) {
    const m = await tx.$queryRawUnsafe("SELECT 1 FROM muro_aliado WHERE id = $1", muroId);
    if (!m.length) throw err(400, "Sede no encontrada");
  }
  if (entrenadorId) {
    const ent = await tx.$queryRawUnsafe(
      `SELECT e.max_grupos, u.activo,
              (SELECT COUNT(*) FROM grupo g WHERE g.entrenador_id = e.id AND g.estado IN ('abierta','en_curso')
                 AND ($2::uuid IS NULL OR g.id <> $2::uuid)) AS activos
       FROM entrenador e JOIN usuario u ON u.id = e.usuario_id WHERE e.id = $1`,
      entrenadorId, excluirGrupoId
    );
    if (!ent.length) throw err(400, "Entrenador no encontrado");
    if (!ent[0].activo) throw err(400, "El entrenador está desactivado");
    if (Number(ent[0].activos) >= ent[0].max_grupos) {
      throw err(400, `El entrenador ya tiene ${ent[0].activos} grupos activos (máximo ${ent[0].max_grupos})`);
    }
  }
}

// ─── POST /grupos ─────────────────────────────────────────
router.post("/", authorize("admin"), [
  body("programaId").isUUID(),
  body("cicloId").isUUID(),
  body("entrenadorId").isUUID(),
  body("modalidad").isIn(["autonomo", "acompanado"]),
  body("cupoMaximo").isInt({ min: 1, max: 50 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: "Completa programa, ciclo, entrenador, modalidad y cupo (1–50)" });

  try {
    const { programaId, cicloId, muroId, entrenadorId, modalidad, horario, cupoMaximo, estado } = req.body;
    const esAcompanado = modalidad === "acompanado";
    if (esAcompanado && (!muroId || !horario)) throw err(400, "Los grupos acompañados requieren sede y horario.");
    if (horario && !HORARIO_MAP[horario]) throw err(400, "Horario no reconocido");
    if (estado && !ESTADOS.includes(estado)) throw err(400, "Estado inválido");

    const grupo = await prisma.$transaction(async (tx) => {
      await validarReferencias(tx, { programaId, cicloId, entrenadorId, muroId });
      const r = await tx.$queryRawUnsafe(
        `INSERT INTO grupo (programa_id, ciclo_id, muro_id, entrenador_id, modalidad, horario, cupo_maximo, estado)
         VALUES ($1, $2, $3, $4, $5::"ModalidadPlan", $6, $7, $8::"EstadoGrupo") RETURNING *`,
        programaId, cicloId, muroId || null, entrenadorId, modalidad,
        esAcompanado ? horario : (horario || null), parseInt(cupoMaximo), estado || "abierta"
      );
      return r[0];
    });
    res.status(201).json(grupo);
  } catch (e) { manejarError(res, e, "POST /grupos"); }
});

// ─── PUT /grupos/:id ──────────────────────────────────────
// Efectos en datos relacionados:
//  · modalidad → actualiza el monto de las mensualidades pendientes desde el mes en curso.
//  · horario / ciclo → regenera las sesiones si aún no hay asistencia registrada.
router.put("/:id", authorize("admin"), async (req, res) => {
  try {
    const grupoId = req.params.id;
    const { modalidad, horario, cupoMaximo, entrenadorId, muroId, programaId, cicloId } = req.body;

    const resultado = await prisma.$transaction(async (tx) => {
      const actual = await tx.$queryRawUnsafe(
        `SELECT g.*, g.modalidad::text AS modalidad_txt,
                (SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = g.id AND i.estado IN ('activa','reservada')) AS ocupados,
                (SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = g.id) AS inscripciones
         FROM grupo g WHERE g.id = $1 FOR UPDATE`,
        grupoId
      );
      if (!actual.length) throw err(404, "Grupo no encontrado");
      const g = actual[0];

      const nuevaModalidad = modalidad || g.modalidad_txt;
      const nuevoHorario = "horario" in req.body ? (horario || null) : g.horario;
      const nuevoMuro = "muroId" in req.body ? (muroId || null) : g.muro_id;
      if (modalidad && !["autonomo", "acompanado"].includes(modalidad)) throw err(400, "Modalidad inválida");
      if (nuevoHorario && !HORARIO_MAP[nuevoHorario]) throw err(400, "Horario no reconocido");
      if (nuevaModalidad === "acompanado" && (!nuevoMuro || !nuevoHorario)) {
        throw err(400, "Los grupos acompañados requieren sede y horario.");
      }
      if (cupoMaximo !== undefined) {
        const cupo = parseInt(cupoMaximo);
        if (!(cupo >= 1 && cupo <= 50)) throw err(400, "El cupo debe estar entre 1 y 50");
        if (cupo < Number(g.ocupados)) throw err(400, `El grupo ya tiene ${g.ocupados} cupos ocupados; el cupo no puede ser menor`);
      }
      if ((programaId && programaId !== g.programa_id) && Number(g.inscripciones) > 0) {
        throw err(400, "No se puede cambiar el programa de un grupo que ya tiene inscripciones");
      }
      await validarReferencias(tx, {
        programaId: programaId !== g.programa_id ? programaId : null,
        cicloId: cicloId !== g.ciclo_id ? cicloId : null,
        entrenadorId: entrenadorId && entrenadorId !== g.entrenador_id ? entrenadorId : null,
        muroId: nuevoMuro !== g.muro_id ? nuevoMuro : null,
      }, grupoId);

      const r = await tx.$queryRawUnsafe(
        `UPDATE grupo SET modalidad = $1::"ModalidadPlan", horario = $2, muro_id = $3,
                cupo_maximo = COALESCE($4::int, cupo_maximo),
                entrenador_id = COALESCE($5::uuid, entrenador_id),
                programa_id = COALESCE($6::uuid, programa_id),
                ciclo_id = COALESCE($7::uuid, ciclo_id),
                updated_at = NOW()
         WHERE id = $8::uuid RETURNING *`,
        nuevaModalidad, nuevoHorario, nuevoMuro,
        cupoMaximo !== undefined ? parseInt(cupoMaximo) : null,
        entrenadorId || null, programaId || null, cicloId || null, grupoId
      );

      const avisos = [];
      if (nuevaModalidad !== g.modalidad_txt) {
        const n = await tx.$executeRawUnsafe(
          `UPDATE pago p SET monto = t.precio_mensual, updated_at = NOW()
           FROM inscripcion i, tarifa t, grupo g, ciclo ci
           WHERE p.inscripcion_id = i.id AND i.grupo_id = $1 AND g.id = i.grupo_id AND ci.id = g.ciclo_id
             AND t.modalidad = $2::"ModalidadPlan" AND ${SQL_SIN_PAGAR_DESDE_HOY}`,
          grupoId, nuevaModalidad
        );
        if (n) avisos.push(`${n} mensualidad(es) pendiente(s) actualizada(s) a la tarifa ${nuevaModalidad}`);
      }
      const cambioCalendario = nuevoHorario !== g.horario || (cicloId && cicloId !== g.ciclo_id);
      if (cambioCalendario) {
        const ses = await tx.$queryRawUnsafe("SELECT COUNT(*) AS n FROM sesion WHERE grupo_id = $1", grupoId);
        if (Number(ses[0].n) > 0) {
          if (await tieneAsistencia(tx, grupoId)) {
            avisos.push("El grupo ya tiene asistencia registrada: las sesiones NO se regeneraron. Usa “Regenerar sesiones” si quieres el nuevo calendario.");
          } else {
            await borrarSesiones(tx, grupoId);
            const total = await generarSesiones(tx, grupoId);
            avisos.push(`Sesiones regeneradas con el nuevo calendario (${total})`);
          }
        }
      }
      return { ...r[0], avisos };
    });
    res.json(resultado);
  } catch (e) { manejarError(res, e, "PUT /grupos/:id"); }
});

// ─── DELETE /grupos/:id ───────────────────────────────────
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const check = await tx.$queryRawUnsafe("SELECT id FROM grupo WHERE id = $1", req.params.id);
      if (!check.length) throw err(404, "Grupo no encontrado");
      await borrarGrupo(tx, req.params.id);
    });
    res.json({ message: "Grupo eliminado" });
  } catch (e) { manejarError(res, e, "DELETE /grupos/:id"); }
});

// ─── PATCH /grupos/:id/estado ─────────────────────────────
// Finalizar el grupo completa sus inscripciones activas y deja de cobrarles.
router.patch("/:id/estado", authorize("admin"), async (req, res) => {
  try {
    const { estado } = req.body;
    if (!ESTADOS.includes(estado)) {
      return res.status(400).json({ error: "Estado inválido (abierta | en_curso | cerrada | finalizada)" });
    }
    const avisos = [];
    await prisma.$transaction(async (tx) => {
      const r = await tx.$queryRawUnsafe(
        `UPDATE grupo SET estado = $1::"EstadoGrupo", updated_at = NOW() WHERE id = $2 RETURNING id`, estado, req.params.id
      );
      if (!r.length) throw err(404, "Grupo no encontrado");
      if (estado === "finalizada") {
        const ids = await tx.$queryRawUnsafe(
          `UPDATE inscripcion SET estado = 'completada', updated_at = NOW()
           WHERE grupo_id = $1 AND estado IN ('activa', 'reservada') RETURNING id`, req.params.id
        );
        if (ids.length) {
          await liberarMensualidades(ids.map(i => i.id), tx);
          avisos.push(`${ids.length} inscripción(es) marcada(s) como completada(s)`);
        }
      }
      await recontarGrupo(req.params.id, tx);
    });
    res.json({ message: `Estado cambiado a ${estado}`, avisos });
  } catch (e) { manejarError(res, e, "PATCH /grupos/:id/estado"); }
});

module.exports = router;
