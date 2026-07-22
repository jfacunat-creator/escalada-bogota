const express = require("express");
const { query: db } = require("../config/database");

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
