const express = require("express");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /pagos/resumen ───────────────────────────────────
router.get("/resumen", authorize("admin"), async (req, res) => {
  try {
    const result = await db(`
      SELECT
        COUNT(*) FILTER (WHERE i.estado = 'activa') AS activas,
        COALESCE(SUM(p.monto), 0) AS ingresos_esperados,
        COALESCE(SUM(p.monto) FILTER (WHERE p.estado = 'pagado'), 0) AS ingresos_recibidos,
        COUNT(p.id) FILTER (WHERE p.estado = 'pendiente') AS pagos_pendientes,
        CASE
          WHEN SUM(p.monto) > 0
          THEN ROUND(
            SUM(p.monto) FILTER (WHERE p.estado = 'pagado') * 100.0 /
            SUM(p.monto)
          )
          ELSE 0
        END AS tasa_recaudo
      FROM inscripcion i
      LEFT JOIN pago p ON p.inscripcion_id = i.id
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error GET /pagos/resumen:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /pagos ───────────────────────────────────────────
router.get("/", authorize("admin"), async (req, res) => {
  try {
    const { estado, grupoId } = req.query;
    let sql = `
      SELECT pg.*,
             e.nombre, e.apellido,
             e.id AS escalador_id,
             pr.nombre AS programa,
             g.modalidad, g.horario,
             ci.codigo AS ciclo
      FROM pago pg
      JOIN inscripcion i ON pg.inscripcion_id = i.id
      JOIN escalador e ON i.escalador_id = e.id
      JOIN grupo g ON i.grupo_id = g.id
      JOIN programa pr ON g.programa_id = pr.id
      JOIN ciclo ci ON g.ciclo_id = ci.id
      WHERE 1=1`;
    const params = [];

    if (estado) { params.push(estado); sql += ` AND pg.estado = $${params.length}`; }
    if (grupoId) { params.push(grupoId); sql += ` AND i.grupo_id = $${params.length}`; }

    sql += " ORDER BY pg.created_at DESC";
    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error GET /pagos:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /pagos — Registrar un pago adicional ────────────
router.post("/", authorize("admin"), async (req, res) => {
  try {
    const { inscripcionId, monto, metodo, referencia } = req.body;
    if (!inscripcionId || !monto || parseFloat(monto) <= 0) {
      return res.status(400).json({ error: "inscripcionId y monto son requeridos" });
    }
    const insc = await db("SELECT id FROM inscripcion WHERE id = $1", [inscripcionId]);
    if (!insc.rows.length) return res.status(404).json({ error: "Inscripción no encontrada" });

    const result = await db(
      `INSERT INTO pago (inscripcion_id, monto, estado, metodo, referencia, fecha_pago, fecha_vencimiento)
       VALUES ($1, $2, 'pagado', $3, $4, CURRENT_DATE, CURRENT_DATE)
       RETURNING *`,
      [inscripcionId, parseFloat(monto), metodo || "transferencia", referencia || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error POST /pagos:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /pagos/:id ───────────────────────────────────────
router.get("/:id", authorize("admin"), async (req, res) => {
  try {
    const result = await db(
      `SELECT pg.*,
              e.nombre || ' ' || e.apellido AS escalador_nombre,
              p.nombre AS programa, ci.codigo AS ciclo,
              g.modalidad, g.horario, m.nombre AS muro
       FROM pago pg
       JOIN inscripcion i ON pg.inscripcion_id = i.id
       JOIN escalador e ON i.escalador_id = e.id
       JOIN grupo g ON i.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       JOIN muro_aliado m ON g.muro_id = m.id
       WHERE pg.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Pago no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── PATCH /pagos/:id ─────────────────────────────────────
router.patch("/:id", authorize("admin"), async (req, res) => {
  try {
    const { estado, referencia, metodo } = req.body;
    const sets = [], params = [];

    if (estado) {
      if (!["pendiente", "pagado", "vencido"].includes(estado)) {
        return res.status(400).json({ error: "Estado inválido (pendiente | pagado | vencido)" });
      }
      params.push(estado);
      sets.push(`estado = $${params.length}`);
      if (estado === "confirmado" && !req.body.fecha_pago) {
        sets.push(`fecha_pago = NOW()`);
      }
    }
    if (referencia) { params.push(referencia); sets.push(`referencia = $${params.length}`); }
    if (metodo) { params.push(metodo); sets.push(`metodo = $${params.length}`); }

    if (!sets.length) return res.status(400).json({ error: "Nada que actualizar" });

    params.push(req.params.id);
    const result = await db(
      `UPDATE pago SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
