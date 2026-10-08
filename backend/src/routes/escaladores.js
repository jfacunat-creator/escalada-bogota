const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");
const { recontarGrupo, liberarMensualidades } = require("../utils/pagos");
const { borrarEscalador } = require("../utils/borrado");
const { esMenor, validarConsentimiento, guardarConsentimiento, consentimientoVigente } = require("../utils/consentimiento");

const router = express.Router();
router.use(authenticate);

const err = (status, message) => Object.assign(new Error(message), { status });
function manejarError(res, e, ruta) {
  if (e.status) return res.status(e.status).json({ error: e.message });
  if (/usuario_email_key|23505/.test(e.message || "")) return res.status(409).json({ error: "Ese email ya está registrado" });
  console.error(`Error ${ruta}:`, e);
  res.status(500).json({ error: "Error interno" });
}

// Mismo cálculo que en el registro (auth.js).
function rangoEtarioDe(fechaNacimiento) {
  const nac = new Date(fechaNacimiento);
  const hoy = new Date();
  const edad = hoy.getFullYear() - nac.getFullYear() -
    (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate()) ? 1 : 0);
  if (edad < 10) return "menor_6_9";
  if (edad < 13) return "menor_10_12";
  if (edad < 16) return "menor_13_15";
  return "adulto";
}

// El entrenador ve a sus escaladores (inscripción activa en sus grupos) y a los pendientes
// de activación, a quienes contacta para la evaluación inicial.
async function entrenadorPuedeVer(entrenadorId, escaladorId) {
  const r = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM escalador e
     WHERE e.id = $1 AND (e.estado = 'pendiente' OR EXISTS (
       SELECT 1 FROM inscripcion i JOIN grupo g ON g.id = i.grupo_id
       WHERE i.escalador_id = e.id AND g.entrenador_id = $2 AND i.estado IN ('activa','congelada','reservada')))`,
    escaladorId, entrenadorId
  );
  return r.length > 0;
}

// ─── GET /escaladores ─────────────────────────────────────
router.get("/", authorize("admin", "entrenador"), async (req, res) => {
  try {
    if (req.user.rol === "entrenador" && !req.user.entrenador?.id) {
      return res.status(403).json({ error: "Perfil de entrenador no encontrado" });
    }

    const { estado, rangoEtario, buscar, grupoId, nivel } = req.query;
    const params = [];
    const conditions = [];
    let inscripcionGrupoSelect = "";

    if (estado)      { params.push(estado);      conditions.push(`e.estado::text = $${params.length}`); }
    if (rangoEtario) { params.push(rangoEtario); conditions.push(`e.rango_etario::text = $${params.length}`); }
    if (nivel)       { params.push(nivel);       conditions.push(`e.nivel::text = $${params.length}`); }
    if (buscar) {
      params.push(`%${buscar}%`);
      const p = params.length;
      conditions.push(`(e.nombre ILIKE $${p} OR e.apellido ILIKE $${p} OR u.email ILIKE $${p})`);
    }
    if (grupoId) {
      params.push(grupoId);
      const p = params.length;
      conditions.push(`EXISTS (SELECT 1 FROM inscripcion i WHERE i.escalador_id = e.id AND i.grupo_id = $${p} AND i.estado IN ('activa', 'congelada'))`);
      inscripcionGrupoSelect = `,
        (SELECT id FROM inscripcion i2 WHERE i2.escalador_id = e.id AND i2.grupo_id = $${p} AND i2.estado IN ('activa', 'congelada') LIMIT 1) AS inscripcion_id,
        (SELECT estado FROM inscripcion i2 WHERE i2.escalador_id = e.id AND i2.grupo_id = $${p} AND i2.estado IN ('activa', 'congelada') LIMIT 1) AS inscripcion_estado`;
    }

    if (req.user.rol === "entrenador") {
      params.push(req.user.entrenador.id);
      conditions.push(`(e.estado = 'pendiente' OR EXISTS (
        SELECT 1 FROM inscripcion i JOIN grupo g ON i.grupo_id = g.id
        WHERE i.escalador_id = e.id AND g.entrenador_id = $${params.length} AND i.estado IN ('activa','congelada')
      ))`);
    }

    const where = conditions.length ? " AND " + conditions.join(" AND ") : "";
    const sql = `
      SELECT e.*, u.email, u.activo as usuario_activo,
             (SELECT COUNT(*) FROM inscripcion i WHERE i.escalador_id = e.id AND i.estado = 'activa') as grupos_activos,
             (SELECT COUNT(*) FROM inscripcion i WHERE i.escalador_id = e.id AND i.estado = 'reservada') as reservas_pendientes,
             (SELECT COUNT(*) FROM pago pa JOIN inscripcion i2 ON pa.inscripcion_id = i2.id WHERE i2.escalador_id = e.id AND pa.estado IN ('pendiente','vencido')) as pagos_pendientes,
             (SELECT COALESCE(SUM(pa.monto), 0) FROM pago pa JOIN inscripcion i2 ON pa.inscripcion_id = i2.id WHERE i2.escalador_id = e.id AND pa.estado = 'pagado') as total_pagado,
             (SELECT p.nombre FROM inscripcion i2 JOIN grupo g2 ON i2.grupo_id = g2.id JOIN programa p ON g2.programa_id = p.id WHERE i2.escalador_id = e.id AND i2.estado = 'activa' LIMIT 1) as programa_activo,
             (SELECT ent.nombre FROM inscripcion i2 JOIN grupo g2 ON i2.grupo_id = g2.id JOIN entrenador ent ON g2.entrenador_id = ent.id WHERE i2.escalador_id = e.id AND i2.estado = 'activa' LIMIT 1) as entrenador_activo
             ${inscripcionGrupoSelect}
      FROM escalador e
      JOIN usuario u ON e.usuario_id = u.id
      WHERE 1=1${where}
      ORDER BY e.nombre, e.apellido`;

    res.json(await prisma.$queryRawUnsafe(sql, ...params));
  } catch (e) { manejarError(res, e, "GET /escaladores"); }
});

// ─── GET /escaladores/:id ─────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.rol === "escalador" && req.user.escalador?.id !== id) {
      return res.status(403).json({ error: "Solo puedes ver tu propio perfil" });
    }
    if (req.user.rol === "entrenador" && !(await entrenadorPuedeVer(req.user.entrenador?.id, id))) {
      return res.status(403).json({ error: "Este escalador no está en tus grupos" });
    }

    const result = await prisma.$queryRawUnsafe(
      `SELECT e.*, u.email FROM escalador e JOIN usuario u ON e.usuario_id = u.id WHERE e.id = $1`, id
    );
    if (!result.length) return res.status(404).json({ error: "Escalador no encontrado" });

    const inscripciones = await prisma.$queryRawUnsafe(
      `SELECT i.*, p.nombre AS programa, p.nivel, ci.codigo AS ciclo,
              m.nombre AS muro, g.horario, g.modalidad, g.id AS grupo_id,
              ent.nombre AS entrenador, t.precio_mensual
       FROM inscripcion i
       JOIN grupo g ON i.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       LEFT JOIN muro_aliado m ON g.muro_id = m.id
       JOIN entrenador ent ON g.entrenador_id = ent.id
       LEFT JOIN tarifa t ON t.modalidad = g.modalidad
       WHERE i.escalador_id = $1
       ORDER BY i.created_at DESC`,
      id
    );

    let pagos = [];
    if (req.user.rol !== "entrenador") {
      pagos = await prisma.$queryRawUnsafe(
        `SELECT pa.id, pa.inscripcion_id, pa.monto, pa.estado, pa.metodo, pa.referencia, pa.fecha_pago,
                pa.fecha_vencimiento, to_char(pa.periodo, 'YYYY-MM') AS periodo_mes,
                pa.mes, cm.clave AS mes_clave, cm.fecha_inicio AS mes_inicio, cm.fecha_fin AS mes_fin
         FROM pago pa JOIN inscripcion i ON i.id = pa.inscripcion_id
         JOIN grupo g ON g.id = i.grupo_id
         JOIN ciclo_mes cm ON cm.ciclo_id = g.ciclo_id AND cm.mes = pa.mes
         WHERE i.escalador_id = $1 ORDER BY cm.fecha_inicio DESC`,
        id
      );
    }

    const menor = esMenor(result[0].fecha_nacimiento);
    const consentimiento = await consentimientoVigente(id);
    res.json({ ...result[0], inscripciones, pagos, es_menor: menor, consentimiento });
  } catch (e) { manejarError(res, e, "GET /escaladores/:id"); }
});

// ─── POST /escaladores/:id/consentimiento ─────────────────
// El representante legal de un escalador menor de edad diligencia el formato (Ley 1098/2006)
// desde la cuenta del escalador, o el admin lo registra en su nombre. Reemplaza al vigente.
router.post("/:id/consentimiento", async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.rol === "entrenador" || (req.user.rol === "escalador" && req.user.escalador?.id !== id)) {
      return res.status(403).json({ error: "No puedes diligenciar el consentimiento de otro escalador" });
    }
    const e = await prisma.$queryRawUnsafe("SELECT fecha_nacimiento FROM escalador WHERE id = $1::uuid", id);
    if (!e.length) return res.status(404).json({ error: "Escalador no encontrado" });
    if (!esMenor(e[0].fecha_nacimiento)) return res.status(400).json({ error: "El escalador es mayor de edad: no requiere consentimiento de menores" });

    const v = validarConsentimiento(req.body);
    if (v.error) return res.status(400).json({ error: v.error });
    await prisma.$transaction(tx => guardarConsentimiento(tx, id, v.datos, req.ip));
    res.status(201).json({ message: "Consentimiento registrado", consentimiento: await consentimientoVigente(id) });
  } catch (e) { manejarError(res, e, "POST /escaladores/:id/consentimiento"); }
});

// ─── PUT /escaladores/:id ─────────────────────────────────
// El escalador edita sus datos de contacto; el admin además nombre, nacimiento y email.
router.put("/:id", [
  body("nombre").optional().trim(),
  body("apellido").optional().trim(),
  body("telefono").optional().trim(),
], async (req, res) => {
  try {
    const { id } = req.params;
    const esAdmin = req.user.rol === "admin";
    if (req.user.rol === "entrenador") return res.status(403).json({ error: "Solo el admin o el propio escalador pueden editar estos datos" });
    if (req.user.rol === "escalador" && req.user.escalador?.id !== id) {
      return res.status(403).json({ error: "Solo puedes editar tu propio perfil" });
    }

    const { nombre, apellido, pesoKg, telefono, contactoEmergencia, fechaNacimiento, email } = req.body;
    const sets = [], params = [];
    const set = (sql, v) => { params.push(v); sets.push(sql.replace("?", `$${params.length}`)); };

    if (nombre !== undefined)    { if (!nombre) return res.status(400).json({ error: "El nombre no puede quedar vacío" }); set("nombre = ?", nombre); }
    if (apellido !== undefined)  { if (!apellido) return res.status(400).json({ error: "El apellido no puede quedar vacío" }); set("apellido = ?", apellido); }
    if (telefono !== undefined)  set("telefono = ?", telefono || null);
    if (contactoEmergencia !== undefined) {
      if (!String(contactoEmergencia).trim()) return res.status(400).json({ error: "El contacto de emergencia es obligatorio" });
      set("contacto_emergencia = ?", String(contactoEmergencia).trim());
    }
    if (pesoKg !== undefined) {
      const p = pesoKg === "" || pesoKg === null ? null : parseFloat(pesoKg);
      if (p !== null && !(p > 20 && p < 250)) return res.status(400).json({ error: "Peso inválido" });
      set("peso_kg = ?", p);
    }
    if (fechaNacimiento !== undefined && esAdmin) {
      if (isNaN(new Date(fechaNacimiento))) return res.status(400).json({ error: "Fecha de nacimiento inválida" });
      set("fecha_nacimiento = ?::date", fechaNacimiento);
      set(`rango_etario = ?::"RangoEtario"`, rangoEtarioDe(fechaNacimiento));
    }
    if (email !== undefined && esAdmin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ error: "Email inválido" });
    }
    if (!sets.length && !(email !== undefined && esAdmin)) return res.status(400).json({ error: "Nada que actualizar" });

    const result = await prisma.$transaction(async (tx) => {
      let fila;
      if (sets.length) {
        sets.push("updated_at = NOW()");
        params.push(id);
        const r = await tx.$queryRawUnsafe(`UPDATE escalador SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, ...params);
        if (!r.length) throw err(404, "Escalador no encontrado");
        fila = r[0];
      }
      if (email !== undefined && esAdmin) {
        const u = await tx.$queryRawUnsafe("SELECT usuario_id FROM escalador WHERE id = $1", id);
        if (!u.length) throw err(404, "Escalador no encontrado");
        const dup = await tx.$queryRawUnsafe(
          "SELECT 1 FROM usuario WHERE lower(email) = lower($1) AND id <> $2", String(email).trim(), u[0].usuario_id
        );
        if (dup.length) throw err(409, "Ese email ya está registrado");
        await tx.$executeRawUnsafe("UPDATE usuario SET email = lower($1), updated_at = NOW() WHERE id = $2", String(email).trim(), u[0].usuario_id);
      }
      return fila || (await tx.$queryRawUnsafe("SELECT * FROM escalador WHERE id = $1", id))[0];
    });
    res.json(result);
  } catch (e) { manejarError(res, e, "PUT /escaladores/:id"); }
});

// ─── DELETE /escaladores/:id ─────────────────────────────
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const grupos = await borrarEscalador(tx, req.params.id);
      if (grupos === null) throw err(404, "Escalador no encontrado");
      for (const g of grupos) await recontarGrupo(g, tx);
    });
    res.json({ message: "Escalador eliminado" });
  } catch (e) { manejarError(res, e, "DELETE /escaladores/:id"); }
});

// ─── PATCH /escaladores/:id/nivel ────────────────────────
router.patch("/:id/nivel", authorize("admin"), [body("nivel").isIn(["iniciacion", "intermedio", "avanzado"])], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: "Nivel inválido" });
  try {
    const { id } = req.params;
    const { nivel } = req.body;
    const result = await prisma.$queryRawUnsafe(
      `UPDATE escalador SET nivel = $1::"NivelPrograma", updated_at = NOW() WHERE id = $2 RETURNING *`, nivel, id
    );
    if (!result.length) return res.status(404).json({ error: "Escalador no encontrado" });

    // El plan del escalador sale del programa de su grupo: si el grupo es de otro nivel hay que moverlo.
    const otroNivel = await prisma.$queryRawUnsafe(
      `SELECT p.nombre FROM inscripcion i JOIN grupo g ON g.id = i.grupo_id JOIN programa p ON p.id = g.programa_id
       WHERE i.escalador_id = $1 AND i.estado IN ('activa','reservada') AND p.nivel::text <> $2`,
      id, nivel
    );
    const avisos = otroNivel.length
      ? [`Sigue inscrito en ${otroNivel[0].nombre}, que es de otro nivel. Cancela esa inscripción e inscríbelo en un grupo de su nuevo nivel.`]
      : [];
    res.json({ ...result[0], avisos });
  } catch (e) { manejarError(res, e, "PATCH /escaladores/:id/nivel"); }
});

// ─── PATCH /escaladores/:id/estado ──────────────────────
// Efectos sobre sus inscripciones: congelado → congela las activas; activo → reactiva las
// congeladas; inactivo → cancela las vigentes. Las mensualidades pendientes futuras se borran.
router.patch("/:id/estado", authorize("admin"), [body("estado").isIn(["activo", "inactivo", "congelado", "pendiente"])], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: "Estado inválido" });
  try {
    const { estado } = req.body;
    const avisos = [];
    await prisma.$transaction(async (tx) => {
      const r = await tx.$queryRawUnsafe(
        `UPDATE escalador SET estado = $1::"EstadoEscalador", updated_at = NOW() WHERE id = $2 RETURNING id`, estado, req.params.id
      );
      if (!r.length) throw err(404, "Escalador no encontrado");

      const transicion = { congelado: [["activa"], "congelada"], activo: [["congelada"], "activa"], inactivo: [["activa", "reservada", "congelada"], "cancelada"] }[estado];
      if (!transicion) return;
      const cambiadas = await tx.$queryRawUnsafe(
        `UPDATE inscripcion SET estado = $1::"EstadoInscripcion", updated_at = NOW()
         WHERE escalador_id = $2 AND estado::text = ANY($3::text[]) RETURNING id, grupo_id`,
        transicion[1], req.params.id, transicion[0]
      );
      if (!cambiadas.length) return;
      if (transicion[1] !== "activa") {
        await liberarMensualidades(cambiadas.map(c => c.id), tx);
      }
      for (const c of cambiadas) await recontarGrupo(c.grupo_id, tx);
      avisos.push(`${cambiadas.length} inscripción(es) pasaron a ${transicion[1]}`);
    });
    res.json({ message: `Estado cambiado a ${estado}`, avisos });
  } catch (e) { manejarError(res, e, "PATCH /escaladores/:id/estado"); }
});

module.exports = router;
