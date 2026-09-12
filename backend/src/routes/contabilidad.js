/**
 * contabilidad.js — Módulo P&G
 */
const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);
router.use(authorize("admin"));

async function tablasExisten() {
  try {
    const r = await prisma.$queryRawUnsafe("SELECT to_regclass('public.pyg_categoria') AS existe");
    return r[0].existe !== null;
  } catch { return false; }
}

// ─── GET /contabilidad/estado ────────────────────────────
router.get("/estado", async (req, res) => {
  const ready = await tablasExisten();
  res.json({
    schema_ready: ready,
    mensaje: ready
      ? "Módulo de contabilidad activo."
      : "Las tablas pyg_categoria y pyg_entrada no existen aún. Ejecuta la migración para activar el módulo P&G.",
    migracion_sql: ready ? null : `
-- Ejecutar en PostgreSQL para activar el módulo:
CREATE TABLE IF NOT EXISTS pyg_categoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso','egreso')),
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pyg_entrada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES pyg_categoria(id),
  concepto VARCHAR(200) NOT NULL,
  monto DECIMAL(14,2) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  periodo_mes INT NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_anio INT NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso','egreso')),
  comprobante_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías iniciales:
INSERT INTO pyg_categoria (nombre, tipo, descripcion) VALUES
  ('Mensualidades recibidas', 'ingreso', 'Pagos de ciclo de escaladores'),
  ('Nómina entrenadores',     'egreso',  'Salarios + prestaciones entrenadores'),
  ('Arriendo muro',           'egreso',  'Canon mensual muros aliados'),
  ('Equipamiento',            'egreso',  'Cuerdas, arneses, presas'),
  ('Servicios aliados',       'egreso',  'Fisioterapia, nutrición'),
  ('Administrativos',         'egreso',  'Contabilidad, seguros, software'),
  ('Otros ingresos',          'ingreso', 'Eventos, workshops, merchandising');
`,
  });
});

// ─── GET /contabilidad/categorias ────────────────────────
router.get("/categorias", async (req, res) => {
  if (!await tablasExisten()) return res.json([]);
  try {
    const r = await prisma.$queryRawUnsafe("SELECT * FROM pyg_categoria WHERE activo = TRUE ORDER BY tipo, nombre");
    res.json(r);
  } catch (err) { console.error(err); res.status(500).json({ error: "Error interno" }); }
});

// ─── GET /contabilidad/entradas ──────────────────────────
router.get("/entradas", async (req, res) => {
  if (!await tablasExisten()) return res.json({ entradas: [], resumen: null, schema_ready: false });
  try {
    const { tipo, categoriaId, mes, anio } = req.query;
    let sql = `
      SELECT e.*, c.nombre AS categoria_nombre, c.tipo AS categoria_tipo
      FROM pyg_entrada e JOIN pyg_categoria c ON e.categoria_id = c.id WHERE 1=1`;
    const params = [];
    if (tipo)        { params.push(tipo);        sql += ` AND e.tipo = $${params.length}`; }
    if (categoriaId) { params.push(categoriaId); sql += ` AND e.categoria_id = $${params.length}`; }
    if (mes)         { params.push(parseInt(mes));sql += ` AND e.periodo_mes = $${params.length}`; }
    if (anio)        { params.push(parseInt(anio));sql += ` AND e.periodo_anio = $${params.length}`; }
    sql += " ORDER BY e.fecha DESC";
    const entradas = await prisma.$queryRawUnsafe(sql, ...params);

    const resumenSql = `
      SELECT
        COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0) AS total_ingresos,
        COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0)  AS total_egresos
      FROM pyg_entrada
      ${anio ? `WHERE periodo_anio = ${parseInt(anio)}` : ''}
    `;
    const resumen = await prisma.$queryRawUnsafe(resumenSql);
    const r = resumen[0];

    res.json({
      entradas,
      resumen: {
        total_ingresos: Number(r.total_ingresos),
        total_egresos: Number(r.total_egresos),
        utilidad: Number(r.total_ingresos) - Number(r.total_egresos),
      },
      schema_ready: true,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "Error interno" }); }
});

// ─── POST /contabilidad/entradas ─────────────────────────
router.post("/entradas", [
  body("categoriaId").isUUID(),
  body("concepto").trim().notEmpty(),
  body("monto").isFloat({ min: 0.01 }),
  body("fecha").isISO8601(),
  body("periodoMes").isInt({ min: 1, max: 12 }),
  body("periodoAnio").isInt({ min: 2025, max: 2035 }),
  body("tipo").isIn(["ingreso", "egreso"]),
], async (req, res) => {
  if (!await tablasExisten()) return res.status(503).json({ error: "Tablas P&G no migradas aún." });
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const d = req.body;
    const r = await prisma.$queryRawUnsafe(
      `INSERT INTO pyg_entrada (categoria_id, concepto, monto, fecha, periodo_mes, periodo_anio, tipo, comprobante_url, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      d.categoriaId, d.concepto, d.monto, d.fecha, d.periodoMes, d.periodoAnio, d.tipo, d.comprobanteUrl || null, d.notas || null
    );
    res.status(201).json(r[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: "Error interno" }); }
});

// ─── GET /contabilidad/pyg — Estado de resultados ────────
router.get("/pyg", async (req, res) => {
  if (!await tablasExisten()) return res.json({ schema_ready: false, periodos: [] });
  try {
    const { anio } = req.query;
    const a = parseInt(anio) || new Date().getFullYear();
    const r = await prisma.$queryRawUnsafe(`
      SELECT periodo_mes, tipo,
             c.nombre AS categoria,
             SUM(e.monto) AS total
      FROM pyg_entrada e JOIN pyg_categoria c ON e.categoria_id = c.id
      WHERE e.periodo_anio = $1
      GROUP BY periodo_mes, tipo, c.nombre
      ORDER BY periodo_mes, tipo, c.nombre
    `, a);

    const meses = {};
    for (const row of r) {
      const m = row.periodo_mes;
      if (!meses[m]) meses[m] = { mes: m, ingresos: [], egresos: [], total_ingresos: 0, total_egresos: 0 };
      const entry = { categoria: row.categoria, total: Number(row.total) };
      if (row.tipo === 'ingreso') { meses[m].ingresos.push(entry); meses[m].total_ingresos += entry.total; }
      else { meses[m].egresos.push(entry); meses[m].total_egresos += entry.total; }
    }
    for (const m of Object.values(meses)) m.utilidad = m.total_ingresos - m.total_egresos;

    res.json({ schema_ready: true, anio: a, periodos: Object.values(meses) });
  } catch (err) { console.error(err); res.status(500).json({ error: "Error interno" }); }
});

module.exports = router;
