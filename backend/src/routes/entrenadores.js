const express = require("express");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── POST /entrenadores — Crear entrenador ────────────────
router.post("/", authorize("admin"), [
  body("email").isEmail(),
  body("nombre").notEmpty().trim(),
  body("apellido").notEmpty().trim(),
  body("password").isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, nombre, apellido, password, especialidad, maxGrupos } = req.body;
    const dup = await db("SELECT id FROM usuario WHERE email = $1", [email]);
    if (dup.rows.length) return res.status(409).json({ error: "Email ya registrado" });

    const passwordHash = await bcrypt.hash(password, 12);
    const usuarioId = randomUUID();
    await db(
      `INSERT INTO usuario (id, email, password_hash, rol) VALUES ($1,$2,$3,'entrenador')`,
      [usuarioId, email, passwordHash]
    );
    const entId = randomUUID();
    const result = await db(
      `INSERT INTO entrenador (id, usuario_id, nombre, apellido, especialidad, max_grupos)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [entId, usuarioId, nombre, apellido, especialidad || null, maxGrupos || 4]
    );
    res.status(201).json({ ...result.rows[0], email });
  } catch (err) {
    console.error("Error POST /entrenadores:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

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
       LEFT JOIN muro_aliado m ON g.muro_id = m.id
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

// ─── PUT /entrenadores/:id — Editar entrenador ────────────
router.put("/:id", authorize("admin"), async (req, res) => {
  try {
    const { nombre, apellido, especialidad, maxGrupos } = req.body;
    const sets = [], params = [];

    if (nombre)       { params.push(nombre);       sets.push(`nombre = $${params.length}`); }
    if (apellido)     { params.push(apellido);     sets.push(`apellido = $${params.length}`); }
    if (especialidad) { params.push(especialidad); sets.push(`especialidad = $${params.length}`); }
    if (maxGrupos !== undefined) { params.push(maxGrupos); sets.push(`max_grupos = $${params.length}`); }

    if (!sets.length) return res.status(400).json({ error: "Nada que actualizar" });

    params.push(req.params.id);
    const result = await db(
      `UPDATE entrenador SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: "Entrenador no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error PUT /entrenadores/:id:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── DELETE /entrenadores/:id — Eliminar entrenador ───────
router.delete("/:id", authorize("admin"), async (req, res) => {
  const entId = req.params.id;
  try {
    const check = await db("SELECT usuario_id FROM entrenador WHERE id = $1", [entId]);
    if (!check.rows.length) return res.status(404).json({ error: "Entrenador no encontrado" });
    const usuarioId = check.rows[0].usuario_id;

    // Cascade delete all groups and their children
    const grupos = await db("SELECT id FROM grupo WHERE entrenador_id = $1", [entId]);
    for (const g of grupos.rows) {
      const sesiones = await db("SELECT id FROM sesion WHERE grupo_id = $1", [g.id]);
      const sesionIds = sesiones.rows.map(r => r.id);
      if (sesionIds.length) {
        await db(`DELETE FROM asistencia WHERE sesion_id = ANY($1::uuid[])`, [sesionIds]);
        await db("DELETE FROM sesion WHERE grupo_id = $1", [g.id]);
      }
      const inscs = await db("SELECT id FROM inscripcion WHERE grupo_id = $1", [g.id]);
      const inscIds = inscs.rows.map(r => r.id);
      if (inscIds.length) {
        await db(`DELETE FROM pago WHERE inscripcion_id = ANY($1::uuid[])`, [inscIds]);
        await db("DELETE FROM inscripcion WHERE grupo_id = $1", [g.id]);
      }
      await db("DELETE FROM grupo WHERE id = $1", [g.id]);
    }

    await db("DELETE FROM entrenador WHERE id = $1", [entId]);
    await db("DELETE FROM usuario WHERE id = $1", [usuarioId]);

    res.json({ message: "Entrenador eliminado" });
  } catch (err) {
    console.error("Error DELETE /entrenadores/:id:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
