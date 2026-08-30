const express = require("express");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /dashboard ───────────────────────────────────────
router.get("/", authorize("admin"), async (req, res) => {
  try {
    // Conteos generales
    const counts = await db(`
      SELECT
        (SELECT COUNT(*) FROM escalador WHERE estado = 'activo') AS total_escaladores,
        (SELECT COUNT(*) FROM escalador e
         WHERE EXISTS (SELECT 1 FROM inscripcion i WHERE i.escalador_id = e.id AND i.estado = 'activa')) AS escaladores_inscritos,
        (SELECT COUNT(*) FROM entrenador) AS total_entrenadores,
        (SELECT COUNT(*) FROM grupo WHERE estado IN ('abierta', 'en_curso')) AS grupos_activos,
        (SELECT COUNT(*) FROM programa WHERE activo = true) AS total_programas,
        (SELECT COUNT(*) FROM inscripcion WHERE estado = 'activa') AS inscripciones_activas,
        (SELECT COUNT(*) FROM pago WHERE estado = 'confirmado') AS pagos_confirmados,
        (SELECT COALESCE(SUM(monto), 0) FROM pago WHERE estado = 'confirmado') AS ingresos_totales,
        (SELECT COUNT(*) FROM pago WHERE estado = 'pendiente') AS pagos_pendientes,
        (SELECT COUNT(*) FROM sesion) AS total_sesiones
    `);

    // Grupos activos con detalles
    const gruposActivos = await db(`
      SELECT g.id, g.modalidad, g.horario, g.cupo_maximo, g.estado,
             p.nombre AS programa, ci.codigo AS ciclo, m.nombre AS muro,
             ent.nombre AS entrenador,
             (SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = g.id AND i.estado = 'activa') AS inscritos
      FROM grupo g
      JOIN programa p ON g.programa_id = p.id
      JOIN ciclo ci ON g.ciclo_id = ci.id
      JOIN muro_aliado m ON g.muro_id = m.id
      JOIN entrenador ent ON g.entrenador_id = ent.id
      WHERE g.estado IN ('abierta', 'en_curso')
      ORDER BY p.nombre
    `);

    // Últimos escaladores registrados
    const ultimosEscaladores = await db(`
      SELECT e.nombre, e.apellido, e.estado, u.email, u.created_at,
             (SELECT COUNT(*) FROM inscripcion i WHERE i.escalador_id = e.id AND i.estado = 'activa') AS grupos_activos
      FROM escalador e
      JOIN usuario u ON e.usuario_id = u.id
      ORDER BY u.created_at DESC
      LIMIT 5
    `);

    res.json({
      stats: counts.rows[0],
      gruposActivos: gruposActivos.rows,
      ultimosEscaladores: ultimosEscaladores.rows,
    });
  } catch (err) {
    console.error("Error GET /dashboard:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
