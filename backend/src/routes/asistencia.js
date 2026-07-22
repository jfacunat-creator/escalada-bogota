const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── POST /asistencia — Registro batch (entrenador registra toda la sesión)
router.post(
  "/",
  authorize("entrenador", "admin"),
  [
    body("sesionId").isUUID(),
    body("registros").isArray({ min: 1 }),
    body("registros.*.escaladorId").isUUID(),
    body("registros.*.asistio").isBoolean(),
    body("registros.*.observaciones").optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { sesionId, registros } = req.body;

      // Verificar que la sesión existe y pertenece al entrenador
      const sesion = await db(
        `SELECT s.id, c.entrenador_id
         FROM sesion s JOIN cohorte c ON s.cohorte_id = c.id
         WHERE s.id = $1`,
        [sesionId]
      );
      if (sesion.rows.length === 0) return res.status(404).json({ error: "Sesión no encontrada" });

      if (req.user.rol === "entrenador" && sesion.rows[0].entrenador_id !== req.user.entrenador.id) {
        return res.status(403).json({ error: "Esta sesión no es de tu cohorte" });
      }

      let insertados = 0;
      let actualizados = 0;

      for (const reg of registros) {
        // Upsert: si ya existe, actualiza; si no, inserta
        const existing = await db(
          "SELECT id FROM asistencia WHERE sesion_id = $1 AND escalador_id = $2",
          [sesionId, reg.escaladorId]
        );

        if (existing.rows.length > 0) {
          await db(
            "UPDATE asistencia SET asistio = $1, observaciones = $2 WHERE id = $3",
            [reg.asistio, reg.observaciones || null, existing.rows[0].id]
          );
          actualizados++;
        } else {
          await db(
            `INSERT INTO asistencia (sesion_id, escalador_id, asistio, observaciones)
             VALUES ($1, $2, $3, $4)`,
            [sesionId, reg.escaladorId, reg.asistio, reg.observaciones || null]
          );
          insertados++;
        }
      }

      res.json({
        message: "Asistencia registrada",
        insertados,
        actualizados,
        total: registros.length,
      });
    } catch (err) {
      console.error("Error registrando asistencia:", err);
      res.status(500).json({ error: "Error interno" });
    }
  }
);

// ─── GET /asistencia/sesion/:sesionId — Lista para una sesión
router.get("/sesion/:sesionId", async (req, res) => {
  try {
    const result = await db(
      `SELECT a.*, e.nombre, e.apellido, e.estado as estado_escalador
       FROM asistencia a
       JOIN escalador e ON a.escalador_id = e.id
       WHERE a.sesion_id = $1
       ORDER BY e.nombre`,
      [req.params.sesionId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /asistencia/escalador/:escaladorId — Historial del escalador
router.get("/escalador/:escaladorId", async (req, res) => {
  try {
    const { escaladorId } = req.params;
    const { cohorteId } = req.query;

    // Escalador solo ve su propia asistencia
    if (req.user.rol === "escalador" && req.user.escalador.id !== escaladorId) {
      return res.status(403).json({ error: "Solo puedes ver tu propia asistencia" });
    }

    let sql = `
      SELECT a.asistio, a.observaciones, a.created_at,
             s.fecha, s.hora_inicio, s.hora_fin, s.numero_sesion, s.tipo,
             s.cohorte_id
      FROM asistencia a
      JOIN sesion s ON a.sesion_id = s.id
      WHERE a.escalador_id = $1
    `;
    const params = [escaladorId];

    if (cohorteId) {
      params.push(cohorteId);
      sql += ` AND s.cohorte_id = $${params.length}`;
    }

    sql += " ORDER BY s.fecha DESC";

    const result = await db(sql, params);

    // Calcular resumen
    const total = result.rows.length;
    const asistencias = result.rows.filter(r => r.asistio).length;
    const porcentaje = total > 0 ? Math.round((asistencias / total) * 100) : 0;

    res.json({
      registros: result.rows,
      resumen: {
        total,
        asistencias,
        faltas: total - asistencias,
        porcentaje,
        cumpleGarantia: porcentaje >= 80, // ≥80% → aplica garantía de mejora
      },
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /asistencia/cohorte/:cohorteId/resumen — Resumen por cohorte
router.get("/cohorte/:cohorteId/resumen", authorize("entrenador", "admin"), async (req, res) => {
  try {
    const result = await db(
      `SELECT e.id, e.nombre, e.apellido,
              COUNT(a.id) as total_sesiones,
              COUNT(a.id) FILTER (WHERE a.asistio = true) as asistencias,
              ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.asistio = true) / NULLIF(COUNT(a.id), 0), 1) as porcentaje
       FROM inscripcion i
       JOIN escalador e ON i.escalador_id = e.id
       LEFT JOIN asistencia a ON a.escalador_id = e.id
         AND a.sesion_id IN (SELECT id FROM sesion WHERE cohorte_id = $1)
       WHERE i.cohorte_id = $1 AND i.estado = 'activa'
       GROUP BY e.id
       ORDER BY e.nombre`,
      [req.params.cohorteId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
