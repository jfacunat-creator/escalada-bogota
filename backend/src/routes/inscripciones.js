const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /inscripciones ──────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { cohorteId, escaladorId, estado } = req.query;
    let sql = `
      SELECT i.*, e.nombre, e.apellido, e.estado as esc_estado, e.rango_etario,
             u.email,
             p.nombre as programa, ci.codigo as ciclo, m.nombre as muro,
             co.horario, co.modalidad,
             (SELECT COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado='pagado'),0) FROM pago pa WHERE pa.inscripcion_id=i.id) as total_pagado,
             (SELECT COUNT(*) FROM pago pa WHERE pa.inscripcion_id=i.id AND pa.estado='pendiente') as pagos_pendientes
      FROM inscripcion i
      JOIN escalador e ON i.escalador_id = e.id
      JOIN usuario u ON e.usuario_id = u.id
      JOIN cohorte co ON i.cohorte_id = co.id
      JOIN programa p ON co.programa_id = p.id
      JOIN ciclo ci ON co.ciclo_id = ci.id
      JOIN muro_aliado m ON co.muro_id = m.id
      WHERE 1=1
    `;
    const params = [];
    if (cohorteId) { params.push(cohorteId); sql += ` AND i.cohorte_id = $${params.length}`; }
    if (escaladorId) { params.push(escaladorId); sql += ` AND i.escalador_id = $${params.length}`; }
    if (estado) { params.push(estado); sql += ` AND i.estado = $${params.length}`; }
    if (req.user.rol === "escalador") { params.push(req.user.escalador.id); sql += ` AND i.escalador_id = $${params.length}`; }
    if (req.user.rol === "entrenador") { params.push(req.user.entrenador.id); sql += ` AND co.entrenador_id = $${params.length}`; }
    sql += " ORDER BY i.fecha_inscripcion DESC";

    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error:", err); res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /inscripciones — Inscribir escalador en cohorte ─
router.post("/", authorize("admin", "entrenador"), [
  body("escaladorId").isUUID(),
  body("cohorteId").isUUID(),
  body("precioCiclo").isFloat({ min: 0 }),
  body("descuentoAplicado").optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { escaladorId, cohorteId, precioCiclo, descuentoAplicado } = req.body;

    // Verificar cohorte abierta
    const coh = await db("SELECT estado, cupo_maximo, inscritos_actual, programa_id FROM cohorte WHERE id=$1", [cohorteId]);
    if (coh.rows.length === 0) return res.status(404).json({ error: "Cohorte no encontrada" });
    if (coh.rows[0].estado !== "abierta") return res.status(400).json({ error: "La cohorte no está abierta para inscripciones" });

    // Verificar cupo
    const inscritos = await db("SELECT COUNT(*) as n FROM inscripcion WHERE cohorte_id=$1 AND estado='activa'", [cohorteId]);
    if (parseInt(inscritos.rows[0].n) >= coh.rows[0].cupo_maximo) {
      return res.status(400).json({ error: "Cohorte sin cupos disponibles" });
    }

    // Verificar que escalador no esté ya inscrito en esta cohorte
    const dup = await db("SELECT id FROM inscripcion WHERE escalador_id=$1 AND cohorte_id=$2", [escaladorId, cohorteId]);
    if (dup.rows.length > 0) return res.status(409).json({ error: "Escalador ya inscrito en esta cohorte" });

    // Verificar rango etario para menores
    const esc = await db("SELECT rango_etario FROM escalador WHERE id=$1", [escaladorId]);
    const prog = await db("SELECT poblacion, rango_etario_menor FROM programa WHERE id=$1", [coh.rows[0].programa_id]);
    if (prog.rows[0].poblacion === "menor" && esc.rows[0].rango_etario === "adulto") {
      return res.status(400).json({ error: "Un adulto no puede inscribirse en un programa de menores" });
    }
    if (prog.rows[0].poblacion === "adulto" && esc.rows[0].rango_etario !== "adulto") {
      return res.status(400).json({ error: "Un menor no puede inscribirse en un programa de adultos" });
    }

    // Crear inscripción
    const result = await db(
      `INSERT INTO inscripcion (escalador_id, cohorte_id, precio_ciclo, descuento_aplicado)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [escaladorId, cohorteId, precioCiclo, descuentoAplicado || null]
    );

    // Actualizar contador
    await db("UPDATE cohorte SET inscritos_actual = inscritos_actual + 1 WHERE id=$1", [cohorteId]);

    // Crear pago pendiente
    await db(
      `INSERT INTO pago (inscripcion_id, monto, estado, fecha_vencimiento)
       VALUES ($1, $2, 'pendiente', CURRENT_DATE + INTERVAL '15 days')`,
      [result.rows[0].id, precioCiclo]
    );

    res.status(201).json({ message: "Inscripción creada con pago pendiente", inscripcion: result.rows[0] });
  } catch (err) {
    console.error("Error:", err); res.status(500).json({ error: "Error interno" });
  }
});

// ─── PATCH /inscripciones/:id/estado — Cambiar estado ────
router.patch("/:id/estado", authorize("admin"), [
  body("estado").isIn(["activa", "congelada", "cancelada", "completada"]),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { estado } = req.body;
    const insc = await db("SELECT estado as old, cohorte_id FROM inscripcion WHERE id=$1", [req.params.id]);
    if (insc.rows.length === 0) return res.status(404).json({ error: "Inscripción no encontrada" });

    await db("UPDATE inscripcion SET estado=$1 WHERE id=$2", [estado, req.params.id]);

    // Ajustar contador de cohorte
    const old = insc.rows[0].old;
    if (old === "activa" && estado !== "activa") {
      await db("UPDATE cohorte SET inscritos_actual = GREATEST(inscritos_actual - 1, 0) WHERE id=$1", [insc.rows[0].cohorte_id]);
    } else if (old !== "activa" && estado === "activa") {
      await db("UPDATE cohorte SET inscritos_actual = inscritos_actual + 1 WHERE id=$1", [insc.rows[0].cohorte_id]);
    }

    res.json({ message: `Estado cambiado a ${estado}` });
  } catch (err) {
    console.error("Error:", err); res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
