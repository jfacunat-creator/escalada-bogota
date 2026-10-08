/**
 * Videos para revisión (tablas video_revision y video_observacion).
 *
 *   GET  /videos?escaladorId=&pendientes=1   → escalador: los suyos · entrenador: los de sus escaladores · admin: todos
 *   POST /videos                              → el escalador comparte un enlace (YouTube o Drive) de una sesión del plan
 *   POST /videos/:id/observaciones            → el entrenador o el admin comenta el video
 *
 * El escalador no sube archivos: comparte un enlace a su video (formato sugerido MP4/MOV, máx. 50 MB).
 * Límite: VIDEOS_POR_MES por mes calendario (hora de Bogotá). Los videos no se ocultan nunca:
 * se ven siempre, aunque la mensualidad no esté al día.
 */
const express = require("express");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");
const { puedeVerEscalador } = require("../utils/acceso");

const router = express.Router();
router.use(authenticate);

const VIDEOS_POR_MES = 4;
const RE_TRIMESTRE = /^T[1-4]$/;
const RE_SEMANA = /^S(\d{1,2})$/;
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MES_BOGOTA = "date_trunc('month', now() AT TIME ZONE 'America/Bogota')";

const err = (status, message) => Object.assign(new Error(message), { status });
function manejarError(res, e, ruta) {
  if (e.status) return res.status(e.status).json({ error: e.message });
  console.error(`Error ${ruta}:`, e);
  res.status(500).json({ error: "Error interno" });
}

// Solo enlaces de YouTube o Google Drive (https). Devuelve la plataforma o null.
function plataformaDe(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase().replace(/^www\.|^m\./, "");
  if (["youtube.com", "youtu.be"].includes(host)) return "youtube";
  if (host === "drive.google.com") return "drive";
  return null;
}

// Videos con escalador y observaciones. `filtro` es SQL adicional con parámetros desde $1.
async function listar(filtro, params) {
  return prisma.$queryRawUnsafe(
    `SELECT v.id, v.escalador_id, v.trimestre, v.semana, v.sesion_num, v.sesion_nombre, v.url, v.plataforma,
            v.descripcion, v.created_at, e.nombre, e.apellido,
            COALESCE((SELECT json_agg(json_build_object(
                        'id', o.id, 'texto', o.texto, 'autorRol', o.autor_rol, 'createdAt', o.created_at,
                        'autor', COALESCE(t.nombre, 'Administrador')) ORDER BY o.created_at)
                      FROM video_observacion o
                      LEFT JOIN entrenador t ON t.usuario_id = o.usuario_id
                      WHERE o.video_id = v.id), '[]'::json) AS observaciones
     FROM video_revision v JOIN escalador e ON e.id = v.escalador_id
     WHERE ${filtro}
     ORDER BY v.created_at DESC
     LIMIT 300`,
    ...params
  );
}

async function usadosEsteMes(escaladorId) {
  const r = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS n FROM video_revision
     WHERE escalador_id = $1::uuid AND (created_at AT TIME ZONE 'America/Bogota') >= ${MES_BOGOTA}`,
    escaladorId
  );
  return r[0].n;
}

// ─── GET /videos ──────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const conds = [], params = [];
    const { rol } = req.user;
    if (rol === "escalador") {
      if (!req.user.escalador) throw err(403, "Solo para escaladores");
      params.push(req.user.escalador.id); conds.push(`v.escalador_id = $${params.length}::uuid`);
    } else if (rol === "entrenador") {
      if (!req.user.entrenador?.id) throw err(403, "Perfil de entrenador no encontrado");
      params.push(req.user.entrenador.id);
      conds.push(`EXISTS (SELECT 1 FROM inscripcion i JOIN grupo g ON g.id = i.grupo_id
                          WHERE i.escalador_id = v.escalador_id AND g.entrenador_id = $${params.length}::uuid
                            AND i.estado = 'activa')`);
    } else if (rol !== "admin") {
      throw err(403, "Sin acceso");
    }
    if (rol !== "escalador" && req.query.escaladorId) {
      if (!RE_UUID.test(req.query.escaladorId)) throw err(400, "Escalador inválido");
      params.push(req.query.escaladorId); conds.push(`v.escalador_id = $${params.length}::uuid`);
    }
    if (req.query.pendientes === "1") conds.push("NOT EXISTS (SELECT 1 FROM video_observacion o WHERE o.video_id = v.id)");

    const videos = await listar(conds.length ? conds.join(" AND ") : "true", params);
    if (rol !== "escalador") return res.json({ videos });
    res.json({ videos, limite: VIDEOS_POR_MES, usadosMes: await usadosEsteMes(req.user.escalador.id) });
  } catch (e) { manejarError(res, e, "GET /videos"); }
});

// ─── POST /videos ─────────────────────────────────────────
router.post("/", authorize("escalador"), async (req, res) => {
  try {
    const escaladorId = req.user.escalador?.id;
    if (!escaladorId) throw err(403, "Solo para escaladores");
    const { url, trimestre, semana, sesionNum, sesionNombre, descripcion } = req.body || {};

    const enlace = typeof url === "string" ? url.trim() : "";
    const plataforma = plataformaDe(enlace);
    if (!plataforma || enlace.length > 500) throw err(400, "Pega un enlace https de YouTube o de Google Drive");
    if (!RE_TRIMESTRE.test(trimestre || "")) throw err(400, "Trimestre inválido");
    const m = RE_SEMANA.exec(semana || "");
    if (!m || Number(m[1]) > 12) throw err(400, "Elige la semana de la sesión (S0–S12)");
    const num = Number(sesionNum);
    if (!Number.isInteger(num) || num < 1 || num > 7) throw err(400, "Elige la sesión que muestra el video");

    if ((await usadosEsteMes(escaladorId)) >= VIDEOS_POR_MES) {
      throw err(429, `Ya compartiste ${VIDEOS_POR_MES} videos este mes. Podrás enviar más el próximo mes.`);
    }

    const r = await prisma.$queryRawUnsafe(
      `INSERT INTO video_revision (escalador_id, trimestre, semana, sesion_num, sesion_nombre, url, plataforma, descripcion)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      escaladorId, trimestre, semana, num,
      typeof sesionNombre === "string" ? sesionNombre.trim().slice(0, 160) || null : null,
      enlace, plataforma,
      typeof descripcion === "string" ? descripcion.trim().slice(0, 1000) || null : null
    );
    const [video] = await listar("v.id = $1::uuid", [r[0].id]);
    res.status(201).json(video);
  } catch (e) { manejarError(res, e, "POST /videos"); }
});

// ─── POST /videos/:id/observaciones ───────────────────────
router.post("/:id/observaciones", authorize("entrenador", "admin"), async (req, res) => {
  try {
    if (!RE_UUID.test(req.params.id)) throw err(404, "Video no encontrado");
    const texto = typeof req.body?.texto === "string" ? req.body.texto.trim() : "";
    if (!texto) throw err(400, "Escribe la observación");
    if (texto.length > 2000) throw err(400, "La observación es demasiado larga (máx. 2000 caracteres)");

    const v = await prisma.$queryRawUnsafe("SELECT escalador_id FROM video_revision WHERE id = $1::uuid", req.params.id);
    if (!v.length) throw err(404, "Video no encontrado");
    if (!(await puedeVerEscalador(req.user, v[0].escalador_id))) throw err(403, "Este escalador no está en tus grupos");

    await prisma.$executeRawUnsafe(
      `INSERT INTO video_observacion (video_id, usuario_id, autor_rol, texto) VALUES ($1::uuid, $2::uuid, $3, $4)`,
      req.params.id, req.user.id, req.user.rol, texto
    );
    const [video] = await listar("v.id = $1::uuid", [req.params.id]);
    res.status(201).json(video);
  } catch (e) { manejarError(res, e, "POST /videos/:id/observaciones"); }
});

module.exports = router;
