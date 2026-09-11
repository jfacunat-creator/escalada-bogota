const express = require("express");
const { body, validationResult } = require("express-validator");
const { randomUUID } = require("crypto");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /grupos ──────────────────────────────────────────
router.get("/", authorize("admin", "entrenador"), async (req, res) => {
  try {
    const { estado, cicloId, programaId, entrenadorId } = req.query;
    let sql = `
      SELECT g.*, p.nombre AS programa_nombre, p.nivel, p.poblacion,
             ci.codigo AS ciclo_codigo, ci.anio, ci.trimestre,
             ci.fecha_inicio, ci.fecha_fin,
             m.nombre AS muro_nombre, ent.nombre AS entrenador_nombre,
             (SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = g.id AND i.estado = 'activa') AS inscritos_actual,
             (SELECT COUNT(*) FROM sesion s WHERE s.grupo_id = g.id) AS total_sesiones,
             (SELECT MAX(s.numero_sesion) FROM sesion s WHERE s.grupo_id = g.id AND s.fecha <= CURRENT_DATE) AS sesion_actual
      FROM grupo g
      JOIN programa p ON g.programa_id = p.id
      JOIN ciclo ci ON g.ciclo_id = ci.id
      LEFT JOIN muro_aliado m ON g.muro_id = m.id
      JOIN entrenador ent ON g.entrenador_id = ent.id
      WHERE 1=1`;
    const params = [];

    if (estado) { params.push(estado); sql += ` AND g.estado = $${params.length}`; }
    if (cicloId) { params.push(cicloId); sql += ` AND g.ciclo_id = $${params.length}`; }
    if (programaId) { params.push(programaId); sql += ` AND g.programa_id = $${params.length}`; }
    if (entrenadorId) { params.push(entrenadorId); sql += ` AND g.entrenador_id = $${params.length}`; }

    // Entrenador solo ve SUS grupos
    if (req.user.rol === "entrenador") {
      params.push(req.user.entrenador.id);
      sql += ` AND g.entrenador_id = $${params.length}`;
    }

    sql += " ORDER BY ci.anio DESC, ci.trimestre DESC, p.nombre";
    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error GET /grupos:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /grupos/disponibles ──────────────────────────────
router.get("/disponibles", async (req, res) => {
  try {
    const result = await db(
      `SELECT g.*, p.nombre AS programa_nombre, p.nivel, p.poblacion,
              ci.codigo AS ciclo_codigo, m.nombre AS muro_nombre,
              ent.nombre AS entrenador_nombre,
              (SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = g.id AND i.estado = 'activa') AS inscritos
       FROM grupo g
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       LEFT JOIN muro_aliado m ON g.muro_id = m.id
       JOIN entrenador ent ON g.entrenador_id = ent.id
       WHERE g.estado IN ('abierta', 'en_curso')
       ORDER BY p.nombre`
    );
    // Solo los que tienen cupo
    const disponibles = result.rows.filter(g => parseInt(g.inscritos) < g.cupo_maximo);
    res.json(disponibles);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /grupos/:id ──────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const result = await db(
      `SELECT g.*, p.nombre AS programa_nombre, p.nivel, p.poblacion,
              ci.codigo AS ciclo_codigo, ci.anio, ci.trimestre,
              m.nombre AS muro_nombre, ent.nombre AS entrenador_nombre,
              (SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = g.id AND i.estado = 'activa') AS inscritos
       FROM grupo g
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       LEFT JOIN muro_aliado m ON g.muro_id = m.id
       JOIN entrenador ent ON g.entrenador_id = ent.id
       WHERE g.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Grupo no encontrado" });

    // Escaladores inscritos en este grupo
    const escaladores = await db(
      `SELECT e.nombre, e.apellido, e.estado, e.rango_etario, u.email, i.estado AS inscripcion_estado
       FROM inscripcion i
       JOIN escalador e ON i.escalador_id = e.id
       JOIN usuario u ON e.usuario_id = u.id
       WHERE i.grupo_id = $1 AND i.estado = 'activa'
       ORDER BY e.nombre`,
      [req.params.id]
    );

    res.json({ ...result.rows[0], escaladores: escaladores.rows });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /grupos — Crear grupo ───────────────────────────
router.post("/", authorize("admin"), [
  body("programaId").isUUID(),
  body("cicloId").isUUID(),
  body("entrenadorId").isUUID(),
  body("modalidad").isIn(["autonomo", "acompanado"]),
  body("cupoMaximo").isInt({ min: 1 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { programaId, cicloId, muroId, entrenadorId, modalidad, horario, cupoMaximo, estado } = req.body;
    const esAcompanado = modalidad === "acompanado";
    if (esAcompanado && (!muroId || !horario)) {
      return res.status(400).json({ error: "Los grupos acompañados requieren sede y horario." });
    }
    const id = randomUUID();
    const result = await db(
      `INSERT INTO grupo (id, programa_id, ciclo_id, muro_id, entrenador_id, modalidad, horario, cupo_maximo, estado, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) RETURNING *`,
      [id, programaId, cicloId, muroId || null, entrenadorId, modalidad, horario || null, cupoMaximo, estado || "abierta"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error POST /grupos:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── PUT /grupos/:id — Editar grupo ───────────────────────
router.put("/:id", authorize("admin"), async (req, res) => {
  try {
    const { modalidad, horario, cupoMaximo, entrenadorId, muroId } = req.body;
    const sets = [], params = [];

    if (modalidad) { params.push(modalidad); sets.push(`modalidad = $${params.length}`); }
    if (horario)   { params.push(horario);   sets.push(`horario = $${params.length}`); }
    if (cupoMaximo !== undefined) { params.push(cupoMaximo); sets.push(`cupo_maximo = $${params.length}`); }
    if (entrenadorId) { params.push(entrenadorId); sets.push(`entrenador_id = $${params.length}`); }
    if (muroId)    { params.push(muroId);    sets.push(`muro_id = $${params.length}`); }

    if (!sets.length) return res.status(400).json({ error: "Nada que actualizar" });

    params.push(req.params.id);
    const result = await db(
      `UPDATE grupo SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: "Grupo no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error PUT /grupos/:id:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── DELETE /grupos/:id — Eliminar grupo (cascade) ────────
router.delete("/:id", authorize("admin"), async (req, res) => {
  const grupoId = req.params.id;
  try {
    const check = await db("SELECT id FROM grupo WHERE id = $1", [grupoId]);
    if (!check.rows.length) return res.status(404).json({ error: "Grupo no encontrado" });

    // Cascade: asistencia → sesion → pago → inscripcion → grupo
    const sesiones = await db("SELECT id FROM sesion WHERE grupo_id = $1", [grupoId]);
    const sesionIds = sesiones.rows.map(r => r.id);
    if (sesionIds.length) {
      await db(`DELETE FROM asistencia WHERE sesion_id = ANY($1::uuid[])`, [sesionIds]);
      await db("DELETE FROM sesion WHERE grupo_id = $1", [grupoId]);
    }
    const inscs = await db("SELECT id FROM inscripcion WHERE grupo_id = $1", [grupoId]);
    const inscIds = inscs.rows.map(r => r.id);
    if (inscIds.length) {
      await db(`DELETE FROM pago WHERE inscripcion_id = ANY($1::uuid[])`, [inscIds]);
      await db("DELETE FROM inscripcion WHERE grupo_id = $1", [grupoId]);
    }
    await db("DELETE FROM grupo WHERE id = $1", [grupoId]);

    res.json({ message: "Grupo eliminado" });
  } catch (err) {
    console.error("Error DELETE /grupos/:id:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── PATCH /grupos/:id/estado ─────────────────────────────
router.patch("/:id/estado", authorize("admin"), async (req, res) => {
  try {
    const { estado } = req.body;
    if (!["abierta", "en_curso", "cerrada", "finalizada"].includes(estado)) {
      return res.status(400).json({ error: "Estado inválido (abierta | en_curso | cerrada | finalizada)" });
    }
    await db("UPDATE grupo SET estado = $1 WHERE id = $2", [estado, req.params.id]);
    res.json({ message: `Estado cambiado a ${estado}` });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
