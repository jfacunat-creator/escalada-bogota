const prisma = require("../config/prisma");

// Mensualidades: cada inscripción activa paga una tarifa por MES según su modalidad
// (autónomo / acompañado). La tarifa vive en la tabla `tarifa` y la edita el admin.

const DIA_VENCIMIENTO = 5; // las mensualidades vencen el día 5 del mes que cubren

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

// Crea la mensualidad pendiente del mes indicado (por defecto el actual) para cada
// inscripción activa que aún no la tenga. Idempotente (índice único inscripción+periodo).
async function generarMensualidades(periodo, db = prisma) {
  const p = periodoDe(periodo || new Date());
  const creadas = await db.$queryRawUnsafe(
    `INSERT INTO pago (inscripcion_id, monto, estado, periodo, fecha_vencimiento)
     SELECT i.id, t.precio_mensual, 'pendiente', $1::date, $1::date + ($2::int - 1)
     FROM inscripcion i
     JOIN grupo g  ON g.id = i.grupo_id
     JOIN tarifa t ON t.modalidad = g.modalidad
     WHERE i.estado = 'activa'
       AND i.fecha_inscripcion < ($1::date + INTERVAL '1 month')
     ON CONFLICT (inscripcion_id, periodo) DO NOTHING
     RETURNING id`,
    p, DIA_VENCIMIENTO
  );
  return creadas.length;
}

// Mantiene al día las mensualidades del mes en curso y los vencidos. Se llama al leer pagos.
async function sincronizarPagos(db = prisma) {
  await generarMensualidades(null, db);
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
  generarMensualidades, sincronizarPagos, recontarGrupo, aplicarEfectosDePago,
};
