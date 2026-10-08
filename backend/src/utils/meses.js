const prisma = require("../config/prisma");

// El servicio se paga por MES (4 semanas). Un ciclo (mesociclo) dura 13 semanas
// — S0 (empalme y test de entrada) + S1–S12 — y se divide en 3 meses:
//   Mes 1 = S0–S4 · Mes 2 = S5–S8 · Mes 3 = S9–S12
// Las fechas de cada mes salen de la vista SQL `ciclo_mes` (misma regla en días: 0–34, 35–62, 63–fin)
// y la función `ciclo_mes_de(inicio, fecha)`. Ver prisma/sql/2026-10-08_meses_del_ciclo.sql

const SEMANAS_MES = {
  1: ["S0", "S1", "S2", "S3", "S4"],
  2: ["S5", "S6", "S7", "S8"],
  3: ["S9", "S10", "S11", "S12"],
};

// "S5" → 2
function mesDeSemana(semana) {
  const m = /^S(\d{1,2})$/.exec(String(semana || ""));
  if (!m) return null;
  const n = Number(m[1]);
  return n <= 4 ? 1 : n <= 8 ? 2 : 3;
}

function mesValido(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 3 ? n : null;
}

// Mes del ciclo en curso (antes de empezar = 1, después de terminar = 3). `ci` es el alias de ciclo.
const SQL_MES_VIGENTE = (ci = "ci") => `ciclo_mes_de(${ci}.fecha_inicio, LEAST(CURRENT_DATE, ${ci}.fecha_fin))`;
// Mes en que entra una inscripción nueva: el vigente, o el siguiente si al vigente le queda menos de una semana.
const SQL_MES_ENTRADA = (ci = "ci") => `ciclo_mes_de(${ci}.fecha_inicio, LEAST(CURRENT_DATE + 7, ${ci}.fecha_fin))`;

const fecha = d => (d instanceof Date ? d.toISOString().slice(0, 10) : d ? String(d).slice(0, 10) : null);

function formatearMes(r) {
  return {
    mes: Number(r.mes),
    clave: r.clave,
    fechaInicio: fecha(r.fecha_inicio),
    fechaFin: fecha(r.fecha_fin),
    periodo: fecha(r.periodo)?.slice(0, 7), // mes calendario aproximado "AAAA-MM"
    semanas: SEMANAS_MES[r.mes],
  };
}

// Los 3 meses de un ciclo con sus fechas.
async function mesesDeCiclo(cicloId, db = prisma) {
  const rows = await db.$queryRawUnsafe(
    `SELECT cm.*, CURRENT_DATE BETWEEN cm.fecha_inicio AND cm.fecha_fin AS vigente
     FROM ciclo_mes cm WHERE cm.ciclo_id = $1::uuid ORDER BY cm.mes`,
    cicloId
  );
  return rows.map(r => ({ ...formatearMes(r), vigente: r.vigente }));
}

// Todos los meses de todos los ciclos (selector de periodo del admin), del más reciente al más antiguo.
async function todosLosMeses(db = prisma) {
  const rows = await db.$queryRawUnsafe(
    `SELECT cm.*, ci.anio, ci.trimestre, CURRENT_DATE BETWEEN cm.fecha_inicio AND cm.fecha_fin AS vigente
     FROM ciclo_mes cm JOIN ciclo ci ON ci.id = cm.ciclo_id
     ORDER BY cm.fecha_inicio DESC`
  );
  return rows.map(r => ({ ...formatearMes(r), cicloId: r.ciclo_id, cicloCodigo: r.codigo, vigente: r.vigente }));
}

// Mes del ciclo por defecto para reportes: el que está en curso hoy; si no hay ciclo en curso,
// el último que empezó; si ninguno empezó, el primero que viene.
async function mesEnCurso(db = prisma) {
  const r = await db.$queryRawUnsafe(
    `SELECT ciclo_id, mes FROM ciclo_mes
     ORDER BY (CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin) DESC,
              (fecha_inicio <= CURRENT_DATE) DESC,
              CASE WHEN fecha_inicio <= CURRENT_DATE THEN CURRENT_DATE - fecha_inicio ELSE fecha_inicio - CURRENT_DATE END
     LIMIT 1`
  );
  return r[0] ? { cicloId: r[0].ciclo_id, mes: Number(r[0].mes) } : null;
}

// Lee { cicloId, mes } de la query/body; si faltan, el mes en curso.
async function mesPedido({ cicloId, mes } = {}, db = prisma) {
  if (cicloId && mesValido(mes)) {
    if (!/^[0-9a-f-]{36}$/i.test(cicloId)) throw Object.assign(new Error("cicloId inválido"), { status: 400 });
    return { cicloId, mes: mesValido(mes) };
  }
  return mesEnCurso(db);
}

// Datos de un mes de un ciclo (fechas, clave, periodo aproximado).
async function infoMes(cicloId, mes, db = prisma) {
  const r = await db.$queryRawUnsafe(
    `SELECT cm.*, CURRENT_DATE BETWEEN cm.fecha_inicio AND cm.fecha_fin AS vigente
     FROM ciclo_mes cm WHERE cm.ciclo_id = $1::uuid AND cm.mes = $2::int`,
    cicloId, mes
  );
  return r[0] ? { ...formatearMes(r[0]), cicloId, cicloCodigo: r[0].codigo, vigente: r[0].vigente } : null;
}

// ─── Acceso del escalador al plan ─────────────────────────
// Solo ve el contenido del mes en curso y solo si ese mes está pagado. De los meses pagados
// anteriores conserva sus registros (no el contenido de las sesiones). Los meses futuros no se envían.
async function accesoEscalador(escaladorId, db = prisma) {
  const rows = await db.$queryRawUnsafe(
    `SELECT i.id AS inscripcion_id, g.id AS grupo_id, g.modalidad::text AS modalidad,
            ci.id AS ciclo_id, ci.codigo AS ciclo_codigo, ci.trimestre, p.nivel::text AS nivel,
            ${SQL_MES_VIGENTE()} AS mes_vigente, CURRENT_DATE > ci.fecha_fin AS terminado
     FROM inscripcion i
     JOIN grupo g     ON g.id = i.grupo_id
     JOIN ciclo ci    ON ci.id = g.ciclo_id
     JOIN programa p  ON p.id = g.programa_id
     WHERE i.escalador_id = $1::uuid AND i.estado = 'activa'
     ORDER BY i.created_at DESC
     LIMIT 1`,
    escaladorId
  );
  if (!rows.length) return null;
  const r = rows[0];
  const [meses, pagos] = await Promise.all([
    mesesDeCiclo(r.ciclo_id, db),
    db.$queryRawUnsafe(
      "SELECT id, mes, estado::text AS estado, monto, fecha_vencimiento FROM pago WHERE inscripcion_id = $1::uuid", r.inscripcion_id
    ),
  ]);
  const pagoDe = Object.fromEntries(pagos.map(p => [p.mes, p]));
  const mesVigente = Number(r.mes_vigente);
  const pagados = new Set(pagos.filter(p => p.estado === "pagado").map(p => Number(p.mes)));
  // Meses cuyo historial (registros) puede ver y editar: pagados y ya iniciados.
  const conHistorial = new Set([...pagados].filter(m => m <= mesVigente));
  const acceso = r.terminado ? "ciclo_terminado" : pagados.has(mesVigente) ? "completo" : "mes_no_pagado";
  return {
    inscripcionId: r.inscripcion_id,
    grupoId: r.grupo_id,
    cicloId: r.ciclo_id,
    cicloCodigo: r.ciclo_codigo,
    trimestre: `T${r.trimestre}`,
    nivel: r.nivel,
    modalidad: r.modalidad,
    mesVigente,
    acceso,
    conHistorial,
    meses: meses.map(m => ({
      ...m,
      pagoId: pagoDe[m.mes]?.id || null,
      estadoPago: pagoDe[m.mes]?.estado || null,
    })),
  };
}

// ¿Puede el escalador guardar un registro de esta semana? Solo en meses pagados ya iniciados.
function puedeRegistrar(acceso, trimestre, semana) {
  if (!acceso || acceso.trimestre !== trimestre) return false;
  return acceso.conHistorial.has(mesDeSemana(semana));
}

module.exports = {
  SEMANAS_MES, mesDeSemana, mesValido, SQL_MES_VIGENTE, SQL_MES_ENTRADA,
  mesesDeCiclo, todosLosMeses, mesEnCurso, mesPedido, infoMes, accesoEscalador, puedeRegistrar,
};
