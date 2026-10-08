const prisma = require("../config/prisma");
const { SQL_MES_VIGENTE } = require("./meses");

// Mensualidades: cada inscripción paga una tarifa por MES según su modalidad (autónomo /
// acompañado). La tarifa vive en la tabla `tarifa` y la edita el admin.
// El mes es un mes del ciclo de su grupo (1 = S0–S4, 2 = S5–S8, 3 = S9–S12; ver utils/meses.js):
// un pago por inscripción y mes. Pagar el mes da acceso al plan de ese mes.

const DIA_VENCIMIENTO = 5;   // las mensualidades vencen el 5.º día del mes del ciclo que cubren
const DIAS_RENOVACION = 7;   // la mensualidad del mes siguiente se genera una semana antes de que empiece

async function tarifas(db = prisma) {
  const rows = await db.$queryRawUnsafe(`SELECT modalidad::text AS modalidad, precio_mensual FROM tarifa`);
  return Object.fromEntries(rows.map(r => [r.modalidad, parseFloat(r.precio_mensual)]));
}

async function tarifaMensual(modalidad, db = prisma) {
  const t = await tarifas(db);
  if (!t[modalidad]) throw Object.assign(new Error(`No hay tarifa configurada para la modalidad ${modalidad}`), { status: 400 });
  return t[modalidad];
}

// "2026-10" | "2026-10-15" | Date → "2026-10-01"
function periodoDe(valor) {
  const s = valor instanceof Date ? valor.toISOString() : String(valor || "");
  const m = /^(\d{4})-(\d{2})/.exec(s);
  if (!m || +m[2] < 1 || +m[2] > 12) throw Object.assign(new Error("Periodo inválido (usa AAAA-MM)"), { status: 400 });
  return `${m[1]}-${m[2]}-01`;
}

// Pendientes con fecha de vencimiento pasada → vencido.
async function marcarVencidos(db = prisma) {
  await db.$executeRawUnsafe(
    `UPDATE pago SET estado = 'vencido', updated_at = NOW()
     WHERE estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE`
  );
}

// Renovación: crea la mensualidad pendiente del mes en curso (o del siguiente, desde una semana
// antes de que empiece) para cada inscripción activa que pagó el mes anterior. Quien no pagó el
// mes anterior no acumula deuda: el admin o el escalador abren el mes cuando decida continuar.
// Idempotente (índice único inscripción + mes).
async function generarMensualidades(db = prisma) {
  const creadas = await db.$queryRawUnsafe(
    `INSERT INTO pago (inscripcion_id, monto, estado, mes, fecha_vencimiento)
     SELECT i.id, t.precio_mensual, 'pendiente', cm.mes, cm.fecha_inicio + ($1::int - 1)
     FROM inscripcion i
     JOIN grupo g  ON g.id = i.grupo_id
     JOIN tarifa t ON t.modalidad = g.modalidad
     JOIN ciclo_mes cm ON cm.ciclo_id = g.ciclo_id
     WHERE i.estado = 'activa'
       AND cm.mes > 1
       AND cm.fecha_inicio <= CURRENT_DATE + $2::int AND cm.fecha_fin >= CURRENT_DATE
       AND EXISTS (SELECT 1 FROM pago pa WHERE pa.inscripcion_id = i.id AND pa.mes = cm.mes - 1 AND pa.estado = 'pagado')
     ON CONFLICT (inscripcion_id, mes) DO NOTHING
     RETURNING id`,
    DIA_VENCIMIENTO, DIAS_RENOVACION
  );
  return creadas.length;
}

// Crea (pendiente) la mensualidad de un mes del ciclo para una inscripción. Si ya existe no la toca.
// `vence`: fecha de vencimiento explícita (p. ej. reserva de 24 h); por defecto el 5.º día del mes
// (o 5 días desde hoy si el mes ya empezó).
async function crearMensualidad(inscripcionId, mes, { vence = null } = {}, db = prisma) {
  const r = await db.$queryRawUnsafe(
    `INSERT INTO pago (inscripcion_id, monto, estado, mes, fecha_vencimiento)
     SELECT i.id, t.precio_mensual, 'pendiente', cm.mes,
            COALESCE($3::date, GREATEST(cm.fecha_inicio, CURRENT_DATE) + ($4::int - 1))
     FROM inscripcion i
     JOIN grupo g  ON g.id = i.grupo_id
     JOIN tarifa t ON t.modalidad = g.modalidad
     JOIN ciclo_mes cm ON cm.ciclo_id = g.ciclo_id AND cm.mes = $2::int
     WHERE i.id = $1::uuid
     ON CONFLICT (inscripcion_id, mes) DO NOTHING
     RETURNING *`,
    inscripcionId, mes, vence, DIA_VENCIMIENTO
  );
  return r[0] || null;
}

// Al congelar / cancelar / completar: borra las mensualidades SIN PAGAR del mes del ciclo en curso
// en adelante (las pagadas y las de meses anteriores se conservan).
async function liberarMensualidades(inscripcionIds, db = prisma) {
  if (!inscripcionIds.length) return 0;
  return db.$executeRawUnsafe(
    `DELETE FROM pago pa USING inscripcion i, grupo g, ciclo ci
     WHERE pa.inscripcion_id = ANY($1::uuid[]) AND i.id = pa.inscripcion_id AND g.id = i.grupo_id AND ci.id = g.ciclo_id
       AND pa.estado IN ('pendiente', 'vencido') AND pa.mes >= ${SQL_MES_VIGENTE()}`,
    inscripcionIds
  );
}

// Condición SQL: mensualidad sin pagar del mes del ciclo en curso o posterior (alias pago `p`, ciclo `ci`).
const SQL_SIN_PAGAR_DESDE_HOY = `p.estado IN ('pendiente', 'vencido') AND p.mes >= ${SQL_MES_VIGENTE()}`;

// Mantiene al día las mensualidades del mes en curso y los vencidos. Se llama al leer pagos.
async function sincronizarPagos(db = prisma) {
  await generarMensualidades(db);
  await marcarVencidos(db);
}

// grupo.inscritos_actual = inscripciones activas reales (nunca se suma/resta a mano).
async function recontarGrupo(grupoId, db = prisma) {
  await db.$executeRawUnsafe(
    `UPDATE grupo SET inscritos_actual =
       (SELECT COUNT(*) FROM inscripcion i WHERE i.grupo_id = $1 AND i.estado = 'activa'),
       updated_at = NOW()
     WHERE id = $1`,
    grupoId
  );
}

// Registrar un pago tiene efectos en cadena: la reserva pasa a activa (ocupa cupo)
// y el escalador pendiente queda activo.
async function aplicarEfectosDePago(pagoId, db = prisma) {
  const rows = await db.$queryRawUnsafe(
    `SELECT i.id AS insc_id, i.estado AS insc_estado, i.grupo_id, e.id AS esc_id, e.estado AS esc_estado
     FROM pago p
     JOIN inscripcion i ON p.inscripcion_id = i.id
     JOIN escalador e ON i.escalador_id = e.id
     WHERE p.id = $1`,
    pagoId
  );
  if (!rows.length) return;
  const r = rows[0];
  if (r.insc_estado === "reservada") {
    await db.$executeRawUnsafe(`UPDATE inscripcion SET estado = 'activa', updated_at = NOW() WHERE id = $1`, r.insc_id);
  }
  if (r.esc_estado === "pendiente") {
    await db.$executeRawUnsafe(`UPDATE escalador SET estado = 'activo', updated_at = NOW() WHERE id = $1`, r.esc_id);
  }
  await recontarGrupo(r.grupo_id, db);
}

module.exports = {
  DIA_VENCIMIENTO, tarifas, tarifaMensual, periodoDe, marcarVencidos,
  generarMensualidades, crearMensualidad, liberarMensualidades, SQL_SIN_PAGAR_DESDE_HOY,
  sincronizarPagos, recontarGrupo, aplicarEfectosDePago,
};
