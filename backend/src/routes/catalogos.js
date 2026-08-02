const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/programas", async (req, res) => {
  try {
    const { poblacion, nivel } = req.query;
    let sql = "SELECT * FROM programa WHERE activo = true";
    const params = [];
    if (poblacion) { params.push(poblacion); sql += ` AND poblacion = $${params.length}`; }
    if (nivel) { params.push(nivel); sql += ` AND nivel = $${params.length}`; }
    sql += " ORDER BY poblacion, nivel";
    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

router.get("/ciclos", async (req, res) => {
  try {
    const { anio } = req.query;
    let sql = "SELECT * FROM ciclo";
    const params = [];
    if (anio) { params.push(parseInt(anio)); sql += " WHERE anio = $1"; }
    sql += " ORDER BY anio DESC, trimestre DESC";
    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

router.get("/ciclos/actual", async (req, res) => {
  try {
    const result = await db(
      "SELECT * FROM ciclo WHERE fecha_inicio <= CURRENT_DATE AND fecha_fin >= CURRENT_DATE LIMIT 1"
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "No hay ciclo activo" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /catalogos/ciclos — Crear nuevo ciclo (admin) ───────────────────
router.post("/ciclos", authenticate, authorize("admin"), [
  body("codigo").trim().notEmpty().isLength({ max: 10 }),
  body("anio").isInt({ min: 2025, max: 2030 }),
  body("trimestre").isInt({ min: 1, max: 4 }),
  body("fechaInicio").isISO8601(),
  body("fechaFin").isISO8601(),
  body("semanaEmpalme").isISO8601(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { codigo, anio, trimestre, fechaInicio, fechaFin, semanaEmpalme } = req.body;

    if (new Date(fechaFin) <= new Date(fechaInicio)) {
      return res.status(400).json({ error: "La fecha de fin debe ser posterior a la de inicio" });
    }

    const result = await db(
      `INSERT INTO ciclo (codigo, anio, trimestre, fecha_inicio, fecha_fin, semana_empalme)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [codigo, anio, trimestre, fechaInicio, fechaFin, semanaEmpalme]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: "Ya existe un ciclo con ese código o año/trimestre" });
    console.error(err); res.status(500).json({ error: "Error interno" });
  }
});

router.get("/muros", async (req, res) => {
  try {
    const result = await db("SELECT * FROM muro_aliado WHERE convenio_activo = true ORDER BY nombre");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
