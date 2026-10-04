const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { authenticate } = require("../middleware/auth");
const { puedeVerEscalador } = require("../utils/acceso");

async function sesionesAI(escaladorId, trimestre) {
  return prisma.$queryRawUnsafe(
    `SELECT semana, sesion_num, nombre, bloques, generado_at, revisado
     FROM plan_ai_sesion
     WHERE escalador_id = $1::uuid AND trimestre = $2
     ORDER BY semana, sesion_num`,
    escaladorId, trimestre
  ).catch(err => { console.error("[plan_ai_sesion]", err.message); return []; });
}

// Superpone las sesiones AI sobre el plan base: reemplaza nombre y bloques,
// conserva la estructura (PSE objetivo, tipo, calentamiento, avisos) del plan base.
function fusionarPlan(semanas, ai) {
  if (!ai.length) return semanas;
  const porClave = new Map(ai.map(a => [`${a.semana}_${a.sesion_num}`, a]));
  return semanas.map(w => ({
    ...w,
    sesiones: w.sesiones.map(s => {
      const a = porClave.get(`${w.id}_${s.num}`);
      if (!a || !Array.isArray(a.bloques)) return s;
      return { ...s, name: a.nombre || s.name, blocks: a.bloques, ai: true, aiRevisado: !!a.revisado };
    }),
  }));
}

router.get("/my", authenticate, async (req, res) => {
  if (req.user.rol !== "escalador") {
    return res.status(403).json({ error: "Solo escaladores tienen planes de entrenamiento" });
  }

  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT
         e.nombre,
         e.estado,
         p.nivel,
         c2.trimestre
       FROM escalador e
       LEFT JOIN inscripcion  i  ON i.escalador_id = e.id  AND i.estado = 'activa'
       LEFT JOIN grupo      c  ON c.id = i.grupo_id
       LEFT JOIN ciclo        c2 ON c2.id = c.ciclo_id
       LEFT JOIN programa     p  ON p.id = c.programa_id
       WHERE e.usuario_id = $1
       ORDER BY i.created_at DESC
       LIMIT 1`,
      req.user.id
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Perfil de escalador no encontrado" });
    }

    const esc = rows[0];

    if (esc.estado !== "activo") {
      return res.status(403).json({
        error: "Acceso inactivo",
        estado: esc.estado,
        nombre: esc.nombre,
      });
    }

    if (!esc.trimestre || !esc.nivel) {
      return res.status(404).json({
        error: "Sin inscripción activa. Habla con tu entrenador.",
        nombre: esc.nombre,
      });
    }

    const trimestre = `T${esc.trimestre}`;
    const nivel     = esc.nivel;

    const planRes = await prisma.$queryRawUnsafe(
      `SELECT trimestre, nivel, semanas
       FROM plan_contenido
       WHERE trimestre = $1 AND nivel = $2`,
      trimestre, nivel
    );

    if (!planRes.length) {
      return res.status(404).json({
        error: `Plan ${trimestre} ${nivel} no encontrado en la base de datos`,
      });
    }

    const testSesionesRes = await prisma.$queryRawUnsafe(
      `SELECT s.id, s.tipo, s.fecha, s.numero_sesion
       FROM sesion s
       JOIN inscripcion i ON i.grupo_id = s.grupo_id AND i.escalador_id = (
         SELECT id FROM escalador WHERE usuario_id = $1 LIMIT 1
       ) AND i.estado = 'activa'
       WHERE s.tipo = 'test'
       ORDER BY s.numero_sesion ASC`,
      req.user.id
    ).catch(() => []);

    const testSesiones = testSesionesRes.map((s, idx) => ({
      id:         s.id,
      tipo:       idx === 0 ? 'entrada' : 'salida',
      fecha:      s.fecha,
      semanaCode: idx === 0 ? 'S0' : 'S12',
    }));

    const ai = await sesionesAI(req.user.escalador.id, trimestre);
    return res.json({
      trimestre,
      nivel,
      nombre: esc.nombre,
      semanas: fusionarPlan(planRes[0].semanas, ai),
      fuente: ai.length ? "ai" : "base",
      aiSesiones: ai.length,
      aiGeneradoAt: ai.reduce((max, a) => (!max || a.generado_at > max ? a.generado_at : max), null),
      testSesiones,
    });

  } catch (err) {
    console.error("[GET /api/plan/my]", err.message);
    return res.status(500).json({ error: "Error al cargar el plan" });
  }
});

// ─── GET /plan/contenido?nivel=xxx ───────────────────────
const { authorize } = require("../middleware/auth");
router.get("/contenido", authenticate, authorize("admin"), async (req, res) => {
  const { nivel } = req.query;
  if (!nivel) return res.status(400).json({ error: "nivel requerido" });
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT trimestre, nivel, semanas FROM plan_contenido WHERE nivel = $1 ORDER BY trimestre LIMIT 1`,
      nivel
    );
    if (!rows.length) return res.status(404).json({ error: "Plan no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error("[GET /api/plan/contenido]", err.message);
    res.status(500).json({ error: "Error al cargar el plan" });
  }
});

// ─── GET /plan/ai/:escaladorId ───────────────────────────
// Sesiones personalizadas por AI (sin fusionar). Para el escalador, su entrenador o admin.
router.get("/ai/:escaladorId", authenticate, async (req, res) => {
  const { escaladorId } = req.params;
  const { trimestre = "T1" } = req.query;
  if (!/^[0-9a-f-]{36}$/i.test(escaladorId)) return res.status(400).json({ error: "escaladorId inválido" });
  try {
    if (!(await puedeVerEscalador(req.user, escaladorId))) {
      return res.status(403).json({ error: "Acceso denegado" });
    }
    const sesiones = await sesionesAI(escaladorId, trimestre);
    res.json({ escaladorId, trimestre, sesiones });
  } catch (err) {
    console.error("[GET /api/plan/ai]", err.message);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
