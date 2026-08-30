const express = require("express");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /sesiones?grupoId=xxx ────────────────────────────
router.get("/", authorize("entrenador", "admin"), async (req, res) => {
  try {
    const { grupoId } = req.query;
    if (!grupoId) {
      return res.status(400).json({ error: "grupoId es requerido" });
    }

    const result = await db(
      `SELECT s.*, g.modalidad, p.nombre AS programa,
              (SELECT COUNT(*) FROM asistencia a WHERE a.sesion_id = s.id) AS total_asistencias
       FROM sesion s
       JOIN grupo g ON s.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       WHERE s.grupo_id = $1
       ORDER BY s.fecha ASC, s.hora_inicio ASC`,
      [grupoId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error GET /sesiones:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /sesiones/:id ────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const result = await db(
      `SELECT s.*, g.modalidad, g.horario, p.nombre AS programa,
              ci.codigo AS ciclo, m.nombre AS muro, ent.nombre AS entrenador
       FROM sesion s
       JOIN grupo g ON s.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       JOIN muro_aliado m ON g.muro_id = m.id
       JOIN entrenador ent ON g.entrenador_id = ent.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Sesión no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error GET /sesiones/:id:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /sesiones/entrenador/:entrenadorId ────────────────
router.get("/entrenador/:entrenadorId", authorize("entrenador", "admin"), async (req, res) => {
  try {
    const result = await db(
      `SELECT s.*, g.modalidad, g.horario, p.nombre AS programa,
              m.nombre AS muro, ci.codigo AS ciclo,
              g.id AS grupo_id
       FROM sesion s
       JOIN grupo g ON s.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       JOIN muro_aliado m ON g.muro_id = m.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       WHERE g.entrenador_id = $1
         AND g.estado IN ('abierta', 'en_curso')
       ORDER BY s.fecha ASC`,
      [req.params.entrenadorId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
