const express = require("express");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");
const { puedeVerEscalador } = require("../utils/acceso");

// Remisiones de un escalador a un aliado de salud (fisioterapia / nutrición).
const router = express.Router();
router.use(authenticate);

// ─── GET /remisiones?escaladorId= ─────────────────────────
router.get("/", async (req, res) => {
  try {
    const { escaladorId } = req.query;
    const params = [];
    let sql = `
      SELECT r.*, a.nombre AS aliado_nombre, a.tipo AS aliado_tipo, a.contacto AS aliado_contacto,
             e.nombre, e.apellido
      FROM remision r
      JOIN aliado_salud a ON a.id = r.aliado_id
      JOIN escalador e ON e.id = r.escalador_id
      WHERE 1=1`;
    if (req.user.rol === "escalador") {
      params.push(req.user.escalador.id);
      sql += ` AND r.escalador_id = $${params.length}`;
    } else if (escaladorId) {
      if (!(await puedeVerEscalador(req.user, escaladorId))) return res.status(403).json({ error: "Sin acceso" });
      params.push(escaladorId);
      sql += ` AND r.escalador_id = $${params.length}`;
    } else if (req.user.rol === "entrenador") {
      params.push(req.user.entrenador.id);
      sql += ` AND EXISTS (SELECT 1 FROM inscripcion i JOIN grupo g ON g.id = i.grupo_id
                           WHERE i.escalador_id = r.escalador_id AND g.entrenador_id = $${params.length})`;
    }
    sql += " ORDER BY r.fecha DESC, r.created_at DESC";
    res.json(await prisma.$queryRawUnsafe(sql, ...params));
  } catch (err) {
    console.error("Error GET /remisiones:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /remisiones ─────────────────────────────────────
router.post("/", authorize("admin", "entrenador"), async (req, res) => {
  try {
    const { escaladorId, aliadoId, motivo, evaluacionId } = req.body;
    if (!escaladorId || !aliadoId || !String(motivo || "").trim()) {
      return res.status(400).json({ error: "Escalador, aliado y motivo son obligatorios" });
    }
    if (!(await puedeVerEscalador(req.user, escaladorId))) {
      return res.status(403).json({ error: "Este escalador no está en tus grupos" });
    }
    const aliado = await prisma.$queryRawUnsafe("SELECT 1 FROM aliado_salud WHERE id = $1 AND activo", aliadoId);
    if (!aliado.length) return res.status(400).json({ error: "Aliado no encontrado o inactivo" });
    const r = await prisma.$queryRawUnsafe(
      `INSERT INTO remision (escalador_id, aliado_id, evaluacion_id, motivo) VALUES ($1, $2, $3, $4) RETURNING *`,
      escaladorId, aliadoId, evaluacionId || null, String(motivo).trim()
    );
    res.status(201).json(r[0]);
  } catch (err) {
    console.error("Error POST /remisiones:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── PATCH /remisiones/:id ────────────────────────────────
router.patch("/:id", authorize("admin", "entrenador"), async (req, res) => {
  try {
    const { estado, notasAliado } = req.body;
    if (estado && !["pendiente", "atendida"].includes(estado)) return res.status(400).json({ error: "Estado inválido" });
    const actual = await prisma.$queryRawUnsafe("SELECT escalador_id FROM remision WHERE id = $1", req.params.id);
    if (!actual.length) return res.status(404).json({ error: "Remisión no encontrada" });
    if (!(await puedeVerEscalador(req.user, actual[0].escalador_id))) return res.status(403).json({ error: "Sin acceso" });
    const r = await prisma.$queryRawUnsafe(
      `UPDATE remision SET estado = COALESCE($1::"EstadoRemision", estado),
              notas_aliado = COALESCE($2, notas_aliado), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      estado || null, notasAliado ?? null, req.params.id
    );
    res.json(r[0]);
  } catch (err) {
    console.error("Error PATCH /remisiones/:id:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
