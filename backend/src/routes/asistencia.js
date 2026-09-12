const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /asistencia/sesion/:sesionId ─────────────────────
router.get("/sesion/:sesionId", authorize("entrenador", "admin"), async (req, res) => {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT a.*, e.nombre, e.apellido
       FROM asistencia a
       JOIN escalador e ON a.escalador_id = e.id
       WHERE a.sesion_id = $1
       ORDER BY e.nombre`,
      req.params.sesionId
    );
    res.json(result);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /asistencia ─────────────────────────────────────
router.post(
  "/",
  authorize("entrenador", "admin"),
  [
    body("sesionId").isUUID(),
    body("registros").isArray({ min: 1 }),
    body("registros.*.escaladorId").isUUID(),
    body("registros.*.asistio").isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { sesionId, registros } = req.body;

      for (const reg of registros) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO asistencia (sesion_id, escalador_id, asistio, observaciones)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (sesion_id, escalador_id)
           DO UPDATE SET asistio = $3, observaciones = $4`,
          sesionId, reg.escaladorId, reg.asistio, reg.observaciones || null
        );
      }

      res.json({ message: "Asistencia registrada", total: registros.length });
    } catch (err) {
      console.error("Error:", err);
      res.status(500).json({ error: "Error interno" });
    }
  }
);

// ─── GET /asistencia/escalador/:escaladorId ───────────────
router.get("/escalador/:escaladorId", async (req, res) => {
  try {
    const { escaladorId } = req.params;

    if (req.user.rol === "escalador" && req.user.escalador?.id !== escaladorId) {
      return res.status(403).json({ error: "Solo puedes ver tu propia asistencia" });
    }

    const result = await prisma.$queryRawUnsafe(
      `SELECT a.*, s.fecha, s.numero_sesion, s.tipo,
              g.modalidad, p.nombre AS programa
       FROM asistencia a
       JOIN sesion s ON a.sesion_id = s.id
       JOIN grupo g ON s.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       WHERE a.escalador_id = $1
       ORDER BY s.fecha DESC`,
      escaladorId
    );

    const total = result.length;
    const asistencias = result.filter((r) => r.asistio).length;
    const porcentaje = total > 0 ? Math.round((asistencias / total) * 100) : 0;

    res.json({
      registros: result,
      resumen: {
        total,
        asistencias,
        faltas: total - asistencias,
        porcentaje,
        cumpleGarantia: porcentaje >= 80,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /asistencia/grupo/:grupoId/resumen ───────────────
router.get("/grupo/:grupoId/resumen", authorize("entrenador", "admin"), async (req, res) => {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT e.id, e.nombre, e.apellido,
              COUNT(a.id) AS total_sesiones,
              COUNT(a.id) FILTER (WHERE a.asistio = true) AS asistencias,
              ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.asistio = true) / NULLIF(COUNT(a.id), 0), 1) AS porcentaje
       FROM inscripcion i
       JOIN escalador e ON i.escalador_id = e.id
       LEFT JOIN asistencia a ON a.escalador_id = e.id
         AND a.sesion_id IN (SELECT id FROM sesion WHERE grupo_id = $1)
       WHERE i.grupo_id = $1 AND i.estado = 'activa'
       GROUP BY e.id
       ORDER BY e.nombre`,
      req.params.grupoId
    );

    res.json(result);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
