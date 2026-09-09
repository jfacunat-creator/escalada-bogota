const express = require("express");
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
      JOIN muro_aliado m ON g.muro_id = m.id
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
       JOIN muro_aliado m ON g.muro_id = m.id
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
       JOIN muro_aliado m ON g.muro_id = m.id
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
