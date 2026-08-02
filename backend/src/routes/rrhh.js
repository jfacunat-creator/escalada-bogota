/**
 * rrhh.js
 * Gestión de contratos, parafiscales y ausencias de entrenadores.
 *
 * Normativa colombiana aplicada:
 *   Salud:   8.5% empleador (Art. 204 Ley 100/1993)
 *   Pensión: 12% empleador (Art. 20 Ley 797/2003)
 *   ARL:     6.96% clase V — riesgo máximo (Decreto 1607/2002, actividad deportiva)
 *   Caja:    4% (Art. 7 Ley 21/1982)
 *   Factor prestacional total: ≈ 1.54× salario base
 */

const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);
router.use(authorize("admin"));

// Tasas de ley (empleador)
const TASAS = {
  salud:   0.085,   // 8.5%
  pension: 0.12,    // 12%
  arl:     0.0696,  // 6.96% clase V
  caja:    0.04,    // 4%
};

function calcularParafiscales(salarioBase) {
  const base = parseFloat(salarioBase);
  return {
    salud:   Math.round(base * TASAS.salud),
    pension: Math.round(base * TASAS.pension),
    arl:     Math.round(base * TASAS.arl),
    caja:    Math.round(base * TASAS.caja),
    total:   Math.round(base * (TASAS.salud + TASAS.pension + TASAS.arl + TASAS.caja)),
  };
}

// ═══════════════════════════════════════════════════════════
// CONTRATOS
// ═══════════════════════════════════════════════════════════

// ─── GET /rrhh/contratos ─────────────────────────────────
router.get("/contratos", async (req, res) => {
  try {
    const { entrenadorId, estado } = req.query;
    let sql = `
      SELECT c.*, e.nombre AS entrenador_nombre, u.email AS entrenador_email
      FROM contrato_entrenador c
      JOIN entrenador e ON c.entrenador_id = e.id
      JOIN usuario u ON e.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (entrenadorId) { params.push(entrenadorId); sql += ` AND c.entrenador_id = $${params.length}`; }
    if (estado) { params.push(estado); sql += ` AND c.estado = $${params.length}`; }
    sql += " ORDER BY c.created_at DESC";

    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /rrhh/contratos ────────────────────────────────
router.post("/contratos", [
  body("entrenadorId").isUUID(),
  body("tipo").isIn(["prestacion_servicios", "termino_fijo", "indefinido", "obra_labor"]),
  body("fechaInicio").isISO8601(),
  body("fechaFin").optional({ nullable: true }).isISO8601(),
  body("salarioBase").isFloat({ min: 1 }),
  body("notas").optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { entrenadorId, tipo, fechaInicio, fechaFin, salarioBase, notas } = req.body;

    // Verificar que el entrenador no tenga contrato activo
    const activo = await db(
      "SELECT id FROM contrato_entrenador WHERE entrenador_id = $1 AND estado = 'activo'",
      [entrenadorId]
    );
    if (activo.rows.length > 0) {
      return res.status(409).json({ error: "El entrenador ya tiene un contrato activo. Termínalo primero." });
    }

    const result = await db(
      `INSERT INTO contrato_entrenador (entrenador_id, tipo, fecha_inicio, fecha_fin, salario_base, notas)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [entrenadorId, tipo, fechaInicio, fechaFin || null, salarioBase, notas || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Error interno" });
  }
});

// ─── PATCH /rrhh/contratos/:id/estado ────────────────────
router.patch("/contratos/:id/estado", [
  body("estado").isIn(["activo", "terminado", "suspendido"]),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { estado } = req.body;
    const c = await db("SELECT id FROM contrato_entrenador WHERE id = $1", [req.params.id]);
    if (c.rows.length === 0) return res.status(404).json({ error: "Contrato no encontrado" });

    await db("UPDATE contrato_entrenador SET estado = $1, updated_at = NOW() WHERE id = $2",
      [estado, req.params.id]);
    res.json({ message: `Contrato marcado como ${estado}` });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Error interno" });
  }
});

// ═══════════════════════════════════════════════════════════
// PARAFISCALES
// ═══════════════════════════════════════════════════════════

// ─── GET /rrhh/parafiscales ──────────────────────────────
router.get("/parafiscales", async (req, res) => {
  try {
    const { contratoId, anio, estadoPago } = req.query;
    let sql = `
      SELECT p.*, e.nombre AS entrenador_nombre, c.tipo AS contrato_tipo
      FROM parafiscal p
      JOIN contrato_entrenador c ON p.contrato_id = c.id
      JOIN entrenador e ON c.entrenador_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (contratoId) { params.push(contratoId); sql += ` AND p.contrato_id = $${params.length}`; }
    if (anio) { params.push(parseInt(anio)); sql += ` AND p.anio = $${params.length}`; }
    if (estadoPago) { params.push(estadoPago); sql += ` AND p.estado_pago = $${params.length}`; }
    sql += " ORDER BY p.anio DESC, p.mes DESC";

    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /rrhh/parafiscales/generar — Generar parafiscales de un mes ────
// Calcula automáticamente sobre el salario base de cada contrato activo.
router.post("/parafiscales/generar", [
  body("mes").isInt({ min: 1, max: 12 }),
  body("anio").isInt({ min: 2025, max: 2030 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { mes, anio } = req.body;

    // Obtener contratos activos
    const contratos = await db(
      `SELECT c.id, c.salario_base, e.nombre AS entrenador_nombre
       FROM contrato_entrenador c
       JOIN entrenador e ON c.entrenador_id = e.id
       WHERE c.estado = 'activo'`
    );

    if (contratos.rows.length === 0) {
      return res.status(400).json({ error: "No hay contratos activos para generar parafiscales" });
    }

    const generados = [];
    const omitidos = [];

    for (const contrato of contratos.rows) {
      // Verificar si ya existe para este periodo
      const existe = await db(
        "SELECT id FROM parafiscal WHERE contrato_id = $1 AND mes = $2 AND anio = $3",
        [contrato.id, mes, anio]
      );

      if (existe.rows.length > 0) {
        omitidos.push(contrato.entrenador_nombre);
        continue;
      }

      const p = calcularParafiscales(contrato.salario_base);

      await db(
        `INSERT INTO parafiscal (contrato_id, mes, anio, salario_base, salud, pension, arl, caja)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [contrato.id, mes, anio, contrato.salario_base, p.salud, p.pension, p.arl, p.caja]
      );

      generados.push({
        entrenador: contrato.entrenador_nombre,
        salario_base: parseFloat(contrato.salario_base),
        ...p,
      });
    }

    res.status(201).json({
      message: `Parafiscales generados para ${generados.length} contrato(s)`,
      generados,
      omitidos,
      periodo: `${anio}-${String(mes).padStart(2, "0")}`,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Error interno" });
  }
});

// ─── PATCH /rrhh/parafiscales/:id/pagar — Marcar como pagado ─────────────
router.patch("/parafiscales/:id/pagar", async (req, res) => {
  try {
    const p = await db("SELECT id, estado_pago FROM parafiscal WHERE id = $1", [req.params.id]);
    if (p.rows.length === 0) return res.status(404).json({ error: "Registro no encontrado" });

    await db(
      "UPDATE parafiscal SET estado_pago = 'pagado', fecha_pago = CURRENT_DATE WHERE id = $1",
      [req.params.id]
    );
    res.json({ message: "Parafiscal marcado como pagado" });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /rrhh/resumen — Dashboard RRHH ──────────────────
router.get("/resumen", async (req, res) => {
  try {
    const contratos = await db(`
      SELECT
        COUNT(*) FILTER (WHERE estado = 'activo') AS contratos_activos,
        COUNT(*) AS contratos_total,
        COALESCE(SUM(salario_base) FILTER (WHERE estado = 'activo'), 0) AS nomina_mensual
      FROM contrato_entrenador
    `);

    const parafiscales = await db(`
      SELECT
        COALESCE(SUM(salud + pension + arl + caja) FILTER (WHERE estado_pago = 'pendiente'), 0) AS parafiscales_pendientes,
        COALESCE(SUM(salud + pension + arl + caja) FILTER (WHERE estado_pago = 'pagado'), 0) AS parafiscales_pagados,
        COUNT(*) FILTER (WHERE estado_pago = 'pendiente') AS periodos_pendientes
      FROM parafiscal
    `);

    const c = contratos.rows[0];
    const p = parafiscales.rows[0];
    const nominaMensual = parseFloat(c.nomina_mensual);
    const costoTotal = nominaMensual * 1.54; // Factor prestacional completo

    res.json({
      ...c,
      ...p,
      nomina_mensual: nominaMensual,
      costo_total_mensual: Math.round(costoTotal),
      factor_prestacional: 1.54,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Error interno" });
  }
});

// ═══════════════════════════════════════════════════════════
// AUSENCIAS
// ═══════════════════════════════════════════════════════════

// ─── GET /rrhh/ausencias ─────────────────────────────────
router.get("/ausencias", async (req, res) => {
  try {
    const { entrenadorId } = req.query;
    let sql = `
      SELECT a.*, e.nombre AS entrenador_nombre,
             r.nombre AS reemplazante_nombre
      FROM ausencia_entrenador a
      JOIN entrenador e ON a.entrenador_id = e.id
      LEFT JOIN entrenador r ON a.reemplazado_por = r.id
      WHERE 1=1
    `;
    const params = [];
    if (entrenadorId) { params.push(entrenadorId); sql += ` AND a.entrenador_id = $${params.length}`; }
    sql += " ORDER BY a.fecha DESC";

    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /rrhh/ausencias ────────────────────────────────
router.post("/ausencias", [
  body("entrenadorId").isUUID(),
  body("fecha").isISO8601(),
  body("tipo").isIn(["incapacidad", "vacaciones", "personal", "licencia"]),
  body("reemplazadoPor").optional({ nullable: true }).isUUID(),
  body("observaciones").optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { entrenadorId, fecha, tipo, reemplazadoPor, observaciones } = req.body;
    const result = await db(
      `INSERT INTO ausencia_entrenador (entrenador_id, fecha, tipo, reemplazado_por, observaciones)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [entrenadorId, fecha, tipo, reemplazadoPor || null, observaciones || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /rrhh/simulador — Simula costo total de un salario ──────────────
router.get("/simulador", async (req, res) => {
  const salario = parseFloat(req.query.salario) || 0;
  if (salario <= 0) return res.status(400).json({ error: "Salario inválido" });

  const p = calcularParafiscales(salario);
  const prestaciones = {
    prima:              Math.round(salario / 12),
    cesantias:          Math.round(salario / 12),
    intereses_cesantias: Math.round((salario / 12) * 0.12),
    vacaciones:         Math.round(salario / 24),
  };
  const totalPrestaciones = Object.values(prestaciones).reduce((s, v) => s + v, 0);
  const costoTotal = salario + p.total + totalPrestaciones;

  res.json({
    salario_base: salario,
    parafiscales: p,
    prestaciones,
    total_prestaciones: totalPrestaciones,
    costo_total_mensual: costoTotal,
    factor: parseFloat((costoTotal / salario).toFixed(2)),
  });
});

module.exports = router;
