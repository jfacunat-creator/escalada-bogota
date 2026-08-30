const express = require("express");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /entrenadores ────────────────────────────────────
router.get("/", authorize("admin"), async (req, res) => {
  try {
    const result = await db(
      `SELECT e.*, u.email, u.activo,
              (SELECT COUNT(*)
               FROM grupo g
               WHERE g.entrenador_id = e.id
                 AND g.estado IN ('abierta', 'en_curso')) AS grupos_activos,
              (SELECT COUNT(DISTINCT i.escalador_id)
               FROM inscripcion i
               JOIN grupo g ON i.grupo_id = g.id
               WHERE g.entrenador_id = e.id
                 AND i.estado = 'activa') AS total_escaladores
       FROM entrenador e
       JOIN usuario u ON e.usuario_id = u.id
       ORDER BY e.nombre`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error GET /entrenadores:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /entrenadores/:id ────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.rol === "entrenador" && req.user.entrenador?.id !== id) {
      return res.status(403).json({ error: "Solo puedes ver tu propio perfil" });
    }

    const ent = await db(
      `SELECT e.*, u.email
       FROM entrenador e
       JOIN usuario u ON e.usuario_id = u.id
       WHERE e.id = $1`,
      [id]
    );
    if (!ent.rows.length) {
      return res.status(404).json({ error: "Entrenador no encontrado" });
    }

    // Grupos activos con datos completos
    const grupos = await db(
      `SELECT g.*, p.nombre AS programa_nombre, p.nivel,
              ci.codigo AS ciclo_codigo, m.nombre AS muro_nombre,
              (SELECT COUNT(*)
               FROM inscripcion i
               WHERE i.grupo_id = g.id
                 AND i.estado = 'activa') AS inscritos
       FROM grupo g
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       JOIN muro_aliado m ON g.muro_id = m.id
       WHERE g.entrenador_id = $1
         AND g.estado IN ('abierta', 'en_curso')
       ORDER BY ci.fecha_inicio DESC`,
      [id]
    );

    const stats = await db(
      `SELECT
         COUNT(DISTINCT g.id) FILTER (WHERE g.estado IN ('abierta','en_curso')) AS grupos_activos,
         COUNT(DISTINCT i.escalador_id) AS escaladores_activos,
         COUNT(DISTINCT g.id) AS total_grupos_historico
       FROM grupo g
       LEFT JOIN inscripcion i ON i.grupo_id = g.id AND i.estado = 'activa'
       WHERE g.entrenador_id = $1`,
      [id]
    );

    res.json({
      ...ent.rows[0],
      grupos: grupos.rows,
      stats: stats.rows[0],
    });
  } catch (err) {
    console.error("Error GET /entrenadores/:id:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
