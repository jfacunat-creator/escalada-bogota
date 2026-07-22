const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const { cicloId, estado } = req.query;
    let sql = `SELECT c.*, p.nombre as programa_nombre, p.nivel, p.poblacion,
                      ci.codigo as ciclo_codigo, m.nombre as muro_nombre,
                      e.nombre as entrenador_nombre
               FROM cohorte c
               JOIN programa p ON c.programa_id = p.id
               JOIN ciclo ci ON c.ciclo_id = ci.id
               JOIN muro_aliado m ON c.muro_id = m.id
               JOIN entrenador e ON c.entrenador_id = e.id WHERE 1=1`;
    const params = [];
    if (cicloId) { params.push(cicloId); sql += ` AND c.ciclo_id = $${params.length}`; }
    if (estado) { params.push(estado); sql += ` AND c.estado = $${params.length}`; }
    if (req.user.rol === 'entrenador') { params.push(req.user.entrenador.id); sql += ` AND c.entrenador_id = $${params.length}`; }
    sql += " ORDER BY c.created_at DESC";
    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: "Error interno" }); }
});

router.post("/", authorize("admin"), [
  body("programaId").isUUID(), body("cicloId").isUUID(), body("entrenadorId").isUUID(),
  body("muroId").isUUID(), body("modalidad").isIn(["autonomo","acompanado"]),
  body("horario").trim().notEmpty(), body("cupoMaximo").isInt({min:4,max:12}),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const d = req.body;
    // Check entrenador capacity
    const grupos = await db("SELECT COUNT(*) as n FROM cohorte WHERE entrenador_id=$1 AND estado IN ('abierta','en_curso')", [d.entrenadorId]);
    const ent = await db("SELECT max_grupos FROM entrenador WHERE id=$1", [d.entrenadorId]);
    if (parseInt(grupos.rows[0].n) >= ent.rows[0].max_grupos)
      return res.status(400).json({ error: "Entrenador al límite de grupos" });
    // Check menor ratio
    const prog = await db("SELECT poblacion FROM programa WHERE id=$1", [d.programaId]);
    if (prog.rows[0].poblacion === 'menor' && d.cupoMaximo > 6)
      return res.status(400).json({ error: "Ratio para menores: máximo 6 (Ley 1098)" });

    const result = await db(
      `INSERT INTO cohorte (programa_id, ciclo_id, entrenador_id, muro_id, modalidad, horario, cupo_maximo)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [d.programaId, d.cicloId, d.entrenadorId, d.muroId, d.modalidad, d.horario, d.cupoMaximo]
    );
    // Return with joins
    const full = await db(
      `SELECT c.*, p.nombre as programa_nombre, ci.codigo as ciclo_codigo, m.nombre as muro_nombre
       FROM cohorte c JOIN programa p ON c.programa_id=p.id JOIN ciclo ci ON c.ciclo_id=ci.id JOIN muro_aliado m ON c.muro_id=m.id
       WHERE c.id=$1`, [result.rows[0].id]);
    res.status(201).json(full.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: "Ya existe cohorte con ese entrenador/horario/ciclo" });
    console.error(err); res.status(500).json({ error: "Error interno" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const coh = await db(
      `SELECT c.*, p.nombre as programa_nombre, ci.codigo as ciclo_codigo,
              m.nombre as muro_nombre, e.nombre as entrenador_nombre
       FROM cohorte c JOIN programa p ON c.programa_id=p.id JOIN ciclo ci ON c.ciclo_id=ci.id
       JOIN muro_aliado m ON c.muro_id=m.id JOIN entrenador e ON c.entrenador_id=e.id
       WHERE c.id=$1`, [req.params.id]);
    if (coh.rows.length === 0) return res.status(404).json({ error: "Cohorte no encontrada" });

    const inscritos = await db(
      `SELECT i.*, e.id as esc_id, e.nombre, e.apellido, e.estado as esc_estado
       FROM inscripcion i JOIN escalador e ON i.escalador_id=e.id
       WHERE i.cohorte_id=$1 ORDER BY e.nombre`, [req.params.id]);

    res.json({ ...coh.rows[0], inscripciones: inscritos.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: "Error interno" }); }
});

module.exports = router;
