const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db, pool } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /escaladores ─────────────────────────────────────
// Admin y entrenadores ven la lista de escaladores
router.get("/", authorize("admin", "entrenador"), async (req, res) => {
  try {
    if (req.user.rol === "entrenador" && !req.user.entrenador?.id) {
      return res.status(403).json({ error: "Perfil de entrenador no encontrado" });
    }

    const { estado, rangoEtario, buscar, grupoId, nivel } = req.query;
    const params = [];
    const conditions = [];
    let inscripcionActivaSelect = "";

    if (estado) {
      params.push(estado);
      conditions.push(`e.estado = $${params.length}`);
    }
    if (rangoEtario) {
      params.push(rangoEtario);
      conditions.push(`e.rango_etario = $${params.length}`);
    }
    if (nivel) {
      params.push(nivel);
      conditions.push(`e.nivel = $${params.length}`);
    }
    if (buscar) {
      params.push(`%${buscar}%`);
      const p = params.length;
      conditions.push(`(e.nombre ILIKE $${p} OR e.apellido ILIKE $${p})`);
    }
    if (grupoId) {
      params.push(grupoId);
      const p = params.length;
      conditions.push(`EXISTS (SELECT 1 FROM inscripcion i WHERE i.escalador_id = e.id AND i.grupo_id = $${p} AND i.estado = 'activa')`);
      inscripcionActivaSelect = `, (SELECT id FROM inscripcion i2 WHERE i2.escalador_id = e.id AND i2.grupo_id = $${p} AND i2.estado = 'activa' LIMIT 1) as inscripcion_activa_id`;
    }

    // Entrenador solo ve SUS escaladores (los de sus grupos)
    if (req.user.rol === "entrenador") {
      params.push(req.user.entrenador.id);
      conditions.push(`EXISTS (
        SELECT 1 FROM inscripcion i
        JOIN grupo g ON i.grupo_id = g.id
        WHERE i.escalador_id = e.id
          AND g.entrenador_id = $${params.length}
          AND i.estado = 'activa'
      )`);
    }

    const where = conditions.length ? " AND " + conditions.join(" AND ") : "";
    const sql = `
      SELECT e.*, u.email, u.activo as usuario_activo,
             (SELECT COUNT(*) FROM inscripcion i WHERE i.escalador_id = e.id AND i.estado = 'activa') as grupos_activos,
             (SELECT COUNT(*) FROM inscripcion i WHERE i.escalador_id = e.id AND i.estado = 'reservada') as reservas_pendientes,
             (SELECT COUNT(*) FROM pago pa JOIN inscripcion i2 ON pa.inscripcion_id = i2.id WHERE i2.escalador_id = e.id AND pa.estado = 'pendiente') as pagos_pendientes,
             (SELECT COALESCE(SUM(pa.monto), 0) FROM pago pa JOIN inscripcion i2 ON pa.inscripcion_id = i2.id WHERE i2.escalador_id = e.id AND pa.estado = 'pagado') as total_pagado,
             (SELECT p.nombre FROM inscripcion i2 JOIN grupo g2 ON i2.grupo_id = g2.id JOIN programa p ON g2.programa_id = p.id WHERE i2.escalador_id = e.id AND i2.estado = 'activa' LIMIT 1) as programa_activo,
             (SELECT ent.nombre FROM inscripcion i2 JOIN grupo g2 ON i2.grupo_id = g2.id JOIN entrenador ent ON g2.entrenador_id = ent.id WHERE i2.escalador_id = e.id AND i2.estado = 'activa' LIMIT 1) as entrenador_activo
             ${inscripcionActivaSelect}
      FROM escalador e
      JOIN usuario u ON e.usuario_id = u.id
      WHERE 1=1${where}
      ORDER BY e.nombre, e.apellido`;

    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error GET /escaladores:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /escaladores/:id ─────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Escalador solo puede ver su propio perfil
    if (req.user.rol === "escalador" && req.user.escalador?.id !== id) {
      return res.status(403).json({ error: "Solo puedes ver tu propio perfil" });
    }

    const result = await db(
      `SELECT e.*, u.email FROM escalador e JOIN usuario u ON e.usuario_id = u.id WHERE e.id = $1`,
      [id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Escalador no encontrado" });
    }

    // Inscripciones con datos completos del grupo
    const inscripciones = await db(
      `SELECT i.*, p.nombre AS programa, ci.codigo AS ciclo,
              m.nombre AS muro, g.horario, g.modalidad,
              ent.nombre AS entrenador
       FROM inscripcion i
       JOIN grupo g ON i.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       LEFT JOIN muro_aliado m ON g.muro_id = m.id
       JOIN entrenador ent ON g.entrenador_id = ent.id
       WHERE i.escalador_id = $1
       ORDER BY i.created_at DESC`,
      [id]
    );

    res.json({ ...result.rows[0], inscripciones: inscripciones.rows });
  } catch (err) {
    console.error("Error GET /escaladores/:id:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── PUT /escaladores/:id ─────────────────────────────────
router.put(
  "/:id",
  [
    body("nombre").optional().trim(),
    body("apellido").optional().trim(),
    body("telefono").optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { id } = req.params;
      if (req.user.rol === "escalador" && req.user.escalador?.id !== id) {
        return res.status(403).json({ error: "Solo puedes editar tu propio perfil" });
      }

      const { nombre, apellido, pesoKg, telefono, contactoEmergencia } = req.body;
      const sets = [], params = [];

      if (nombre) { params.push(nombre); sets.push(`nombre = $${params.length}`); }
      if (apellido) { params.push(apellido); sets.push(`apellido = $${params.length}`); }
      if (pesoKg !== undefined) { params.push(pesoKg); sets.push(`peso_kg = $${params.length}`); }
      if (telefono !== undefined) { params.push(telefono); sets.push(`telefono = $${params.length}`); }
      if (contactoEmergencia) { params.push(contactoEmergencia); sets.push(`contacto_emergencia = $${params.length}`); }

      if (!sets.length) return res.status(400).json({ error: "Nada que actualizar" });

      params.push(id);
      const result = await db(
        `UPDATE escalador SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
        params
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error PUT /escaladores/:id:", err);
      res.status(500).json({ error: "Error interno" });
    }
  }
);

// ─── DELETE /escaladores/:id ─────────────────────────────
router.delete("/:id", authorize("admin"), async (req, res) => {
  const escaladorId = req.params.id;
  try {
    const check = await db("SELECT usuario_id FROM escalador WHERE id = $1", [escaladorId]);
    if (!check.rows.length) return res.status(404).json({ error: "Escalador no encontrado" });
    const usuarioId = check.rows[0].usuario_id;

    // Cascade: asistencia → pago → inscripcion → escalador → usuario
    await db("DELETE FROM asistencia WHERE escalador_id = $1", [escaladorId]);
    const inscs = await db("SELECT id, grupo_id, estado FROM inscripcion WHERE escalador_id = $1", [escaladorId]);
    for (const insc of inscs.rows) {
      await db("DELETE FROM pago WHERE inscripcion_id = $1", [insc.id]);
      if (insc.estado === "activa") {
        await db("UPDATE grupo SET inscritos_actual = GREATEST(inscritos_actual - 1, 0) WHERE id = $1", [insc.grupo_id]);
      }
    }
    await db("DELETE FROM inscripcion WHERE escalador_id = $1", [escaladorId]);
    await db("DELETE FROM escalador WHERE id = $1", [escaladorId]);
    await db("DELETE FROM usuario WHERE id = $1", [usuarioId]);

    res.json({ message: "Escalador eliminado" });
  } catch (err) {
    console.error("Error DELETE /escaladores/:id:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── PATCH /escaladores/:id/nivel — Admin asigna nivel al escalador ──────────
router.patch(
  "/:id/nivel",
  authorize("admin"),
  [body("nivel").isIn(["iniciacion", "intermedio", "avanzado"])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { id } = req.params;
      const { nivel } = req.body;

      const check = await db("SELECT id, estado FROM escalador WHERE id=$1", [id]);
      if (!check.rows.length) return res.status(404).json({ error: "Escalador no encontrado" });

      const result = await db(
        "UPDATE escalador SET nivel=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
        [nivel, id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error PATCH /escaladores/:id/nivel:", err);
      res.status(500).json({ error: "Error interno" });
    }
  }
);

// ─── PATCH /escaladores/:id/estado ─────────────────────────
router.patch(
  "/:id/estado",
  authorize("admin"),
  [body("estado").isIn(["activo", "inactivo", "congelado"])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      await db("UPDATE escalador SET estado = $1 WHERE id = $2", [req.body.estado, req.params.id]);
      res.json({ message: `Estado cambiado a ${req.body.estado}` });
    } catch (err) {
      console.error("Error PATCH estado:", err);
      res.status(500).json({ error: "Error interno" });
    }
  }
);

module.exports = router;
