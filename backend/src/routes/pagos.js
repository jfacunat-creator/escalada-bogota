const express = require("express");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /pagos ───────────────────────────────────────────
router.get("/", authorize("admin"), async (req, res) => {
  try {
    const { estado, grupoId } = req.query;
    let sql = `
      SELECT pg.*, 
             e.nombre || ' ' || e.apellido AS escalador_nombre,
             e.id AS escalador_id,
             p.nombre AS programa,
             g.modalidad, g.horario,
             ci.codigo AS ciclo
      FROM pago pg
      JOIN inscripcion i ON pg.inscripcion_id = i.id
      JOIN escalador e ON i.escalador_id = e.id
      JOIN grupo g ON i.grupo_id = g.id
      JOIN programa p ON g.programa_id = p.id
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
      if (!["pendiente", "confirmado", "rechazado", "vencido"].includes(estado)) {
        return res.status(400).json({ error: "Estado inválido" });
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
