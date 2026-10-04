/**
 * Notificaciones a n8n (capa de AI). Fire-and-forget: nunca bloquea ni rompe
 * la respuesta HTTP. Si la URL no está configurada, no hace nada.
 *
 * Env:
 *   N8N_WEBHOOK_URL         → flujo 1 (generar-plan, tras test S0)
 *   N8N_WEBHOOK_AJUSTE_URL  → flujo 2 (ajustar-sesion, tras cada registro)
 *   N8N_WEBHOOK_SECRET      → se envía en X-Webhook-Secret; configurar el mismo
 *                             valor en la autenticación por header del webhook en n8n
 */
const prisma = require("../config/prisma");

// Claves de resultado_test → códigos del protocolo Hörst que entiende el prompt
const METRICA_CODIGO = {
  barras_lastre_kg: "T2",
  suspensiones_20mm_kg: "T4",
  repeticiones_regleta_rep: "T5",
  resistencia_continua_seg: "T6",
  campus_movimientos: "T7",
  grado_critico_un: "T9",
  powerslab_d_cm: "PowerslabD",
  powerslab_i_cm: "PowerslabI",
  circuito_min: "Circuito",
};

function notificar(url, payload) {
  if (!url) return;
  const headers = { "Content-Type": "application/json" };
  if (process.env.N8N_WEBHOOK_SECRET) headers["X-Webhook-Secret"] = process.env.N8N_WEBHOOK_SECRET;
  fetch(url, { method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) })
    .then(r => { if (!r.ok) console.error(`[n8n] ${url} respondió ${r.status}`); })
    .catch(err => console.error("[n8n] webhook error:", err.message));
}

/** Flujo 1: generar plan personalizado a partir de una evaluación de entrada (S0). */
async function notificarTestEntrada(evaluacionId) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return;
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT e.id, e.nombre, e.peso_kg, e.nivel, e.rango_etario, ev.tipo
       FROM evaluacion ev JOIN escalador e ON e.id = ev.escalador_id
       WHERE ev.id = $1::uuid`,
      evaluacionId
    );
    const esc = rows[0];
    if (!esc || esc.tipo !== "entrada") return; // el test de salida (S12) no regenera el plan
    const resultados = await prisma.$queryRawUnsafe(
      "SELECT metrica, valor, unidad FROM resultado_test WHERE evaluacion_id = $1::uuid",
      evaluacionId
    );
    notificar(url, {
      evaluacionId,
      escaladorId: esc.id,
      nombre: esc.nombre,
      pesoKg: esc.peso_kg === null ? null : Number(esc.peso_kg),
      nivel: esc.nivel,
      rangoEtario: esc.rango_etario,
      resultados: resultados.map(r => ({
        metrica: r.metrica,
        codigo: METRICA_CODIGO[r.metrica] || r.metrica,
        valor: Number(r.valor),
        unidad: r.unidad,
      })),
    });
  } catch (err) {
    console.error("[n8n] no se pudo preparar el test de entrada:", err.message);
  }
}

/** Flujo 2: ajuste de la sesión siguiente tras un registro de sesión. */
function notificarReporteSesion(payload) {
  notificar(process.env.N8N_WEBHOOK_AJUSTE_URL, payload);
}

module.exports = { notificarTestEntrada, notificarReporteSesion, METRICA_CODIGO };
