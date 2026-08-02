const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── Precios mensuales de referencia por nivel × modalidad ────────────────────
// Fuente única de verdad. El frontend los recibe en /disponibles.
// Cuando los precios se manejen desde BD (tabla tarifas), solo se toca este lookup.
const PRECIO_MENSUAL = {
  iniciacion: { autonomo: 120_000, acompanado: 350_000 },
  intermedio: { autonomo: 150_000, acompanado: 450_000 },
  avanzado:   { autonomo: 180_000, acompanado: 600_000 },
};

// ─── GET /cohortes ────────────────────────────────────────
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

// ─── POST /cohortes ───────────────────────────────────────
router.post("/", authorize("admin"), [
  body("programaId").isUUID(), body("cicloId").isUUID(), body("entrenadorId").isUUID(),
  body("muroId").isUUID(), body("modalidad").isIn(["autonomo","acompanado"]),
  body("horario").trim().notEmpty(), body("cupoMaximo").isInt({min:4,max:12}),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const d = req.body;
    const grupos = await db("SELECT COUNT(*) as n FROM cohorte WHERE entrenador_id=$1 AND estado IN ('abierta','en_curso')", [d.entrenadorId]);
    const ent = await db("SELECT max_grupos FROM entrenador WHERE id=$1", [d.entrenadorId]);
    if (parseInt(grupos.rows[0].n) >= ent.rows[0].max_grupos)
      return res.status(400).json({ error: "Entrenador al límite de grupos" });

    const prog = await db("SELECT poblacion FROM programa WHERE id=$1", [d.programaId]);
    if (prog.rows[0].poblacion === 'menor' && d.cupoMaximo > 6)
      return res.status(400).json({ error: "Ratio para menores: máximo 6 (Ley 1098)" });

    const result = await db(
      `INSERT INTO cohorte (programa_id, ciclo_id, entrenador_id, muro_id, modalidad, horario, cupo_maximo)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [d.programaId, d.cicloId, d.entrenadorId, d.muroId, d.modalidad, d.horario, d.cupoMaximo]
    );
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

// ─── GET /cohortes/disponibles ────────────────────────────
// Catálogo de cohortes abiertas para adultos.
// Devuelve precio_mensual calculado en backend (fuente única).
// Marca ya_inscrito si el escalador autenticado tiene inscripción activa.
router.get("/disponibles", async (req, res) => {
  try {
    const result = await db(`
      SELECT
        c.id, c.modalidad, c.horario, c.cupo_maximo, c.inscritos_actual, c.estado,
        p.id   AS programa_id,   p.nombre AS programa_nombre,
        p.nivel, p.descripcion  AS programa_descripcion,
        p.incluye_fisio,         p.incluye_nutricion,
        ci.id  AS ciclo_id,      ci.codigo AS ciclo_codigo,
        ci.fecha_inicio,         ci.fecha_fin, ci.semana_empalme,
        m.id   AS muro_id,       m.nombre  AS muro_nombre,
        m.direccion AS muro_direccion,
        e.id   AS entrenador_id, e.nombre  AS entrenador_nombre,
        e.licencia_ley181
      FROM cohorte c
      JOIN programa    p  ON c.programa_id  = p.id
      JOIN ciclo       ci ON c.ciclo_id     = ci.id
      JOIN muro_aliado m  ON c.muro_id      = m.id
      JOIN entrenador  e  ON c.entrenador_id = e.id
      WHERE c.estado = 'abierta'
        AND p.poblacion = 'adulto'
        AND p.activo    = true
      ORDER BY p.nivel, c.modalidad, c.horario
    `);

    let inscritaIds = [];
    if (req.user.rol === "escalador" && req.user.escalador) {
      const ins = await db(
        `SELECT cohorte_id FROM inscripcion
         WHERE escalador_id = $1 AND estado = 'activa'`,
        [req.user.escalador.id]
      );
      inscritaIds = ins.rows.map((r) => r.cohorte_id);
    }

    const cohortes = result.rows.map((c) => ({
      ...c,
      ya_inscrito: inscritaIds.includes(c.id),
      cupos_disponibles: c.cupo_maximo - c.inscritos_actual,
      precio_mensual: PRECIO_MENSUAL[c.nivel]?.[c.modalidad] ?? null,
      precio_ciclo: (PRECIO_MENSUAL[c.nivel]?.[c.modalidad] ?? 0) * 3,
    }));

    res.json(cohortes);
  } catch (err) {
    console.error("Error GET /cohortes/disponibles:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /cohortes/:id ────────────────────────────────────
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

// ─── PATCH /cohortes/:id/estado — Cambiar estado de cohorte ───
router.patch("/:id/estado", authorize("admin"), [
  body("estado").isIn(["abierta", "cerrada", "en_curso", "finalizada"]),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { estado } = req.body;
    const coh = await db("SELECT id, estado FROM cohorte WHERE id=$1", [req.params.id]);
    if (coh.rows.length === 0) return res.status(404).json({ error: "Cohorte no encontrada" });

    await db("UPDATE cohorte SET estado=$1 WHERE id=$2", [estado, req.params.id]);
    res.json({ message: `Estado cambiado a ${estado}` });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
