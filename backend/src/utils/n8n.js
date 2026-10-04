/**
 * Envío a n8n de las consultas de ajuste del plan (capa de AI). Fire-and-forget: nunca bloquea
 * ni rompe la respuesta HTTP. Si falta configuración, no hace nada.
 *
 * El backend arma cada consulta completa (guía + fuentes + datos + plan vigente, ver utils/ajustesAI);
 * n8n solo la ejecuta contra la API de Anthropic (guarda la API key) y devuelve la respuesta a
 * POST {BACKEND_PUBLIC_URL}/api/ajustes-ai/n8n/resultado, donde se valida y queda pendiente de aprobación.
 *
 * Env:
 *   N8N_WEBHOOK_URL      → webhook del flujo "Ajustes AI"
 *   N8N_WEBHOOK_SECRET   → se envía en X-Webhook-Secret (mismo valor en la Header Auth del webhook)
 *                          y firma la metadata de cada consulta
 *   BACKEND_PUBLIC_URL   → URL de este backend vista desde n8n (local con Docker: http://host.docker.internal:3001)
 */
const prisma = require("../config/prisma");
const { construirTareas } = require("./ajustesAI");

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

const configurado = () =>
  process.env.N8N_WEBHOOK_URL && process.env.N8N_WEBHOOK_SECRET && process.env.BACKEND_PUBLIC_URL;

async function enviar(params) {
  const lote = await construirTareas(params);
  if (!lote) return;
  const res = await fetch(process.env.N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET },
    body: JSON.stringify({ ...lote, apiBase: process.env.BACKEND_PUBLIC_URL.replace(/\/$/, "") }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`n8n respondió ${res.status}`);
  console.log(`[n8n] lote ${lote.loteId}: ${lote.tareas.length} consultas (${params.origen})`);
}

/** Test de entrada (S0): una consulta por semana de entrenamiento. */
async function notificarTestEntrada(evaluacionId) {
  if (!configurado()) return;
  try {
    const rows = await prisma.$queryRawUnsafe(
      "SELECT escalador_id, tipo FROM evaluacion WHERE id = $1::uuid",
      evaluacionId
    );
    const ev = rows[0];
    if (!ev || ev.tipo !== "entrada") return; // el test de salida (S12) no ajusta el plan
    const resultados = await prisma.$queryRawUnsafe(
      "SELECT metrica, valor, unidad FROM resultado_test WHERE evaluacion_id = $1::uuid",
      evaluacionId
    );
    await enviar({
      escaladorId: ev.escalador_id,
      origen: "test_entrada",
      resultados: resultados.map(r => ({
        metrica: r.metrica,
        codigo: METRICA_CODIGO[r.metrica] || r.metrica,
        valor: Number(r.valor),
        unidad: r.unidad,
      })),
    });
  } catch (err) {
    console.error("[n8n] test de entrada:", err.message);
  }
}

/**
 * Reporte de una sesión: consulta sobre la sesión siguiente, solo si hay algo que interpretar
 * (notas, dolor, o PSE a 2+ puntos del objetivo). Con dolor 4+ no se consulta: la app ya suspende
 * esos ejercicios. Las reglas automáticas (sobrecarga −20 %, semáforo) viven en la app.
 */
async function notificarReporteSesion(reporte) {
  if (!configurado() || !reporte.siguiente) return;
  const desvio = reporte.pseObjetivo == null ? 0 : Math.abs(reporte.pse - reporte.pseObjetivo);
  if (reporte.dolor >= 4) return;
  if (!reporte.notas && reporte.dolor < 1 && desvio < 2) return;
  try {
    await enviar({ escaladorId: reporte.escaladorId, origen: "reporte", reporte });
  } catch (err) {
    console.error("[n8n] reporte de sesión:", err.message);
  }
}

module.exports = { notificarTestEntrada, notificarReporteSesion, METRICA_CODIGO };
