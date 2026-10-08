const express = require("express");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");
const { sincronizarPagos } = require("../utils/pagos");
const { mesValido, mesEnCurso, infoMes, todosLosMeses } = require("../utils/meses");

const router = express.Router();
router.use(authenticate);

// ─── GET /dashboard ───────────────────────────────────────
// Las cifras son por MES del ciclo (el servicio se paga por mes): ?cicloId=&mes=1..3 elige el mes
// (por defecto el que está en curso); ?todo=1 muestra el histórico completo; ?cicloId sin mes, el
// ciclo completo. Inscritos de un mes = inscripciones con mensualidad de ese mes.
router.get("/", authorize("admin"), async (req, res) => {
  try {
    const { nivel, modalidad, entrenadorId, rangoEtario } = req.query;
    let cicloId = req.query.cicloId || "";
    let mes = mesValido(req.query.mes);
    if (!req.query.todo && !cicloId) {
      const actual = await mesEnCurso();
      if (actual) ({ cicloId, mes } = actual);
    }
    if (cicloId && !/^[0-9a-f-]{36}$/i.test(cicloId)) return res.status(400).json({ error: "cicloId inválido" });
    if (!cicloId) mes = null;

    // Filtro de inscripciones (alias i, g, pr, e). Con mes: solo las que tienen mensualidad ese mes.
    function buildInscFilter(params, { conEscalador = true } = {}) {
      const conds = [];
      if (cicloId)      { params.push(cicloId);      conds.push(`g.ciclo_id = $${params.length}::uuid`); }
      if (mes)          { params.push(mes);          conds.push(`EXISTS (SELECT 1 FROM pago px WHERE px.inscripcion_id = i.id AND px.mes = $${params.length}::int)`); }
      if (nivel)        { params.push(nivel);        conds.push(`pr.nivel::text = $${params.length}`); }
      if (modalidad)    { params.push(modalidad);    conds.push(`g.modalidad::text = $${params.length}`); }
      if (entrenadorId) { params.push(entrenadorId); conds.push(`g.entrenador_id = $${params.length}::uuid`); }
      if (rangoEtario && conEscalador) { params.push(rangoEtario); conds.push(`e.rango_etario::text = $${params.length}`); }
      return conds.length ? " AND " + conds.join(" AND ") : "";
    }
    // Pagos (alias p) del mes elegido, para unirlos a las inscripciones.
    function pagoMes(params) {
      if (!mes) return "";
      params.push(mes);
      return ` AND p.mes = $${params.length}::int`;
    }
    function buildGrupoFilter(params) {
      const conds = [];
      if (cicloId)      { params.push(cicloId);      conds.push(`g.ciclo_id = $${params.length}::uuid`); }
      if (nivel)        { params.push(nivel);        conds.push(`pr.nivel::text = $${params.length}`); }
      if (modalidad)    { params.push(modalidad);    conds.push(`g.modalidad::text = $${params.length}`); }
      if (entrenadorId) { params.push(entrenadorId); conds.push(`g.entrenador_id = $${params.length}::uuid`); }
      return conds.length ? " AND " + conds.join(" AND ") : "";
    }
    // Ocupación: con mes, los inscritos de ese mes; sin mes, las inscripciones activas.
    function inscritosGrupo(params) {
      if (!mes) return `(SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = g.id AND i.estado = 'activa')`;
      params.push(mes);
      return `(SELECT COUNT(*) FROM pago px JOIN inscripcion i ON i.id = px.inscripcion_id WHERE i.grupo_id = g.id AND px.mes = $${params.length}::int)`;
    }

    await sincronizarPagos();
    const p1=[], p2=[], p3=[], p4=[], p5=[], p6=[], p7=[];
    const w1 = buildInscFilter(p1) + pagoMes(p1);
    const w2 = buildInscFilter(p2), j2 = pagoMes(p2);
    const w3 = buildInscFilter(p3), j3 = pagoMes(p3);
    const w4 = buildInscFilter(p4), j4 = pagoMes(p4);
    const n5 = inscritosGrupo(p5), w5 = buildGrupoFilter(p5);
    const w6 = buildInscFilter(p6);
    const w7 = buildGrupoFilter(p7);
    const estadoInsc = mes ? "TRUE" : "i.estado = 'activa'";
    const mesRef = cicloId && mes ? { cicloId, mes } : await mesEnCurso();

    const [
      finanzas, mesActual, porNivel, porEntrenador, inscStats, gruposStats,
      distEtario, distEntrenador, alertasPagos, alertasGrupos,
      pendientes, escaladoresStats, porMes, escaladoresRenovados,
      ciclos, entrenadores, meses,
    ] = await Promise.all([

      // 1. Mensualidades de las inscripciones filtradas (del mes elegido, o todas)
      prisma.$queryRawUnsafe(`
        SELECT
          COALESCE(SUM(p.monto) FILTER (WHERE p.estado = 'pagado'), 0) AS ingresos_recibidos,
          COUNT(p.id) FILTER (WHERE p.estado IN ('pendiente', 'vencido')) AS pagos_pendientes,
          COALESCE(SUM(p.monto) FILTER (WHERE p.estado = 'vencido'), 0) AS ingresos_vencidos
        FROM pago p
        JOIN inscripcion i ON p.inscripcion_id = i.id
        JOIN grupo g ON i.grupo_id = g.id
        JOIN programa pr ON g.programa_id = pr.id
        JOIN escalador e ON i.escalador_id = e.id
        WHERE 1=1${w1}
      `, ...p1),

      // 2. Mes elegido (o en curso): esperado vs recaudado
      mesRef ? prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(p.monto), 0) AS esperado_mes,
               COALESCE(SUM(p.monto) FILTER (WHERE p.estado = 'pagado'), 0) AS recaudado_mes
        FROM pago p JOIN inscripcion i ON i.id = p.inscripcion_id JOIN grupo g ON g.id = i.grupo_id
        WHERE g.ciclo_id = $1::uuid AND p.mes = $2::int
      `, mesRef.cicloId, mesRef.mes) : Promise.resolve([{ esperado_mes: 0, recaudado_mes: 0 }]),

      // 3. Ingresos por nivel
      prisma.$queryRawUnsafe(`
        SELECT pr.nivel, g.modalidad,
               COUNT(DISTINCT i.id) AS inscripciones,
               COALESCE(SUM(p.monto) FILTER (WHERE p.estado = 'pagado'), 0) AS recaudado
        FROM inscripcion i
        JOIN grupo g ON i.grupo_id = g.id
        JOIN programa pr ON g.programa_id = pr.id
        JOIN escalador e ON i.escalador_id = e.id
        LEFT JOIN pago p ON p.inscripcion_id = i.id${j2}
        WHERE ${mes ? "TRUE" : "i.estado IN ('activa', 'completada')"}${w2}
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
        LEFT JOIN pago p ON p.inscripcion_id = i.id${j3}
        WHERE ${mes ? "TRUE" : "i.estado IN ('activa', 'completada')"}${w3}
        GROUP BY ent.id, ent.nombre
        ORDER BY recaudado DESC
      `, ...p3),

      // 5. Inscripciones: del mes (con mensualidad) y cuántas pagaron
      prisma.$queryRawUnsafe(`
        SELECT
          COUNT(DISTINCT i.id) FILTER (WHERE ${estadoInsc}) AS inscripciones_activas,
          COUNT(DISTINCT i.id) AS inscripciones_total,
          COUNT(DISTINCT i.id) FILTER (WHERE p.estado = 'pagado') AS inscripciones_pagadas
        FROM inscripcion i
        JOIN grupo g ON i.grupo_id = g.id
        JOIN programa pr ON g.programa_id = pr.id
        JOIN escalador e ON i.escalador_id = e.id
        LEFT JOIN pago p ON p.inscripcion_id = i.id${j4}
        WHERE 1=1${w4}
      `, ...p4),

      // 6. Grupos y ocupación (del mes elegido)
      prisma.$queryRawUnsafe(`
        SELECT
          COUNT(*) FILTER (WHERE g.estado = 'abierta') AS grupos_abiertos,
          COUNT(*) FILTER (WHERE g.estado = 'en_curso') AS grupos_en_curso,
          COALESCE(SUM(${n5}) FILTER (WHERE g.estado IN ('abierta','en_curso')), 0) AS total_inscritos,
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
        WHERE ${estadoInsc}${w6}
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
        FROM grupo g
        WHERE g.estado IN ('abierta','en_curso')
          AND g.cupo_maximo > 0
          AND (SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = g.id AND i.estado IN ('activa','reservada'))::float
              / g.cupo_maximo >= 0.85
      `),

      // 11. Escaladores pendientes de activación
      prisma.$queryRawUnsafe(`
        SELECT e.id, e.nombre, e.apellido, e.rango_etario,
               e.telefono, e.contacto_emergencia, u.email, u.created_at
        FROM escalador e
        JOIN usuario u ON e.usuario_id = u.id
        WHERE e.estado = 'pendiente' AND e.nivel IS NULL
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

      // 13. Recaudo de los últimos 6 meses de ciclo ya iniciados
      prisma.$queryRawUnsafe(`
        SELECT * FROM (
          SELECT cm.clave, cm.mes, cm.fecha_inicio, cm.fecha_fin, TO_CHAR(cm.periodo, 'YYYY-MM') AS periodo,
                 COALESCE(SUM(p.monto) FILTER (WHERE p.estado = 'pagado'), 0) AS total,
                 COALESCE(SUM(p.monto), 0) AS esperado
          FROM ciclo_mes cm
          LEFT JOIN grupo g ON g.ciclo_id = cm.ciclo_id
          LEFT JOIN inscripcion i ON i.grupo_id = g.id
          LEFT JOIN pago p ON p.inscripcion_id = i.id AND p.mes = cm.mes
          WHERE cm.fecha_inicio <= CURRENT_DATE
          GROUP BY cm.clave, cm.mes, cm.fecha_inicio, cm.fecha_fin, cm.periodo
          ORDER BY cm.fecha_inicio DESC
          LIMIT 6
        ) x ORDER BY fecha_inicio ASC
      `),

      // 14. Renovación: escaladores que pagaron 2 o más meses
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) AS escaladores_renovados FROM (
          SELECT i.escalador_id FROM pago p JOIN inscripcion i ON i.id = p.inscripcion_id
          WHERE p.estado = 'pagado' GROUP BY i.escalador_id HAVING COUNT(*) >= 2
        ) AS renovados
      `),

      // 15. Opciones de filtro: ciclos
      prisma.$queryRawUnsafe(`SELECT id, codigo FROM ciclo ORDER BY anio DESC, trimestre DESC`),

      // 16. Opciones de filtro: entrenadores
      prisma.$queryRawUnsafe(`SELECT id, nombre FROM entrenador ORDER BY nombre`),

      // 17. Opciones de filtro: meses de los ciclos
      todosLosMeses(),
    ]);

    const f  = finanzas[0];
    const g  = mesActual[0];
    const gs = gruposStats[0];
    const es = escaladoresStats[0];
    const is = inscStats[0];
    const er = escaladoresRenovados[0];

    const ingresosRecibidos    = parseFloat(f.ingresos_recibidos) || 0;
    const capacidadTotal       = Number(gs.capacidad_total) || 0;
    const totalInscritos       = Number(gs.total_inscritos) || 0;
    const ocupacionPct         = capacidadTotal > 0
      ? Math.round((totalInscritos / capacidadTotal) * 100) : 0;

    res.json({
      // Financiero
      ingresos_recibidos:            ingresosRecibidos,
      esperado_mes:                  parseFloat(g.esperado_mes) || 0,
      recaudado_mes:                 parseFloat(g.recaudado_mes) || 0,
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
      inscripciones_pagadas:  Number(is.inscripciones_pagadas) || 0,
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

      // Periodo de las cifras: mes del ciclo elegido (null = ciclo completo o histórico)
      filtro_mes:   cicloId && mes ? await infoMes(cicloId, mes) : null,
      filtro_ciclo: cicloId || null,
      mes_referencia: mesRef ? await infoMes(mesRef.cicloId, mesRef.mes) : null,

      // Opciones para filtros del frontend
      _ciclos:       ciclos,
      _entrenadores: entrenadores,
      _meses:        meses,
    });
  } catch (err) {
    console.error("Error GET /dashboard:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
