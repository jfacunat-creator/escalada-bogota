const express = require("express");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /dashboard ───────────────────────────────────────
router.get("/", authorize("admin"), async (req, res) => {
  try {
    const { cicloId, nivel, modalidad, entrenadorId, rangoEtario } = req.query;

    function buildInscFilter(params) {
      const conds = [];
      if (cicloId)      { params.push(cicloId);      conds.push(`g.ciclo_id = $${params.length}`); }
      if (nivel)        { params.push(nivel);         conds.push(`pr.nivel = $${params.length}`); }
      if (modalidad)    { params.push(modalidad);     conds.push(`g.modalidad = $${params.length}`); }
      if (entrenadorId) { params.push(entrenadorId);  conds.push(`g.entrenador_id = $${params.length}`); }
      if (rangoEtario)  { params.push(rangoEtario);   conds.push(`e.rango_etario = $${params.length}`); }
      return conds.length ? " AND " + conds.join(" AND ") : "";
    }

    function buildGrupoFilter(params) {
      const conds = [];
      if (cicloId)      { params.push(cicloId);      conds.push(`g.ciclo_id = $${params.length}`); }
      if (nivel)        { params.push(nivel);         conds.push(`pr.nivel = $${params.length}`); }
      if (modalidad)    { params.push(modalidad);     conds.push(`g.modalidad = $${params.length}`); }
      if (entrenadorId) { params.push(entrenadorId);  conds.push(`g.entrenador_id = $${params.length}`); }
      return conds.length ? " AND " + conds.join(" AND ") : "";
    }

    const p1=[], p2=[], p3=[], p4=[], p5=[], p6=[], p7=[];
    const w1 = buildInscFilter(p1);
    const w2 = buildInscFilter(p2);
    const w3 = buildInscFilter(p3);
    const w4 = buildInscFilter(p4);
    const w5 = buildGrupoFilter(p5);
    const w6 = buildInscFilter(p6);
    const w7 = buildGrupoFilter(p7);

    const [
      finanzas, gastos, porNivel, porEntrenador, inscStats, gruposStats,
      distEtario, distEntrenador, alertasPagos, alertasGrupos,
      pendientes, escaladoresStats, porMes, escaladoresRenovados,
      ciclos, entrenadores,
    ] = await Promise.all([

      // 1. Métricas financieras
      prisma.$queryRawUnsafe(`
        SELECT
          COALESCE(SUM(p.monto) FILTER (WHERE p.estado = 'pagado'), 0) AS ingresos_recibidos,
          COUNT(p.id) FILTER (WHERE p.estado = 'pendiente') AS pagos_pendientes,
          COALESCE(SUM(p.monto) FILTER (WHERE p.estado = 'vencido'), 0) AS ingresos_vencidos
        FROM pago p
        JOIN inscripcion i ON p.inscripcion_id = i.id
        JOIN grupo g ON i.grupo_id = g.id
        JOIN programa pr ON g.programa_id = pr.id
        JOIN escalador e ON i.escalador_id = e.id
        WHERE i.estado = 'activa'${w1}
      `, ...p1),

      // 2. Gastos entrenadores (tabla puede no existir en todas las instalaciones)
      prisma.$queryRawUnsafe(`
        SELECT
          COALESCE(SUM(salario_base) * 1.54, 0) AS gastos_entrenadores_estimado,
          COUNT(*) AS n_entrenadores
        FROM contrato_entrenador WHERE estado = 'activo'
      `).catch(() => [{ gastos_entrenadores_estimado: 0, n_entrenadores: 0 }]),

      // 3. Ingresos por nivel
      prisma.$queryRawUnsafe(`
        SELECT pr.nivel, g.modalidad,
               COUNT(DISTINCT i.id) AS inscripciones,
               COALESCE(SUM(p.monto) FILTER (WHERE p.estado = 'pagado'), 0) AS recaudado
        FROM inscripcion i
        JOIN grupo g ON i.grupo_id = g.id
        JOIN programa pr ON g.programa_id = pr.id
        JOIN escalador e ON i.escalador_id = e.id
        LEFT JOIN pago p ON p.inscripcion_id = i.id
        WHERE i.estado = 'activa'${w2}
        GROUP BY pr.nivel, g.modalidad
        ORDER BY pr.nivel, g.modalidad
      `, ...p2),

      // 4. Ingresos por entrenador
      prisma.$queryRawUnsafe(`
        SELECT ent.nombre AS entrenador,
               COUNT(DISTINCT i.id) AS inscripciones,
               COALESCE(SUM(p.monto) FILTER (WHERE p.estado = 'pagado'), 0) AS recaudado
        FROM inscripcion i
        JOIN grupo g ON i.grupo_id = g.id
        JOIN entrenador ent ON g.entrenador_id = ent.id
        JOIN programa pr ON g.programa_id = pr.id
        JOIN escalador e ON i.escalador_id = e.id
        LEFT JOIN pago p ON p.inscripcion_id = i.id
        WHERE i.estado = 'activa'${w3}
        GROUP BY ent.id, ent.nombre
        ORDER BY recaudado DESC
      `, ...p3),

      // 5. Stats inscripciones
      prisma.$queryRawUnsafe(`
        SELECT
          COUNT(*) FILTER (WHERE i.estado = 'activa') AS inscripciones_activas,
          COUNT(*) AS inscripciones_total
        FROM inscripcion i
        JOIN grupo g ON i.grupo_id = g.id
        JOIN programa pr ON g.programa_id = pr.id
        JOIN escalador e ON i.escalador_id = e.id
        WHERE 1=1${w4}
      `, ...p4),

      // 6. Stats grupos
      prisma.$queryRawUnsafe(`
        SELECT
          COUNT(*) FILTER (WHERE g.estado = 'abierta') AS grupos_abiertos,
          COUNT(*) FILTER (WHERE g.estado = 'en_curso') AS grupos_en_curso,
          COALESCE(SUM(g.inscritos_actual) FILTER (WHERE g.estado IN ('abierta','en_curso')), 0) AS total_inscritos,
          COALESCE(SUM(g.cupo_maximo) FILTER (WHERE g.estado IN ('abierta','en_curso')), 0) AS capacidad_total
        FROM grupo g
        JOIN programa pr ON g.programa_id = pr.id
        WHERE 1=1${w5}
      `, ...p5),

      // 7. Distribución etaria
      prisma.$queryRawUnsafe(`
        SELECT e.rango_etario, COUNT(*) AS n
        FROM inscripcion i
        JOIN escalador e ON i.escalador_id = e.id
        JOIN grupo g ON i.grupo_id = g.id
        JOIN programa pr ON g.programa_id = pr.id
        WHERE i.estado = 'activa'${w6}
        GROUP BY e.rango_etario
        ORDER BY n DESC
      `, ...p6),

      // 8. Carga por entrenador
      prisma.$queryRawUnsafe(`
        SELECT ent.nombre,
               COUNT(DISTINCT g.id) AS grupos,
               COUNT(DISTINCT i.id) AS escaladores
        FROM grupo g
        JOIN programa pr ON g.programa_id = pr.id
        JOIN entrenador ent ON g.entrenador_id = ent.id
        LEFT JOIN inscripcion i ON i.grupo_id = g.id AND i.estado = 'activa'
        WHERE g.estado IN ('abierta','en_curso')${w7}
        GROUP BY ent.id, ent.nombre
        ORDER BY grupos DESC
      `, ...p7),

      // 9. Alertas: pagos vencidos
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) AS pagos_vencidos,
               COALESCE(SUM(monto), 0) AS monto_vencido
        FROM pago WHERE estado = 'vencido'
      `),

      // 10. Alertas: grupos casi llenos (≥ 85%)
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) AS grupos_casi_llenos
        FROM grupo
        WHERE estado IN ('abierta','en_curso')
          AND cupo_maximo > 0
          AND inscritos_actual::float / cupo_maximo >= 0.85
      `),

      // 11. Escaladores pendientes de activación
      prisma.$queryRawUnsafe(`
        SELECT e.id, e.nombre, e.apellido, e.rango_etario,
               e.telefono, e.contacto_emergencia, u.email, u.created_at
        FROM escalador e
        JOIN usuario u ON e.usuario_id = u.id
        WHERE e.estado = 'pendiente'
        ORDER BY u.created_at DESC
        LIMIT 30
      `),

      // 12. Totales de escaladores (siempre global)
      prisma.$queryRawUnsafe(`
        SELECT
          COUNT(*) FILTER (WHERE e.estado = 'activo') AS escaladores_activos,
          COUNT(*) AS escaladores_total,
          COUNT(*) FILTER (WHERE e.rango_etario = 'adulto' AND e.estado = 'activo') AS adultos,
          COUNT(*) FILTER (WHERE e.rango_etario != 'adulto' AND e.estado = 'activo') AS menores
        FROM escalador e
      `),

      // 13. Ingresos últimos 6 meses
      prisma.$queryRawUnsafe(`
        SELECT TO_CHAR(fecha_pago, 'YYYY-MM') AS periodo,
               COALESCE(SUM(monto), 0) AS total
        FROM pago
        WHERE estado = 'pagado'
          AND fecha_pago >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY periodo
        ORDER BY periodo ASC
      `),

      // 14. Escaladores con 2+ ciclos (renovación)
      prisma.$queryRawUnsafe(`
        SELECT COUNT(DISTINCT escalador_id) AS escaladores_renovados
        FROM (
          SELECT escalador_id FROM inscripcion GROUP BY escalador_id HAVING COUNT(*) >= 2
        ) AS renovados
      `),

      // 15. Opciones de filtro: ciclos
      prisma.$queryRawUnsafe(`SELECT id, codigo FROM ciclo ORDER BY anio DESC, trimestre DESC`),

      // 16. Opciones de filtro: entrenadores
      prisma.$queryRawUnsafe(`SELECT id, nombre FROM entrenador ORDER BY nombre`),
    ]);

    const f  = finanzas[0];
    const g  = gastos[0];
    const gs = gruposStats[0];
    const es = escaladoresStats[0];
    const is = inscStats[0];
    const er = escaladoresRenovados[0];

    const ingresosRecibidos    = parseFloat(f.ingresos_recibidos) || 0;
    const gastosEntrenadores   = parseFloat(g.gastos_entrenadores_estimado) || 0;
    const capacidadTotal       = Number(gs.capacidad_total) || 0;
    const totalInscritos       = Number(gs.total_inscritos) || 0;
    const ocupacionPct         = capacidadTotal > 0
      ? Math.round((totalInscritos / capacidadTotal) * 100) : 0;

    res.json({
      // Financiero
      ingresos_recibidos:            ingresosRecibidos,
      gastos_entrenadores_estimado:  gastosEntrenadores,
      n_entrenadores:                Number(g.n_entrenadores) || 0,
      margen_estimado:               ingresosRecibidos - gastosEntrenadores,
      pagos_pendientes:              Number(f.pagos_pendientes) || 0,
      ingresos_vencidos:             parseFloat(f.ingresos_vencidos) || 0,

      // Distribuciones financieras
      ingresos_por_nivel:       porNivel,
      ingresos_por_entrenador:  porEntrenador,
      ingresos_por_mes:         porMes,

      // Operación
      escaladores_activos:    Number(es.escaladores_activos) || 0,
      escaladores_total:      Number(es.escaladores_total) || 0,
      adultos:                Number(es.adultos) || 0,
      menores:                Number(es.menores) || 0,
      inscripciones_activas:  Number(is.inscripciones_activas) || 0,
      inscripciones_total:    Number(is.inscripciones_total) || 0,
      grupos_abiertos:        Number(gs.grupos_abiertos) || 0,
      grupos_en_curso:        Number(gs.grupos_en_curso) || 0,
      total_inscritos:        totalInscritos,
      capacidad_total:        capacidadTotal,
      ocupacion_pct:          ocupacionPct,
      escaladores_renovados:  Number(er.escaladores_renovados) || 0,

      // Distribuciones operativas
      distribucion_etario:     distEtario,
      distribucion_entrenador: distEntrenador,

      // Alertas
      alertas: {
        pagos_vencidos:     Number(alertasPagos[0].pagos_vencidos) || 0,
        monto_vencido:      parseFloat(alertasPagos[0].monto_vencido) || 0,
        grupos_casi_llenos: Number(alertasGrupos[0].grupos_casi_llenos) || 0,
      },

      // Escaladores sin grupo asignado
      pendientes,

      // Opciones para filtros del frontend
      _ciclos:       ciclos,
      _entrenadores: entrenadores,
    });
  } catch (err) {
    console.error("Error GET /dashboard:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
