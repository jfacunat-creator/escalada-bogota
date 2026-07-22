const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /pagos ──────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { inscripcionId, estado, escaladorId } = req.query;
    let sql = `
      SELECT pa.*, i.precio_ciclo, i.estado as insc_estado,
             e.nombre, e.apellido,
             p.nombre as programa, ci.codigo as ciclo, co.modalidad
      FROM pago pa
      JOIN inscripcion i ON pa.inscripcion_id = i.id
      JOIN escalador e ON i.escalador_id = e.id
      JOIN cohorte co ON i.cohorte_id = co.id
      JOIN programa p ON co.programa_id = p.id
      JOIN ciclo ci ON co.ciclo_id = ci.id
      WHERE 1=1
    `;
    const params = [];
    if (inscripcionId) { params.push(inscripcionId); sql += ` AND pa.inscripcion_id = $${params.length}`; }
    if (estado) { params.push(estado); sql += ` AND pa.estado = $${params.length}`; }
    if (escaladorId) { params.push(escaladorId); sql += ` AND i.escalador_id = $${params.length}`; }
    if (req.user.rol === "escalador") { params.push(req.user.escalador.id); sql += ` AND i.escalador_id = $${params.length}`; }
    sql += " ORDER BY pa.created_at DESC";

    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error:", err); res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /pagos — Registrar pago manual ─────────────────
router.post("/", authorize("admin", "entrenador"), [
  body("inscripcionId").isUUID(),
  body("monto").isFloat({ min: 1 }),
  body("metodo").isIn(["transferencia", "efectivo"]),
  body("referencia").optional().isString(),
  body("comprobanteUrl").optional().isString(),
  body("fechaPago").optional().isISO8601(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const d = req.body;

    // Verificar inscripción
    const insc = await db("SELECT id, precio_ciclo FROM inscripcion WHERE id=$1", [d.inscripcionId]);
    if (insc.rows.length === 0) return res.status(404).json({ error: "Inscripción no encontrada" });

    const result = await db(
      `INSERT INTO pago (inscripcion_id, monto, metodo, referencia, comprobante_url, fecha_pago, estado)
       VALUES ($1,$2,$3,$4,$5,$6,'pagado') RETURNING *`,
      [d.inscripcionId, d.monto, d.metodo, d.referencia || null,
       d.comprobanteUrl || null, d.fechaPago || new Date().toISOString().split('T')[0]]
    );

    // Verificar si cubre el total → marcar pendientes anteriores
    const totalPagado = await db(
      "SELECT COALESCE(SUM(monto),0) as total FROM pago WHERE inscripcion_id=$1 AND estado='pagado'",
      [d.inscripcionId]
    );
    const total = parseFloat(totalPagado.rows[0].total);
    const precio = parseFloat(insc.rows[0].precio_ciclo);

    if (total >= precio) {
      // Marcar pagos pendientes como pagados
      await db("UPDATE pago SET estado='pagado' WHERE inscripcion_id=$1 AND estado='pendiente'", [d.inscripcionId]);
    }

    res.status(201).json({
      message: "Pago registrado",
      pago: result.rows[0],
      totalPagado: total,
      precioCiclo: precio,
      saldoPendiente: Math.max(0, precio - total),
    });
  } catch (err) {
    console.error("Error:", err); res.status(500).json({ error: "Error interno" });
  }
});

// ─── PATCH /pagos/:id/estado — Cambiar estado de pago ────
router.patch("/:id/estado", authorize("admin"), [
  body("estado").isIn(["pendiente", "pagado", "vencido"]),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    await db("UPDATE pago SET estado=$1 WHERE id=$2", [req.body.estado, req.params.id]);
    res.json({ message: `Pago marcado como ${req.body.estado}` });
  } catch (err) {
    console.error("Error:", err); res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /pagos/resumen — Dashboard de pagos (admin) ─────
router.get("/resumen/general", authorize("admin"), async (req, res) => {
  try {
    const { cicloId } = req.query;
    let where = "";
    const params = [];
    if (cicloId) { params.push(cicloId); where = ` AND co.ciclo_id = $${params.length}`; }

    const result = await db(`
      SELECT
        COUNT(DISTINCT i.id) as total_inscripciones,
        COUNT(DISTINCT i.id) FILTER (WHERE i.estado='activa') as activas,
        COALESCE(SUM(i.precio_ciclo) FILTER (WHERE i.estado='activa'), 0) as ingresos_esperados,
        COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado='pagado'), 0) as ingresos_recibidos,
        COUNT(pa.id) FILTER (WHERE pa.estado='pendiente') as pagos_pendientes,
        COUNT(pa.id) FILTER (WHERE pa.estado='vencido') as pagos_vencidos
      FROM inscripcion i
      JOIN cohorte co ON i.cohorte_id = co.id
      LEFT JOIN pago pa ON pa.inscripcion_id = i.id
      WHERE 1=1 ${where}
    `, params);

    const r = result.rows[0];
    res.json({
      ...r,
      tasa_recaudo: r.ingresos_esperados > 0
        ? Math.round((parseFloat(r.ingresos_recibidos) / parseFloat(r.ingresos_esperados)) * 100)
        : 0,
    });
  } catch (err) {
    console.error("Error:", err); res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
