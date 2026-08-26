/**
 * backend/src/routes/plan.js
 *
 * INTEGRACIÓN en backend/src/index.js:
 *   app.use("/api/plan", require("./routes/plan"));
 */

const express = require("express");
const router = express.Router();
const { query: db } = require("../config/database");
const authenticate = require("../middleware/auth");

/**
 * GET /api/plan/my
 * Devuelve el plan del escalador autenticado según su inscripción activa.
 * Controla acceso: solo si escalador.estado === 'activo'.
 */
router.get("/my", authenticate, async (req, res) => {
  if (req.user.rol !== "escalador") {
    return res.status(403).json({ error: "Solo escaladores tienen planes de entrenamiento" });
  }

  try {
    // Buscar escalador + inscripción activa + programa + ciclo
    const { rows } = await db(
      `SELECT
         e.nombre,
         e.estado,
         p.nivel,
         c2.trimestre
       FROM escalador e
       LEFT JOIN inscripcion  i  ON i.escalador_id = e.id  AND i.estado = 'activa'
       LEFT JOIN cohorte      c  ON c.id = i.cohorte_id
       LEFT JOIN ciclo        c2 ON c2.id = c.ciclo_id
       LEFT JOIN programa     p  ON p.id = c.programa_id
       WHERE e.usuario_id = $1
       ORDER BY i.created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Perfil de escalador no encontrado" });
    }

    const esc = rows[0];

    // Gate de acceso
    if (esc.estado !== "activo") {
      return res.status(403).json({
        error: "Acceso inactivo",
        estado: esc.estado,
        nombre: esc.nombre,
      });
    }

    if (!esc.trimestre || !esc.nivel) {
      return res.status(404).json({
        error: "Sin inscripción activa. Habla con tu entrenador.",
        nombre: esc.nombre,
      });
    }

    const trimestre = `T${esc.trimestre}`;
    const nivel     = esc.nivel; // iniciacion | intermedio | avanzado

    const planRes = await db(
      `SELECT trimestre, nivel, semanas
       FROM plan_contenido
       WHERE trimestre = $1 AND nivel = $2`,
      [trimestre, nivel]
    );

    if (!planRes.rows.length) {
      return res.status(404).json({
        error: `Plan ${trimestre} ${nivel} no encontrado en la base de datos`,
      });
    }

    return res.json({
      trimestre,
      nivel,
      nombre: esc.nombre,
      semanas: planRes.rows[0].semanas,
    });

  } catch (err) {
    console.error("[GET /api/plan/my]", err.message);
    return res.status(500).json({ error: "Error al cargar el plan" });
  }
});

module.exports = router;
