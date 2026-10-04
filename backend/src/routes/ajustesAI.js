/**
 * Ajustes del plan propuestos por la AI.
 *
 *   POST /ajustes-ai/n8n/resultado     → n8n devuelve la respuesta de Claude (auth: X-Webhook-Secret + firma)
 *   GET  /ajustes-ai?estado=pendiente  → entrenador (sus escaladores) o admin (todos)
 *   POST /ajustes-ai/:id/aprobar       → { nota? }
 *   POST /ajustes-ai/:id/rechazar      → { nota? }
 *   POST /ajustes-ai/aprobar           → { ids: [...] } aprobación en bloque
 */
const express = require("express");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");
const { puedeVerEscalador } = require("../utils/acceso");
const { validarAjustes, guardarPropuestas, firmaValida, etiquetaFuente } = require("../utils/ajustesAI");

const router = express.Router();

function secretoValido(req) {
  const esperado = Buffer.from(process.env.N8N_WEBHOOK_SECRET || "");
  const recibido = Buffer.from(String(req.headers["x-webhook-secret"] || ""));
  return esperado.length > 0 && esperado.length === recibido.length && crypto.timingSafeEqual(esperado, recibido);
}

// ─── POST /ajustes-ai/n8n/resultado ──────────────────────
router.post("/n8n/resultado", async (req, res) => {
  if (!secretoValido(req)) return res.status(401).json({ error: "No autorizado" });
  const { meta, firma, respuesta, error: errorN8n } = req.body || {};
  if (!meta || !firmaValida(meta, firma)) return res.status(400).json({ error: "Metadata inválida" });

  const bitacora = { aceptados: 0, descartados: [], sinCambios: null, error: null };
  try {
    if (errorN8n || respuesta?.type === "error") {
      throw new Error(typeof errorN8n === "string" ? errorN8n : JSON.stringify(errorN8n || respuesta.error));
    }
    const r = await validarAjustes(meta, respuesta);
    await guardarPropuestas(meta, r.validos);
    Object.assign(bitacora, { aceptados: r.validos.length, descartados: r.descartados, sinCambios: r.sinCambios });
  } catch (err) {
    bitacora.error = err.message;
    console.error("[ajustes-ai] consulta fallida:", err.message);
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO plan_ai_consulta (lote_id, escalador_id, origen, sesiones, aceptados, descartados, sin_cambios, error, uso)
     VALUES ($1::uuid, $2::uuid, $3, $4::text[], $5, $6::jsonb, $7, $8, $9::jsonb)`,
    meta.loteId, meta.escaladorId, meta.origen, meta.sesiones, bitacora.aceptados,
    JSON.stringify(bitacora.descartados), bitacora.sinCambios, bitacora.error, JSON.stringify(respuesta?.usage || null)
  ).catch(err => console.error("[ajustes-ai] bitácora:", err.message));

  res.json({ ok: !bitacora.error, aceptados: bitacora.aceptados, descartados: bitacora.descartados.length, error: bitacora.error });
});

// ─── Revisión (entrenador / admin) ───────────────────────
router.use(authenticate, authorize("entrenador", "admin"));

router.get("/", async (req, res) => {
  const estado = ["pendiente", "aprobado", "rechazado"].includes(req.query.estado) ? req.query.estado : "pendiente";
  const esAdmin = req.user.rol === "admin";
  try {
    const filas = await prisma.$queryRawUnsafe(
      `SELECT a.id, a.escalador_id, e.nombre AS escalador, a.trimestre, a.semana, a.sesion_num, a.bloque, a.etiqueta,
              a.valor_base, a.valor_propuesto, a.motivo, a.fuente, a.pagina, a.cita, a.origen, a.estado,
              a.created_at, a.revisado_at, a.nota_revisor, f.seccion AS fuente_seccion
       FROM plan_ai_ajuste a
       JOIN escalador e ON e.id = a.escalador_id
       LEFT JOIN fuente_fragmento f ON f.clave = a.fuente
       WHERE a.estado = $1
         AND ($2::boolean OR EXISTS (
           SELECT 1 FROM inscripcion i JOIN grupo g ON g.id = i.grupo_id
           WHERE i.escalador_id = a.escalador_id AND i.estado = 'activa' AND g.entrenador_id = $3::uuid))
       ORDER BY e.nombre, a.trimestre, a.semana, a.sesion_num, a.created_at
       LIMIT 500`,
      estado, esAdmin, req.user.entrenador?.id || "00000000-0000-0000-0000-000000000000"
    );
    res.json(filas.map(f => ({ ...f, fuente_etiqueta: etiquetaFuente(f.fuente, f.pagina) })));
  } catch (err) {
    console.error("[GET /ajustes-ai]", err.message);
    res.status(500).json({ error: "Error al cargar los ajustes" });
  }
});

async function revisar(req, ids, estado, nota) {
  let hechos = 0;
  for (const id of ids) {
    const filas = await prisma.$queryRawUnsafe(
      "SELECT id, escalador_id, trimestre, semana, sesion_num, bloque, etiqueta FROM plan_ai_ajuste WHERE id = $1::uuid AND estado = 'pendiente'",
      id
    );
    const a = filas[0];
    if (!a || !(await puedeVerEscalador(req.user, a.escalador_id))) continue;
    await prisma.$transaction(async tx => {
      // Al aprobar, el ajuste aprobado anterior del mismo parámetro deja de aplicarse.
      if (estado === "aprobado") {
        await tx.$executeRawUnsafe(
          `UPDATE plan_ai_ajuste SET estado = 'reemplazado'
           WHERE escalador_id = $1::uuid AND trimestre = $2 AND semana = $3 AND sesion_num = $4
             AND bloque = $5 AND etiqueta = $6 AND estado = 'aprobado'`,
          a.escalador_id, a.trimestre, a.semana, a.sesion_num, a.bloque, a.etiqueta
        );
      }
      await tx.$executeRawUnsafe(
        `UPDATE plan_ai_ajuste SET estado = $2, revisado_por = $3::uuid, revisado_at = now(), nota_revisor = $4
         WHERE id = $1::uuid AND estado = 'pendiente'`,
        a.id, estado, req.user.id, nota || null
      );
    });
    hechos++;
  }
  return hechos;
}

const RE_UUID = /^[0-9a-f-]{36}$/i;

router.post("/aprobar", async (req, res) => {
  const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter(id => RE_UUID.test(id)).slice(0, 200);
  if (!ids.length) return res.status(400).json({ error: "ids requeridos" });
  try {
    res.json({ aprobados: await revisar(req, ids, "aprobado", req.body.nota) });
  } catch (err) {
    console.error("[POST /ajustes-ai/aprobar]", err.message);
    res.status(500).json({ error: "No se pudieron aprobar" });
  }
});

for (const [accion, estado] of [["aprobar", "aprobado"], ["rechazar", "rechazado"]]) {
  router.post(`/:id/${accion}`, async (req, res) => {
    if (!RE_UUID.test(req.params.id)) return res.status(400).json({ error: "id inválido" });
    try {
      const n = await revisar(req, [req.params.id], estado, String(req.body?.nota || "").slice(0, 500));
      if (!n) return res.status(404).json({ error: "Ajuste no encontrado o ya revisado" });
      res.json({ ok: true, estado });
    } catch (err) {
      console.error(`[POST /ajustes-ai/:id/${accion}]`, err.message);
      res.status(500).json({ error: "No se pudo guardar la revisión" });
    }
  });
}

module.exports = router;
