const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");
const { tarifaMensual, recontarGrupo, crearMensualidad, liberarMensualidades } = require("../utils/pagos");
const { SQL_MES_ENTRADA, SQL_MES_VIGENTE, mesValido } = require("../utils/meses");

const router = express.Router();
router.use(authenticate);

const err = (status, message) => Object.assign(new Error(message), { status });

function manejarError(res, e, ruta) {
  if (e.status) return res.status(e.status).json({ error: e.message });
  if (e.code === "23505" || e.cause?.code === "23505" || /23505|unique/i.test(e.message)) {
    return res.status(409).json({ error: "El escalador ya tiene una inscripción en este grupo" });
  }
  console.error(`Error ${ruta}:`, e);
  res.status(500).json({ error: "Error interno" });
}

// Reglas comunes para inscribir a un escalador en un grupo (admin y autoservicio).
async function validarInscripcion(tx, escaladorId, grupoId) {
  const g = await tx.$queryRawUnsafe(
    `SELECT g.id, g.estado::text AS estado, g.cupo_maximo, g.modalidad::text AS modalidad,
            p.nivel::text AS nivel, p.poblacion::text AS poblacion,
            CURRENT_DATE > ci.fecha_fin AS ciclo_terminado, ${SQL_MES_ENTRADA()} AS mes_entrada,
            (SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = g.id AND i.estado IN ('activa','reservada')) AS ocupados
     FROM grupo g JOIN programa p ON g.programa_id = p.id JOIN ciclo ci ON ci.id = g.ciclo_id
     WHERE g.id = $1
     FOR UPDATE OF g`,
    grupoId
  );
  if (!g.length) throw err(404, "Grupo no encontrado");
  const grupo = g[0];
  if (!["abierta", "en_curso"].includes(grupo.estado)) throw err(400, "El grupo no está abierto para inscripciones");
  if (grupo.ciclo_terminado) throw err(400, "El ciclo de este grupo ya terminó");
  if (Number(grupo.ocupados) >= grupo.cupo_maximo) throw err(400, "Grupo sin cupos disponibles");

  const e = await tx.$queryRawUnsafe(
    "SELECT id, nivel::text AS nivel, rango_etario::text AS rango_etario FROM escalador WHERE id = $1", escaladorId
  );
  if (!e.length) throw err(404, "Escalador no encontrado");
  const esc = e[0];
  if (grupo.poblacion === "menor" && esc.rango_etario === "adulto") throw err(400, "Un adulto no puede inscribirse en un programa de menores");
  if (grupo.poblacion === "adulto" && esc.rango_etario !== "adulto") throw err(400, "Un menor no puede inscribirse en un programa de adultos");

  const vigentes = await tx.$queryRawUnsafe(
    `SELECT grupo_id FROM inscripcion WHERE escalador_id = $1 AND estado IN ('activa', 'reservada')`, escaladorId
  );
  if (vigentes.some(v => v.grupo_id === grupoId)) throw err(409, "El escalador ya está inscrito en este grupo");
  if (vigentes.length) throw err(409, "El escalador ya tiene una inscripción activa o un cupo reservado en otro grupo. Cancélala o complétala primero.");

  return { grupo, esc };
}

// Una inscripción por escalador y grupo (índice único): si ya hubo una (cancelada,
// completada o congelada) se reactiva en vez de crear otra.
async function crearOReactivar(tx, escaladorId, grupoId, estado) {
  const previa = await tx.$queryRawUnsafe(
    "SELECT id FROM inscripcion WHERE escalador_id = $1 AND grupo_id = $2", escaladorId, grupoId
  );
  const r = previa.length
    ? await tx.$queryRawUnsafe(
        `UPDATE inscripcion SET estado = $1::"EstadoInscripcion", fecha_inscripcion = CURRENT_DATE, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        estado, previa[0].id
      )
    : await tx.$queryRawUnsafe(
        `INSERT INTO inscripcion (escalador_id, grupo_id, estado) VALUES ($1, $2, $3::"EstadoInscripcion") RETURNING *`,
        escaladorId, grupoId, estado
      );
  return r[0];
}

// ─── GET /inscripciones ──────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { grupoId, escaladorId, estado } = req.query;
    let sql = `
      SELECT i.*, e.nombre, e.apellido, e.estado as esc_estado, e.rango_etario,
             u.email,
             p.nombre as programa, p.nivel, ci.codigo as ciclo, m.nombre as muro,
             co.horario, co.modalidad,
             ent.nombre as entrenador_nombre,
             t.precio_mensual,
             (SELECT COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado='pagado'),0) FROM pago pa WHERE pa.inscripcion_id=i.id) as total_pagado,
             (SELECT COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado IN ('pendiente','vencido')),0) FROM pago pa WHERE pa.inscripcion_id=i.id) as total_pendiente,
             (SELECT COUNT(*) FROM pago pa WHERE pa.inscripcion_id=i.id AND pa.estado IN ('pendiente','vencido')) as pagos_pendientes,
             (SELECT json_object_agg(pa.mes, pa.estado) FROM pago pa WHERE pa.inscripcion_id=i.id) as meses_estado,
             co.ciclo_id, ${SQL_MES_VIGENTE()} AS mes_vigente,
             (SELECT fecha_vencimiento FROM pago pa WHERE pa.inscripcion_id=i.id AND pa.estado IN ('pendiente','vencido') ORDER BY fecha_vencimiento ASC LIMIT 1) as fecha_vencimiento_reserva
      FROM inscripcion i
      JOIN escalador e ON i.escalador_id = e.id
      JOIN usuario u ON e.usuario_id = u.id
      JOIN grupo co ON i.grupo_id = co.id
      JOIN programa p ON co.programa_id = p.id
      JOIN ciclo ci ON co.ciclo_id = ci.id
      LEFT JOIN muro_aliado m ON co.muro_id = m.id
      JOIN entrenador ent ON co.entrenador_id = ent.id
      LEFT JOIN tarifa t ON t.modalidad = co.modalidad
      WHERE 1=1
    `;
    const params = [];
    if (grupoId)     { params.push(grupoId);     sql += ` AND i.grupo_id = $${params.length}`; }
    if (escaladorId) { params.push(escaladorId); sql += ` AND i.escalador_id = $${params.length}`; }
    if (estado)      { params.push(estado);      sql += ` AND i.estado::text = $${params.length}`; }
    if (req.user.rol === "escalador")  { params.push(req.user.escalador.id);  sql += ` AND i.escalador_id = $${params.length}`; }
    if (req.user.rol === "entrenador") { params.push(req.user.entrenador.id); sql += ` AND co.entrenador_id = $${params.length}`; }
    sql += " ORDER BY i.fecha_inscripcion DESC, i.created_at DESC";

    res.json(await prisma.$queryRawUnsafe(sql, ...params));
  } catch (e) { manejarError(res, e, "GET /inscripciones"); }
});

// ─── POST /inscripciones (admin) ─────────────────────────
// Inscribe directamente (queda activa) y crea, pendiente, la mensualidad del mes del ciclo en que
// entra: `mes` (1–3) o, por defecto, el mes en curso (el siguiente si al actual le queda < 1 semana).
router.post("/", authorize("admin"), [
  body("escaladorId").isUUID(),
  body("grupoId").isUUID(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: "Escalador y grupo son obligatorios" });
  if (req.body.mes != null && req.body.mes !== "" && !mesValido(req.body.mes)) {
    return res.status(400).json({ error: "El mes del ciclo debe ser 1, 2 o 3" });
  }

  try {
    const { escaladorId, grupoId } = req.body;
    const inscripcion = await prisma.$transaction(async (tx) => {
      const { grupo, esc } = await validarInscripcion(tx, escaladorId, grupoId);
      if (esc.nivel && esc.nivel !== grupo.nivel) {
        throw err(400, `El grupo es de nivel ${grupo.nivel} y el escalador tiene nivel ${esc.nivel}. Cambia su nivel primero si corresponde.`);
      }
      if (!esc.nivel) {
        await tx.$executeRawUnsafe(`UPDATE escalador SET nivel = $1::"NivelPrograma", updated_at = NOW() WHERE id = $2`, grupo.nivel, escaladorId);
      }
      await tarifaMensual(grupo.modalidad, tx); // falla si la modalidad no tiene tarifa
      const mes = mesValido(req.body.mes) || Number(grupo.mes_entrada);
      const ins = await crearOReactivar(tx, escaladorId, grupoId, "activa");
      await crearMensualidad(ins.id, mes, {}, tx);
      await recontarGrupo(grupoId, tx);
      return { ...ins, mes };
    });
    res.status(201).json({ message: `Inscripción creada con la mensualidad del mes ${inscripcion.mes} pendiente`, inscripcion });
  } catch (e) { manejarError(res, e, "POST /inscripciones"); }
});

// ─── POST /inscripciones/autoservicio ────────────────────
router.post("/autoservicio", authorize("escalador"), [body("grupoId").isUUID()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: "Grupo inválido" });

  try {
    const escaladorId = req.user.escalador.id;
    const { grupoId } = req.body;

    const inscripcion = await prisma.$transaction(async (tx) => {
      const { grupo, esc } = await validarInscripcion(tx, escaladorId, grupoId);
      if (grupo.poblacion !== "adulto") throw err(400, "Solo puedes inscribirte en programas adultos");
      if (!esc.nivel) throw err(403, "El equipo aún no te ha asignado un nivel. Espera a ser contactado.");
      if (esc.nivel !== grupo.nivel) throw err(400, `Este grupo es de nivel ${grupo.nivel}, pero tu nivel asignado es ${esc.nivel}.`);

      await tarifaMensual(grupo.modalidad, tx);
      const mes = Number(grupo.mes_entrada);
      const ins = await crearOReactivar(tx, escaladorId, grupoId, "reservada");
      // Mensualidad del mes en que entra: el cupo se reserva 24 h mientras llega el soporte de pago.
      const vence = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      await crearMensualidad(ins.id, mes, { vence }, tx);
      return { ...ins, mes };
    });

    res.status(201).json({
      message: `Cupo reservado para el mes ${inscripcion.mes} del ciclo. Tienes 24 horas para enviar el soporte de pago. El equipo activará tu inscripción al confirmar el pago.`,
      inscripcion,
    });
  } catch (e) { manejarError(res, e, "POST /inscripciones/autoservicio"); }
});

// ─── PATCH /inscripciones/:id/estado ─────────────────────
// Congelar / cancelar / completar deja de cobrar: se borran las mensualidades SIN PAGAR del mes
// del ciclo en curso en adelante (las pagadas y las vencidas de meses anteriores se conservan).
router.patch("/:id/estado", authorize("admin", "entrenador"), [
  body("estado").isIn(["activa", "congelada", "cancelada", "completada", "reservada"]),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: "Estado inválido" });

  try {
    const { estado } = req.body;
    await prisma.$transaction(async (tx) => {
      const insc = await tx.$queryRawUnsafe(
        `SELECT i.estado::text AS old, i.grupo_id, g.entrenador_id, g.cupo_maximo
         FROM inscripcion i JOIN grupo g ON i.grupo_id = g.id
         WHERE i.id = $1 FOR UPDATE OF g`,
        req.params.id
      );
      if (!insc.length) throw err(404, "Inscripción no encontrada");
      const { old, grupo_id, entrenador_id, cupo_maximo } = insc[0];
      if (req.user.rol === "entrenador" && entrenador_id !== req.user.entrenador?.id) {
        throw err(403, "No puedes modificar inscripciones de grupos que no son tuyos");
      }
      if (estado === "activa" && !["activa", "reservada"].includes(old)) {
        const ocupados = await tx.$queryRawUnsafe(
          `SELECT COUNT(*) AS n FROM inscripcion WHERE grupo_id = $1 AND estado IN ('activa','reservada') AND id <> $2`,
          grupo_id, req.params.id
        );
        if (Number(ocupados[0].n) >= cupo_maximo) throw err(400, "El grupo no tiene cupos para reactivar esta inscripción");
      }

      await tx.$executeRawUnsafe(
        `UPDATE inscripcion SET estado = $1::"EstadoInscripcion", updated_at = NOW() WHERE id = $2`, estado, req.params.id
      );
      if (["congelada", "cancelada", "completada"].includes(estado)) {
        await liberarMensualidades([req.params.id], tx);
      }
      await recontarGrupo(grupo_id, tx);
    });
    res.json({ message: `Estado cambiado a ${estado}` });
  } catch (e) { manejarError(res, e, "PATCH /inscripciones/:id/estado"); }
});

// ─── DELETE /inscripciones/:id ────────────────────────────
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const insc = await tx.$queryRawUnsafe("SELECT grupo_id FROM inscripcion WHERE id = $1", req.params.id);
      if (!insc.length) throw err(404, "Inscripción no encontrada");
      await tx.$executeRawUnsafe("DELETE FROM pago WHERE inscripcion_id = $1", req.params.id);
      await tx.$executeRawUnsafe("DELETE FROM inscripcion WHERE id = $1", req.params.id);
      await recontarGrupo(insc[0].grupo_id, tx);
    });
    res.json({ message: "Inscripción eliminada" });
  } catch (e) { manejarError(res, e, "DELETE /inscripciones/:id"); }
});

module.exports = router;
