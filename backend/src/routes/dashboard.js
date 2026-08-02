/**
 * dashboard.js
 * Endpoint consolidado de indicadores financieros y operativos.
 * Unifica datos de pagos, inscripciones, cohortes, y RRHH en un solo llamado.
 */

const express = require("express");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);
router.use(authorize("admin"));

// ─── GET /dashboard — KPIs consolidados ──────────────────
router.get("/", async (req, res) => {
  try {
    // ── Ingresos ──────────────────────────────────────────
    const ingresos = await db(`
      SELECT
        COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado = 'pagado'), 0) AS ingresos_recibidos,
        COALESCE(SUM(i.precio_ciclo) FILTER (WHERE i.estado = 'activa'), 0) AS ingresos_esperados,
        COUNT(pa.id) FILTER (WHERE pa.estado = 'pendiente') AS pagos_pendientes,
        COUNT(pa.id) FILTER (WHERE pa.estado = 'vencido') AS pagos_vencidos,
        COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado = 'pendiente'), 0) AS monto_pendiente,
        COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado = 'vencido'), 0) AS monto_vencido
      FROM inscripcion i
      LEFT JOIN pago pa ON pa.inscripcion_id = i.id
    `);

    // ── Ingresos por mes (últimos 6 meses) ───────────────
    const ingresosMes = await db(`
      SELECT
        TO_CHAR(pa.fecha_pago, 'YYYY-MM') AS periodo,
        SUM(pa.monto) AS total
      FROM pago pa
      WHERE pa.estado = 'pagado'
        AND pa.fecha_pago >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY periodo
      ORDER BY periodo
    `);

    // ── Egresos (RRHH) ───────────────────────────────────
    const egresos = await db(`
      SELECT
        COALESCE(SUM(c.salario_base) FILTER (WHERE c.estado = 'activo'), 0) AS nomina_mensual,
        COUNT(*) FILTER (WHERE c.estado = 'activo') AS contratos_activos
      FROM contrato_entrenador c
    `);

    // Parafiscales
    const parafiscales = await db(`
      SELECT
        COALESCE(SUM(salud + pension + arl + caja) FILTER (WHERE estado_pago = 'pendiente'), 0) AS pf_pendientes,
        COALESCE(SUM(salud + pension + arl + caja) FILTER (WHERE estado_pago = 'pagado'), 0) AS pf_pagados
      FROM parafiscal
    `);

    // ── Operación ────────────────────────────────────────
    const operacion = await db(`
      SELECT
        COUNT(*) AS total_escaladores,
        COUNT(*) FILTER (WHERE e.estado = 'activo') AS escaladores_activos
      FROM escalador e
    `);

    const inscripciones = await db(`
      SELECT
        COUNT(*) FILTER (WHERE i.estado = 'activa') AS inscripciones_activas,
        COUNT(*) AS inscripciones_total
      FROM inscripcion i
    `);

    const cohortes = await db(`
      SELECT
        COUNT(*) FILTER (WHERE estado = 'abierta') AS cohortes_abiertas,
        COUNT(*) FILTER (WHERE estado = 'en_curso') AS cohortes_en_curso,
        COUNT(*) AS cohortes_total,
        COALESCE(SUM(inscritos_actual) FILTER (WHERE estado IN ('abierta','en_curso')), 0) AS total_inscritos,
        COALESCE(SUM(cupo_maximo) FILTER (WHERE estado IN ('abierta','en_curso')), 0) AS capacidad_total
      FROM cohorte
    `);

    // ── Renovación (si hay datos suficientes) ────────────
    const renovacion = await db(`
      SELECT
        COUNT(DISTINCT i1.escalador_id) AS escaladores_con_2_ciclos
      FROM inscripcion i1
      WHERE i1.estado IN ('activa','completada')
        AND EXISTS (
          SELECT 1 FROM inscripcion i2
          WHERE i2.escalador_id = i1.escalador_id
            AND i2.id != i1.id
            AND i2.estado IN ('activa','completada')
        )
    `);

    // ── Ingresos por nivel ───────────────────────────────
    const ingresoNivel = await db(`
      SELECT
        p.nivel,
        COUNT(DISTINCT i.id) AS inscripciones,
        COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado = 'pagado'), 0) AS recaudado
      FROM inscripcion i
      JOIN cohorte co ON i.cohorte_id = co.id
      JOIN programa p ON co.programa_id = p.id
      LEFT JOIN pago pa ON pa.inscripcion_id = i.id
      WHERE i.estado = 'activa'
      GROUP BY p.nivel
      ORDER BY p.nivel
    `);

    // ── Consolidar ───────────────────────────────────────
    const ing = ingresos.rows[0];
    const egr = egresos.rows[0];
    const pf = parafiscales.rows[0];
    const op = operacion.rows[0];
    const ins = inscripciones.rows[0];
    const coh = cohortes.rows[0];

    const nominaMensual = parseFloat(egr.nomina_mensual);
    const costoRRHH = Math.round(nominaMensual * 1.54);
    const ingresosRecibidos = parseFloat(ing.ingresos_recibidos);
    const ocupacion = parseInt(coh.capacidad_total) > 0
      ? Math.round((parseInt(coh.total_inscritos) / parseInt(coh.capacidad_total)) * 100)
      : 0;
    const tasaRecaudo = parseFloat(ing.ingresos_esperados) > 0
      ? Math.round((ingresosRecibidos / parseFloat(ing.ingresos_esperados)) * 100)
      : 0;

    res.json({
      // Financiero
      ingresos_recibidos: ingresosRecibidos,
      ingresos_esperados: parseFloat(ing.ingresos_esperados),
      monto_pendiente: parseFloat(ing.monto_pendiente),
      monto_vencido: parseFloat(ing.monto_vencido),
      pagos_pendientes: parseInt(ing.pagos_pendientes),
      pagos_vencidos: parseInt(ing.pagos_vencidos),
      tasa_recaudo: tasaRecaudo,
      ingresos_por_mes: ingresosMes.rows,
      ingresos_por_nivel: ingresoNivel.rows,

      // RRHH / Egresos
      nomina_mensual: nominaMensual,
      costo_rrhh_mensual: costoRRHH,
      contratos_activos: parseInt(egr.contratos_activos),
      parafiscales_pendientes: parseFloat(pf.pf_pendientes),
      parafiscales_pagados: parseFloat(pf.pf_pagados),

      // Margen estimado
      margen_mensual: Math.round(ingresosRecibidos - costoRRHH),

      // Operación
      escaladores_activos: parseInt(op.escaladores_activos),
      escaladores_total: parseInt(op.total_escaladores),
      inscripciones_activas: parseInt(ins.inscripciones_activas),
      cohortes_abiertas: parseInt(coh.cohortes_abiertas),
      cohortes_en_curso: parseInt(coh.cohortes_en_curso),
      total_inscritos: parseInt(coh.total_inscritos),
      capacidad_total: parseInt(coh.capacidad_total),
      ocupacion_pct: ocupacion,
      escaladores_renovados: parseInt(renovacion.rows[0].escaladores_con_2_ciclos),
    });
  } catch (err) {
    console.error("Error en dashboard:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
