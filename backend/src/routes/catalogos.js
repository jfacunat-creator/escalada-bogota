const express = require("express");
const { query: db } = require("../config/database");

const router = express.Router();

// ─── GET /catalogos/programas ─────────────────────────────
router.get("/programas", async (req, res) => {
  try {
    const { poblacion, nivel } = req.query;
    let sql = "SELECT * FROM programa WHERE activo = true";
    const params = [];
    if (poblacion) { params.push(poblacion); sql += ` AND poblacion = $${params.length}`; }
    if (nivel) { params.push(nivel); sql += ` AND nivel = $${params.length}`; }
    sql += " ORDER BY poblacion, nivel, nombre";
    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /catalogos/ciclos ────────────────────────────────
router.get("/ciclos", async (req, res) => {
  try {
    const { anio } = req.query;
    let sql = "SELECT * FROM ciclo";
    const params = [];
    if (anio) { params.push(parseInt(anio)); sql += ` WHERE anio = $${params.length}`; }
    sql += " ORDER BY anio DESC, trimestre DESC";
    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /catalogos/muros ─────────────────────────────────
router.get("/muros", async (req, res) => {
  try {
    const result = await db(
      "SELECT * FROM muro_aliado WHERE convenio_activo = true ORDER BY nombre"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /catalogos/grupos ────────────────────────────────
// Grupos disponibles con datos completos (para catálogo de inscripción)
router.get("/grupos", async (req, res) => {
  try {
    const { estado, cicloId, programaId } = req.query;
    let sql = `
      SELECT g.*, p.nombre AS programa_nombre, p.nivel, p.poblacion,
             ci.codigo AS ciclo_codigo, ci.anio, ci.trimestre,
             m.nombre AS muro_nombre, ent.nombre AS entrenador_nombre,
             (SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = g.id AND i.estado = 'activa') AS inscritos
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
    sql += " ORDER BY ci.anio DESC, ci.trimestre DESC, p.nombre";
    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
