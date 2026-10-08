const express = require("express");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");
const { generarSesiones, borrarSesiones } = require("../utils/sesiones");

const router = express.Router();
router.use(authenticate);

// ─── GET /sesiones ────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { grupoId } = req.query;
    if (!grupoId) {
      return res.status(400).json({ error: "grupoId es requerido" });
    }

    if (req.user.rol === "escalador") {
      const check = await prisma.$queryRawUnsafe(
        "SELECT id FROM inscripcion WHERE grupo_id=$1 AND escalador_id=$2 AND estado='activa'",
        grupoId, req.user.escalador.id
      );
      if (!check.length) return res.status(403).json({ error: "Sin inscripción activa en este grupo" });
    }

    if (req.user.rol === "entrenador") {
      const check = await prisma.$queryRawUnsafe(
        "SELECT id FROM grupo WHERE id=$1 AND entrenador_id=$2",
        grupoId, req.user.entrenador?.id
      );
      if (!check.length) return res.status(403).json({ error: "Grupo no encontrado o sin acceso" });
    }

    const result = await prisma.$queryRawUnsafe(
      `SELECT s.*, g.modalidad, p.nombre AS programa,
              (SELECT COUNT(*) FROM asistencia a WHERE a.sesion_id = s.id) AS total_asistencias
       FROM sesion s
       JOIN grupo g ON s.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       WHERE s.grupo_id = $1
       ORDER BY s.fecha ASC, s.hora_inicio ASC`,
      grupoId
    );

    res.json(result);
  } catch (err) {
    console.error("Error GET /sesiones:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /sesiones/generar ───────────────────────────────
router.post("/generar", authorize("admin", "entrenador"), async (req, res) => {
  const { grupoId } = req.body;
  if (!grupoId) return res.status(400).json({ error: "grupoId requerido" });
  try {
    if (req.user.rol === "entrenador") {
      const propio = await prisma.$queryRawUnsafe(
        "SELECT 1 FROM grupo WHERE id = $1 AND entrenador_id = $2", grupoId, req.user.entrenador?.id
      );
      if (!propio.length) return res.status(403).json({ error: "Este grupo no es tuyo" });
    }
    const total = await prisma.$transaction((tx) => generarSesiones(tx, grupoId));
    res.status(201).json({ message: `${total} sesiones generadas`, total });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error("Error POST /sesiones/generar:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /sesiones/:id ────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT s.*, g.modalidad, g.horario, p.nombre AS programa,
              ci.codigo AS ciclo, m.nombre AS muro, ent.nombre AS entrenador
       FROM sesion s
       JOIN grupo g ON s.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       LEFT JOIN muro_aliado m ON g.muro_id = m.id
       JOIN entrenador ent ON g.entrenador_id = ent.id
       WHERE s.id = $1`,
      req.params.id
    );

    if (!result.length) {
      return res.status(404).json({ error: "Sesión no encontrada" });
    }

    res.json(result[0]);
  } catch (err) {
    console.error("Error GET /sesiones/:id:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /sesiones/entrenador/:entrenadorId ───────────────
router.get("/entrenador/:entrenadorId", authorize("entrenador", "admin"), async (req, res) => {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT s.*, g.modalidad, g.horario, p.nombre AS programa,
              m.nombre AS muro, ci.codigo AS ciclo,
              g.id AS grupo_id
       FROM sesion s
       JOIN grupo g ON s.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       LEFT JOIN muro_aliado m ON g.muro_id = m.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       WHERE g.entrenador_id = $1
         AND g.estado IN ('abierta', 'en_curso')
       ORDER BY s.fecha ASC`,
      req.params.entrenadorId
    );

    res.json(result);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── DELETE /sesiones?grupoId=xxx ────────────────────────
router.delete("/", authorize("admin"), async (req, res) => {
  const { grupoId } = req.query;
  if (!grupoId) return res.status(400).json({ error: "grupoId requerido" });
  try {
    const n = await prisma.$transaction((tx) => borrarSesiones(tx, grupoId));
    res.json({ message: `${n} sesiones eliminadas` });
  } catch (err) {
    console.error("Error DELETE /sesiones:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
