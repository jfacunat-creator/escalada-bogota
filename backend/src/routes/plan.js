const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { authenticate } = require("../middleware/auth");
const { puedeVerEscalador } = require("../utils/acceso");
const { aplicarAjustes, leerAprobados } = require("../utils/ajustesAI");
const { accesoEscalador, mesDeSemana, SEMANAS_MES } = require("../utils/meses");
const { fichaT1Avanzado } = require("../plan/fichasT1Avanzado");

// Ajustes AI aprobados por un entrenador o admin (los pendientes nunca llegan al escalador).
async function ajustesAprobados(escaladorId, trimestre) {
  return leerAprobados(escaladorId, trimestre)
    .catch(err => { console.error("[plan_ai_ajuste]", err.message); return []; });
}

// Semana de un mes ya cerrado: solo lo necesario para mostrar los registros del escalador
// (nombre, tipo y PSE objetivo de cada sesión). Sin bloques, ejercicios ni parámetros.
function esqueletoSemana(w) {
  return {
    id: w.id, n: w.n, ph: w.ph, pse: w.pse, s: w.s, historica: true,
    sesiones: (w.sesiones || []).map(s => ({ num: s.num, name: s.name, type: s.type, pse: s.pse })),
  };
}

// Fichas de ejecución (hoy solo T1 Avanzado), adjuntas a cada bloque de las semanas visibles.
function conFichas(w, trimestre, nivel) {
  if (trimestre !== "T1" || nivel !== "avanzado") return w;
  return {
    ...w,
    sesiones: (w.sesiones || []).map(s => ({
      ...s,
      blocks: (s.blocks || []).map(b => {
        const ficha = fichaT1Avanzado(w.id, s.num, b.n);
        return ficha ? { ...b, ficha } : b;
      }),
    })),
  };
}

// ─── GET /plan/my ─────────────────────────────────────────
// El escalador paga por mes: recibe el contenido completo SOLO de las semanas del mes en curso
// (si está pagado), el esqueleto de las semanas de meses pagados anteriores (para su historial)
// y nada de los meses futuros. acceso: completo | mes_no_pagado | ciclo_terminado.
router.get("/my", authenticate, async (req, res) => {
  if (req.user.rol !== "escalador" || !req.user.escalador) {
    return res.status(403).json({ error: "Solo escaladores tienen planes de entrenamiento" });
  }
  const { nombre, estado } = req.user.escalador;

  try {
    if (estado !== "activo") {
      return res.status(403).json({ error: "Acceso inactivo", estado, nombre });
    }
    const acc = await accesoEscalador(req.user.escalador.id);
    if (!acc) {
      return res.status(404).json({ error: "Sin inscripción activa. Habla con tu entrenador.", nombre });
    }
    const { trimestre, nivel, mesVigente } = acc;

    const planRes = await prisma.$queryRawUnsafe(
      `SELECT semanas FROM plan_contenido WHERE trimestre = $1 AND nivel = $2`, trimestre, nivel
    );
    if (!planRes.length) {
      return res.status(404).json({ error: `Plan ${trimestre} ${nivel} no encontrado en la base de datos` });
    }

    const visibles = new Set(acc.acceso === "completo" ? SEMANAS_MES[mesVigente] : []);
    const ajustes = visibles.size
      ? (await ajustesAprobados(req.user.escalador.id, trimestre)).filter(a => visibles.has(a.semana))
      : [];
    const semanas = aplicarAjustes(planRes[0].semanas, ajustes)
      .map(w => {
        const mes = mesDeSemana(w.id);
        if (visibles.has(w.id)) return { ...conFichas(w, trimestre, nivel), mes };
        return acc.conHistorial.has(mes) ? { ...esqueletoSemana(w), mes } : null;
      })
      .filter(Boolean);

    // Sesiones de test del grupo (S0 entrada · S12 salida), solo si su semana es visible.
    const tests = await prisma.$queryRawUnsafe(
      `SELECT s.id, s.fecha FROM sesion s WHERE s.grupo_id = $1::uuid AND s.tipo = 'test' ORDER BY s.numero_sesion`,
      acc.grupoId
    ).catch(() => []);
    const testSesiones = tests
      .map((s, idx) => ({ id: s.id, tipo: idx === 0 ? "entrada" : "salida", fecha: s.fecha, semanaCode: idx === 0 ? "S0" : "S12" }))
      .filter(t => visibles.has(t.semanaCode));

    return res.json({
      trimestre,
      nivel,
      nombre,
      cicloCodigo: acc.cicloCodigo,
      acceso: acc.acceso,
      mesVigente,
      meses: acc.meses,
      semanasTotales: planRes[0].semanas.length,
      // Carga planificada (PSE) de las 13 semanas del plan base, para el mapa del ciclo. Sin contenido de sesiones.
      curva: planRes[0].semanas.map(w => ({ id: w.id, pse: w.pse ?? null })),
      semanas,
      fuente: ajustes.length ? "ai" : "base",
      aiSesiones: new Set(ajustes.map(a => `${a.semana}_${a.sesion_num}`)).size,
      aiGeneradoAt: ajustes.reduce((max, a) => (!max || a.revisado_at > max ? a.revisado_at : max), null),
      testSesiones,
    });
  } catch (err) {
    console.error("[GET /api/plan/my]", err.message);
    return res.status(500).json({ error: "Error al cargar el plan" });
  }
});

// ─── GET /plan/contenido?nivel=xxx ───────────────────────
// Plan base completo del nivel: los 4 mesociclos (T1–T4) de 13 semanas cada uno.
const { authorize } = require("../middleware/auth");
router.get("/contenido", authenticate, authorize("admin", "entrenador"), async (req, res) => {
  const { nivel } = req.query;
  if (!nivel) return res.status(400).json({ error: "nivel requerido" });
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT trimestre, semanas FROM plan_contenido WHERE nivel = $1 ORDER BY trimestre`,
      nivel
    );
    if (!rows.length) return res.status(404).json({ error: "Plan no encontrado" });
    res.json({ nivel, trimestres: rows });
  } catch (err) {
    console.error("[GET /api/plan/contenido]", err.message);
    res.status(500).json({ error: "Error al cargar el plan" });
  }
});

// ─── GET /plan/ai/:escaladorId ───────────────────────────
// Ajustes AI del escalador en todos los estados. Para el escalador, su entrenador o admin.
router.get("/ai/:escaladorId", authenticate, async (req, res) => {
  const { escaladorId } = req.params;
  const { trimestre = "T1" } = req.query;
  if (!/^[0-9a-f-]{36}$/i.test(escaladorId)) return res.status(400).json({ error: "escaladorId inválido" });
  try {
    if (!(await puedeVerEscalador(req.user, escaladorId))) {
      return res.status(403).json({ error: "Acceso denegado" });
    }
    let ajustes = await prisma.$queryRawUnsafe(
      `SELECT id, semana, sesion_num, bloque, etiqueta, valor_base, valor_propuesto, motivo, fuente, pagina,
              estado, origen, created_at, revisado_at
       FROM plan_ai_ajuste WHERE escalador_id = $1::uuid AND trimestre = $2
         AND ($3::boolean OR estado = 'aprobado')
       ORDER BY created_at DESC`,
      escaladorId, trimestre, req.user.rol !== "escalador"
    );
    // El escalador solo ve los ajustes de las semanas del mes que tiene pagado y en curso.
    if (req.user.rol === "escalador") {
      const acc = await accesoEscalador(escaladorId);
      const visibles = new Set(acc?.acceso === "completo" && acc.trimestre === trimestre ? SEMANAS_MES[acc.mesVigente] : []);
      ajustes = ajustes.filter(a => visibles.has(a.semana));
    }
    res.json({ escaladorId, trimestre, ajustes });
  } catch (err) {
    console.error("[GET /api/plan/ai]", err.message);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
