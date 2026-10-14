/**
 * Videos guía por ejercicio. El catálogo vive en utils/ejercicios.js; los videos en la tabla ejercicio_video.
 *
 *   GET    /ejercicios                → admin: catálogo + video + cuántos bloques del plan usa cada ejercicio
 *   GET    /ejercicios/videos         → cualquier usuario: { clave: { plataforma, videoId, nombre } } con video
 *   PUT    /ejercicios/:clave/video   → admin: guarda el enlace { url }
 *   DELETE /ejercicios/:clave/video   → admin: quita el video
 */
const express = require("express");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");
const { CATALOGO, POR_CLAVE, ejercicioDeBloque, parsearVideo, videosPorClave } = require("../utils/ejercicios");

const router = express.Router();
router.use(authenticate);

const manejarError = (res, e, ruta) => { console.error(`Error ${ruta}:`, e); res.status(500).json({ error: "Error interno" }); };

// ─── GET /ejercicios ──────────────────────────────────────
router.get("/", authorize("admin"), async (req, res) => {
  try {
    const [videos, bloques] = await Promise.all([
      prisma.$queryRawUnsafe("SELECT clave, url, plataforma, video_id, updated_at FROM ejercicio_video"),
      prisma.$queryRawUnsafe(
        `SELECT b->>'n' AS n, COUNT(*)::int AS c
         FROM plan_contenido t, jsonb_array_elements(t.semanas) w, jsonb_array_elements(w->'sesiones') s,
              jsonb_array_elements(COALESCE(s->'blocks', '[]'::jsonb)) b
         GROUP BY 1`
      ),
    ]);
    const porClave = new Map(videos.map(v => [v.clave, v]));
    const usos = {}, ejemplos = {}, sinEjercicio = [];
    for (const b of bloques) {
      const e = ejercicioDeBloque(b.n);
      if (!e) { sinEjercicio.push({ nombre: b.n, veces: b.c }); continue; }
      usos[e.clave] = (usos[e.clave] || 0) + b.c;
      (ejemplos[e.clave] ||= []).push(b.n);
    }
    res.json({
      ejercicios: CATALOGO.map(e => {
        const v = porClave.get(e.clave);
        return {
          clave: e.clave, nombre: e.nombre, categoria: e.categoria,
          usos: e.clave.startsWith("mov_") ? null : usos[e.clave] || 0,
          bloques: (ejemplos[e.clave] || []).slice(0, 8),
          video: v ? { url: v.url, plataforma: v.plataforma, videoId: v.video_id, actualizado: v.updated_at } : null,
        };
      }),
      sinEjercicio: sinEjercicio.sort((a, b) => b.veces - a.veces),
    });
  } catch (e) { manejarError(res, e, "GET /ejercicios"); }
});

// ─── GET /ejercicios/videos ───────────────────────────────
router.get("/videos", async (req, res) => {
  try {
    const videos = await videosPorClave(prisma);
    const out = {};
    for (const [clave, v] of videos) if (POR_CLAVE.has(clave)) out[clave] = { ...v, nombre: POR_CLAVE.get(clave).nombre };
    res.json(out);
  } catch (e) { manejarError(res, e, "GET /ejercicios/videos"); }
});

// ─── PUT /ejercicios/:clave/video ─────────────────────────
router.put("/:clave/video", authorize("admin"), async (req, res) => {
  try {
    const { clave } = req.params;
    if (!POR_CLAVE.has(clave)) return res.status(404).json({ error: "Ejercicio no encontrado" });
    const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    const v = url.length <= 1000 ? parsearVideo(url) : null;
    if (!v) return res.status(400).json({ error: "Enlace no válido. Usa YouTube (recomendado), Vimeo, Google Drive o un archivo .mp4 por https." });
    await prisma.$executeRawUnsafe(
      `INSERT INTO ejercicio_video (clave, url, plataforma, video_id, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, now(), $5::uuid)
       ON CONFLICT (clave) DO UPDATE SET url = EXCLUDED.url, plataforma = EXCLUDED.plataforma,
         video_id = EXCLUDED.video_id, updated_at = now(), updated_by = EXCLUDED.updated_by`,
      clave, url, v.plataforma, v.videoId, req.user.id
    );
    res.json({ clave, video: { url, ...v } });
  } catch (e) { manejarError(res, e, "PUT /ejercicios/:clave/video"); }
});

// ─── DELETE /ejercicios/:clave/video ──────────────────────
router.delete("/:clave/video", authorize("admin"), async (req, res) => {
  try {
    await prisma.$executeRawUnsafe("DELETE FROM ejercicio_video WHERE clave = $1", req.params.clave);
    res.json({ ok: true });
  } catch (e) { manejarError(res, e, "DELETE /ejercicios/:clave/video"); }
});

module.exports = router;
