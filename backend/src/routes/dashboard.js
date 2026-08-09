/**
 * dashboard.js — KPIs consolidados admin v3
 * Filtros: cicloId, mes, nivel, modalidad, entrenadorId, rangoEtario
 */
const express = require("express");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");
const router = express.Router();
router.use(authenticate);
router.use(authorize("admin"));

router.get("/", async (req, res) => {
  try {
    const { cicloId, mes, nivel, modalidad, entrenadorId, rangoEtario } = req.query;

    // Construir cláusulas WHERE dinámicas
    const fParams = [];
    const fWhere = [];
    if (cicloId)      { fParams.push(cicloId);      fWhere.push(`co.ciclo_id = $${fParams.length}`); }
    if (nivel)        { fParams.push(nivel);         fWhere.push(`p.nivel = $${fParams.length}`); }
    if (modalidad)    { fParams.push(modalidad);     fWhere.push(`co.modalidad = $${fParams.length}`); }
    if (entrenadorId) { fParams.push(entrenadorId);  fWhere.push(`co.entrenador_id = $${fParams.length}`); }
    if (rangoEtario)  { fParams.push(rangoEtario);   fWhere.push(`e.rango_etario = $${fParams.length}`); }
    const joinFilter = fWhere.length > 0 ? ' AND ' + fWhere.join(' AND ') : '';

    let mesStart = null, mesEnd = null;
    if (mes) { mesStart = mes + '-01'; mesEnd = mes + '-31'; }

    // 1. Flujo de caja
    const ingresos = await db(`
      SELECT
        COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado = 'pagado'), 0)  AS ingresos_recibidos,
        COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado = 'vencido'), 0) AS ingresos_vencidos,
        COUNT(pa.id) FILTER (WHERE pa.estado = 'pendiente') AS pagos_pendientes,
        COUNT(pa.id) FILTER (WHERE pa.estado = 'vencido')  AS pagos_vencidos
      FROM pago pa
      JOIN inscripcion i ON pa.inscripcion_id = i.id
      JOIN escalador e ON i.escalador_id = e.id
      JOIN cohorte co ON i.cohorte_id = co.id
      JOIN programa p ON co.programa_id = p.id
      WHERE 1=1 ${joinFilter}
      ${mesStart ? `AND pa.fecha_pago BETWEEN '${mesStart}' AND '${mesEnd}'` : ''}
    `, fParams);

    // 2. Ingresos últimos 6 meses
    const ingresosMes = await db(`
      SELECT TO_CHAR(pa.fecha_pago, 'YYYY-MM') AS periodo, SUM(pa.monto) AS total
      FROM pago pa WHERE pa.estado = 'pagado' AND pa.fecha_pago >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY periodo ORDER BY periodo
    `);

    // 3. Ingresos por nivel + modalidad
    const ingresoNivel = await db(`
      SELECT p.nivel, co.modalidad, COUNT(DISTINCT i.id) AS inscripciones,
             COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado = 'pagado'), 0) AS recaudado
      FROM inscripcion i
      JOIN escalador e ON i.escalador_id = e.id
      JOIN cohorte co ON i.cohorte_id = co.id
      JOIN programa p ON co.programa_id = p.id
      LEFT JOIN pago pa ON pa.inscripcion_id = i.id
      WHERE i.estado = 'activa' ${joinFilter}
      GROUP BY p.nivel, co.modalidad ORDER BY p.nivel, co.modalidad
    `, fParams);

    // 4. Ingresos por entrenador
    const ingresoEnt = await db(`
      SELECT ent.id AS entrenador_id, ent.nombre AS entrenador, COUNT(DISTINCT i.id) AS inscripciones,
             COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado = 'pagado'), 0) AS recaudado
      FROM inscripcion i
      JOIN escalador e ON i.escalador_id = e.id
      JOIN cohorte co ON i.cohorte_id = co.id
      JOIN programa p ON co.programa_id = p.id
      JOIN entrenador ent ON co.entrenador_id = ent.id
      LEFT JOIN pago pa ON pa.inscripcion_id = i.id
      WHERE i.estado = 'activa' ${joinFilter}
      GROUP BY ent.id, ent.nombre ORDER BY recaudado DESC
    `, fParams);

    // 5. Gastos
    const entrenadoresActivos = await db(`SELECT COUNT(*) AS n FROM entrenador`);
    const nEnt = parseInt(entrenadoresActivos.rows[0].n);
    const gastoEst = nEnt * 1_800_000;

    // 6. Operación
    const operacion = await db(`
      SELECT COUNT(*) AS total_escaladores,
             COUNT(*) FILTER (WHERE e.estado = 'activo') AS escaladores_activos,
             COUNT(*) FILTER (WHERE e.rango_etario = 'adulto') AS adultos,
             COUNT(*) FILTER (WHERE e.rango_etario != 'adulto') AS menores
      FROM escalador e
    `);

    const inscripciones = await db(`
      SELECT COUNT(*) FILTER (WHERE i.estado = 'activa') AS inscripciones_activas,
             COUNT(*) AS inscripciones_total
      FROM inscripcion i
      JOIN cohorte co ON i.cohorte_id = co.id
      JOIN programa p ON co.programa_id = p.id
      WHERE 1=1 ${joinFilter}
    `, fParams);

    const grupos = await db(`
      SELECT COUNT(*) FILTER (WHERE co.estado = 'abierta') AS grupos_abiertos,
             COUNT(*) FILTER (WHERE co.estado = 'en_curso') AS grupos_en_curso,
             COUNT(*) AS grupos_total,
             COALESCE(SUM(co.inscritos_actual) FILTER (WHERE co.estado IN ('abierta','en_curso')), 0) AS total_inscritos,
             COALESCE(SUM(co.cupo_maximo) FILTER (WHERE co.estado IN ('abierta','en_curso')), 0) AS capacidad_total
      FROM cohorte co
      JOIN programa p ON co.programa_id = p.id
      WHERE 1=1 ${joinFilter.replace(/e\.rango_etario[^)]+/g, '1=1')}
    `, fParams.filter((_, idx) => !fWhere[idx]?.includes('rango_etario')));

    // 7. Distribución por rango etario
    const distEtario = await db(`
      SELECT e.rango_etario, COUNT(*) AS n
      FROM escalador e WHERE e.estado = 'activo'
      GROUP BY e.rango_etario ORDER BY n DESC
    `);

    // 8. Distribución por entrenador
    const distEntrenador = await db(`
      SELECT ent.nombre, COUNT(DISTINCT i.escalador_id) AS escaladores, COUNT(DISTINCT co.id) AS grupos
      FROM entrenador ent
      LEFT JOIN cohorte co ON co.entrenador_id = ent.id AND co.estado IN ('abierta','en_curso')
      LEFT JOIN inscripcion i ON i.cohorte_id = co.id AND i.estado = 'activa'
      GROUP BY ent.id, ent.nombre ORDER BY escaladores DESC
    `);

    // 9. Renovación
    const renovacion = await db(`
      SELECT COUNT(DISTINCT i1.escalador_id) AS escaladores_renovados
      FROM inscripcion i1
      WHERE i1.estado IN ('activa','completada')
        AND EXISTS (SELECT 1 FROM inscripcion i2 WHERE i2.escalador_id = i1.escalador_id AND i2.id != i1.id AND i2.estado IN ('activa','completada'))
    `);

    // 10. Alertas
    const alertas = await db(`
      SELECT COUNT(*) FILTER (WHERE pa.estado = 'vencido') AS pagos_vencidos,
             COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado = 'vencido'), 0) AS monto_vencido
      FROM pago pa
    `);
    const gruposLlenos = await db(`
      SELECT COUNT(*) AS n FROM cohorte WHERE estado IN ('abierta','en_curso') AND inscritos_actual >= FLOOR(cupo_maximo * 0.85)
    `);

    // 11. Ciclos y entrenadores para selectores
    const ciclos = await db(`SELECT id, codigo FROM ciclo ORDER BY anio DESC, trimestre DESC`);
    const entrenadores = await db(`SELECT id, nombre FROM entrenador ORDER BY nombre`);

    // Consolidar
    const ing = ingresos.rows[0];
    const op = operacion.rows[0];
    const ins = inscripciones.rows[0];
    const gr = grupos.rows[0] || { total_inscritos: '0', capacidad_total: '0', grupos_abiertos: '0', grupos_en_curso: '0', grupos_total: '0' };
    const al = alertas.rows[0];
    const cap = parseInt(gr.capacidad_total);

    res.json({
      ingresos_recibidos: parseFloat(ing.ingresos_recibidos),
      ingresos_vencidos: parseFloat(ing.ingresos_vencidos),
      pagos_pendientes: parseInt(ing.pagos_pendientes),
      pagos_vencidos: parseInt(ing.pagos_vencidos),
      ingresos_por_mes: ingresosMes.rows,
      ingresos_por_nivel: ingresoNivel.rows,
      ingresos_por_entrenador: ingresoEnt.rows,
      gastos_entrenadores_estimado: gastoEst,
      n_entrenadores: nEnt,
      margen_estimado: Math.round(parseFloat(ing.ingresos_recibidos) - gastoEst),
      escaladores_activos: parseInt(op.escaladores_activos),
      escaladores_total: parseInt(op.total_escaladores),
      adultos: parseInt(op.adultos),
      menores: parseInt(op.menores),
      inscripciones_activas: parseInt(ins.inscripciones_activas),
      inscripciones_total: parseInt(ins.inscripciones_total),
      grupos_abiertos: parseInt(gr.grupos_abiertos),
      grupos_en_curso: parseInt(gr.grupos_en_curso),
      grupos_total: parseInt(gr.grupos_total),
      total_inscritos: parseInt(gr.total_inscritos),
      capacidad_total: cap,
      ocupacion_pct: cap > 0 ? Math.round((parseInt(gr.total_inscritos) / cap) * 100) : 0,
      escaladores_renovados: parseInt(renovacion.rows[0].escaladores_renovados),
      distribucion_etario: distEtario.rows,
      distribucion_entrenador: distEntrenador.rows,
      alertas: {
        pagos_vencidos: parseInt(al.pagos_vencidos),
        monto_vencido: parseFloat(al.monto_vencido),
        grupos_casi_llenos: parseInt(gruposLlenos.rows[0].n),
      },
      // Selectores para filtros del frontend
      _ciclos: ciclos.rows,
      _entrenadores: entrenadores.rows,
    });
  } catch (err) {
    console.error("Error en dashboard:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
