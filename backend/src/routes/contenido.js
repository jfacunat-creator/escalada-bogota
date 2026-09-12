const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /contenido ───────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { cicloId, tipo, programaId } = req.query;

    if (req.user.rol === "escalador") {
      let sql = `
        SELECT cc.*, p.nombre as programa_nombre,
               pc.visto, pc.progreso_pct
        FROM contenido_ciclo cc
        JOIN grupo g ON g.ciclo_id = cc.ciclo_id
          AND (cc.programa_id IS NULL OR cc.programa_id = g.programa_id)
        JOIN inscripcion i ON i.grupo_id = g.id
        LEFT JOIN programa p ON cc.programa_id = p.id
        LEFT JOIN progreso_contenido pc ON pc.contenido_id = cc.id AND pc.escalador_id = $1
        WHERE i.escalador_id = $1
          AND i.estado = 'activa'
          AND cc.visible = true
      `;
      const params = [req.user.escalador.id];

      if (cicloId) { params.push(cicloId); sql += ` AND cc.ciclo_id = $${params.length}`; }
      if (tipo) { params.push(tipo); sql += ` AND cc.tipo = $${params.length}`; }
      sql += " ORDER BY cc.orden, cc.created_at";

      const result = await prisma.$queryRawUnsafe(sql, ...params);
      return res.json(result);
    }

    let sql = `
      SELECT cc.*, p.nombre as programa_nombre, ci.codigo as ciclo_codigo
      FROM contenido_ciclo cc
      LEFT JOIN programa p ON cc.programa_id = p.id
      JOIN ciclo ci ON cc.ciclo_id = ci.id
      WHERE 1=1
    `;
    const params = [];
    if (cicloId) { params.push(cicloId); sql += ` AND cc.ciclo_id = $${params.length}`; }
    if (tipo) { params.push(tipo); sql += ` AND cc.tipo = $${params.length}`; }
    if (programaId) { params.push(programaId); sql += ` AND cc.programa_id = $${params.length}`; }
    sql += " ORDER BY cc.orden, cc.created_at";

    const result = await prisma.$queryRawUnsafe(sql, ...params);
    res.json(result);
  } catch (err) {
    console.error("Error listando contenido:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /contenido ──────────────────────────────────────
router.post(
  "/",
  authorize("admin", "entrenador"),
  [
    body("cicloId").isUUID(),
    body("tipo").isIn(["plan_entrenamiento", "video_tecnica", "video_sesion", "documento_apoyo", "nutricion", "fisioterapia"]),
    body("titulo").trim().notEmpty(),
    body("archivoUrl").trim().isURL(),
    body("mimeType").trim().notEmpty(),
    body("programaId").optional().isUUID(),
    body("descripcion").optional().isString(),
    body("orden").optional().isInt({ min: 0 }),
    body("duracionSeg").optional().isInt({ min: 0 }),
    body("tamanoBytes").optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const d = req.body;
      const result = await prisma.$queryRawUnsafe(
        `INSERT INTO contenido_ciclo (ciclo_id, programa_id, tipo, titulo, descripcion, archivo_url, mime_type, tamano_bytes, duracion_seg, orden)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        d.cicloId, d.programaId || null, d.tipo, d.titulo, d.descripcion || null,
        d.archivoUrl, d.mimeType, d.tamanoBytes || null, d.duracionSeg || null, d.orden || 0
      );

      res.status(201).json(result[0]);
    } catch (err) {
      console.error("Error creando contenido:", err);
      res.status(500).json({ error: "Error interno" });
    }
  }
);

// ─── PUT /contenido/:id/progreso ──────────────────────────
router.put("/:id/progreso", authorize("escalador"), async (req, res) => {
  try {
    const { id } = req.params;
    const { progresoPct } = req.body;
    const escaladorId = req.user.escalador.id;
    const visto = (progresoPct || 0) >= 90;

    const access = await prisma.$queryRawUnsafe(
      `SELECT cc.id FROM contenido_ciclo cc
       JOIN grupo g ON g.ciclo_id = cc.ciclo_id
       JOIN inscripcion i ON i.grupo_id = g.id
       WHERE cc.id = $1 AND i.escalador_id = $2 AND i.estado = 'activa'`,
      id, escaladorId
    );
    if (access.length === 0) return res.status(403).json({ error: "Sin acceso a este contenido" });

    const existing = await prisma.$queryRawUnsafe(
      "SELECT id FROM progreso_contenido WHERE escalador_id = $1 AND contenido_id = $2",
      escaladorId, id
    );

    if (existing.length > 0) {
      await prisma.$executeRawUnsafe(
        "UPDATE progreso_contenido SET progreso_pct = $1, visto = $2, ultimo_acceso = NOW() WHERE id = $3",
        progresoPct, visto, existing[0].id
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO progreso_contenido (escalador_id, contenido_id, progreso_pct, visto, ultimo_acceso)
         VALUES ($1, $2, $3, $4, NOW())`,
        escaladorId, id, progresoPct, visto
      );
    }

    res.json({ message: "Progreso actualizado", progresoPct, visto });
  } catch (err) {
    console.error("Error actualizando progreso:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── DELETE /contenido/:id ────────────────────────────────
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    await prisma.$executeRawUnsafe("UPDATE contenido_ciclo SET visible = false WHERE id = $1", req.params.id);
    res.json({ message: "Contenido ocultado" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /contenido/stats/:cicloId ────────────────────────
router.get("/stats/:cicloId", authorize("entrenador", "admin"), async (req, res) => {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT cc.id, cc.titulo, cc.tipo,
              COUNT(pc.id) as veces_accedido,
              COUNT(pc.id) FILTER (WHERE pc.visto = true) as completados,
              ROUND(AVG(pc.progreso_pct), 0) as progreso_promedio
       FROM contenido_ciclo cc
       LEFT JOIN progreso_contenido pc ON pc.contenido_id = cc.id
       WHERE cc.ciclo_id = $1 AND cc.visible = true
       GROUP BY cc.id
       ORDER BY cc.orden`,
      req.params.cicloId
    );
    res.json(result);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
