/**
 * Registros de sesión y perfil de entrenamiento (tablas registro_sesion y perfil_entrenamiento).
 *
 *   GET  /registros?trimestre=T1                 → mis registros + mi perfil
 *   GET  /registros/escalador/:id?trimestre=T1   → los de un escalador (su entrenador o admin)
 *   PUT  /registros/perfil                        → guardar mi perfil
 *   PUT  /registros/:semana/:sesionNum            → guardar un registro
 *   POST /registros/sincronizar                   → subir lo que haya en el navegador y recibir lo del servidor
 *
 * Conflictos: gana el registro más reciente según datos.ts (momento en que se guardó en el dispositivo).
 * El escalador solo guarda registros de semanas de meses que pagó y que ya empezaron (ver utils/meses.js).
 */
const express = require("express");
const prisma = require("../config/prisma");
const { authenticate } = require("../middleware/auth");
const { puedeVerEscalador } = require("../utils/acceso");
const { accesoEscalador, puedeRegistrar } = require("../utils/meses");

const router = express.Router();
router.use(authenticate);

const RE_CLAVE = /^S(\d{1,2})_(\d{1,2})$/;
const RE_TRIMESTRE = /^T[1-4]$/;
const MAX_BYTES = 50_000;
const MAX_REGISTROS = 300;

function soloEscalador(req, res) {
  if (!req.user.escalador) { res.status(403).json({ error: "Solo para escaladores" }); return false; }
  return true;
}

const trimestreDe = v => (RE_TRIMESTRE.test(v || "") ? v : "T1");

function validarDatos(datos) {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return "datos debe ser un objeto";
  if (JSON.stringify(datos).length > MAX_BYTES) return "registro demasiado grande";
  return null;
}

const fechaDe = datos => {
  const d = new Date(datos?.ts);
  return isNaN(d) ? new Date(0) : d; // registros antiguos sin ts pierden ante cualquier otro
};

const pseDe = datos => {
  const n = Number(datos?.pse);
  return datos?.pse !== "" && datos?.pse != null && n >= 0 && n <= 10 ? Math.round(n) : null;
};

// Inserta o actualiza solo si el registro entrante es más reciente que el guardado.
async function upsertRegistro(escaladorId, trimestre, semana, sesionNum, datos) {
  const r = await prisma.$queryRawUnsafe(
    `INSERT INTO registro_sesion
       (escalador_id, trimestre, semana, sesion_num, datos, pse, sobrecarga, completada, registrado_at, updated_at)
     VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, now())
     ON CONFLICT (escalador_id, trimestre, semana, sesion_num) DO UPDATE SET
       datos = EXCLUDED.datos, pse = EXCLUDED.pse, sobrecarga = EXCLUDED.sobrecarga,
       completada = EXCLUDED.completada, registrado_at = EXCLUDED.registrado_at, updated_at = now()
     WHERE registro_sesion.registrado_at <= EXCLUDED.registrado_at
     RETURNING id`,
    escaladorId, trimestre, semana, sesionNum, JSON.stringify(datos),
    pseDe(datos), datos.sobrecarga === true, datos.completed === true, fechaDe(datos)
  );
  return r.length > 0; // false = el servidor ya tenía una versión más reciente
}

async function leerTodo(escaladorId, trimestre) {
  const [filas, perfil] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT semana, sesion_num, datos FROM registro_sesion
       WHERE escalador_id = $1::uuid AND trimestre = $2`,
      escaladorId, trimestre
    ),
    prisma.$queryRawUnsafe(
      "SELECT datos, updated_at FROM perfil_entrenamiento WHERE escalador_id = $1::uuid",
      escaladorId
    ),
  ]);
  return {
    trimestre,
    registros: Object.fromEntries(filas.map(f => [`${f.semana}_${f.sesion_num}`, f.datos])),
    perfil: perfil[0]?.datos || null,
  };
}

// ─── GET /registros ──────────────────────────────────────
router.get("/", async (req, res) => {
  if (!soloEscalador(req, res)) return;
  try {
    res.json(await leerTodo(req.user.escalador.id, trimestreDe(req.query.trimestre)));
  } catch (err) {
    console.error("[GET /registros]", err.message);
    res.status(500).json({ error: "Error al cargar tus registros" });
  }
});

// ─── GET /registros/escalador/:id ────────────────────────
router.get("/escalador/:id", async (req, res) => {
  const { id } = req.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "id inválido" });
  try {
    if (!(await puedeVerEscalador(req.user, id))) return res.status(403).json({ error: "Acceso denegado" });
    res.json(await leerTodo(id, trimestreDe(req.query.trimestre)));
  } catch (err) {
    console.error("[GET /registros/escalador]", err.message);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── PUT /registros/perfil ───────────────────────────────
router.put("/perfil", async (req, res) => {
  if (!soloEscalador(req, res)) return;
  const { datos } = req.body || {};
  const error = validarDatos(datos);
  if (error) return res.status(400).json({ error });
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO perfil_entrenamiento (escalador_id, datos, updated_at) VALUES ($1::uuid, $2::jsonb, now())
       ON CONFLICT (escalador_id) DO UPDATE SET datos = EXCLUDED.datos, updated_at = now()`,
      req.user.escalador.id, JSON.stringify(datos)
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("[PUT /registros/perfil]", err.message);
    res.status(500).json({ error: "No se pudo guardar el perfil" });
  }
});

// ─── PUT /registros/:semana/:sesionNum ───────────────────
router.put("/:semana/:sesionNum", async (req, res) => {
  if (!soloEscalador(req, res)) return;
  const clave = `${req.params.semana}_${req.params.sesionNum}`;
  const m = clave.match(RE_CLAVE);
  if (!m) return res.status(400).json({ error: "Sesión inválida" });
  const { datos } = req.body || {};
  const error = validarDatos(datos);
  if (error) return res.status(400).json({ error });
  const trimestre = trimestreDe(req.body.trimestre);
  const sesionNum = Number(m[2]);
  try {
    const acc = await accesoEscalador(req.user.escalador.id);
    if (!puedeRegistrar(acc, trimestre, req.params.semana)) {
      return res.status(403).json({ error: "Esa semana no corresponde a un mes pagado de tu ciclo" });
    }
    const guardado = await upsertRegistro(req.user.escalador.id, trimestre, req.params.semana, sesionNum, datos);
    res.json({ ok: true, guardado });
  } catch (err) {
    console.error("[PUT /registros]", err.message);
    res.status(500).json({ error: "No se pudo guardar el registro" });
  }
});

// ─── POST /registros/sincronizar ─────────────────────────
// Sube lo que el navegador tenga (incluye migrar datos antiguos) y devuelve el estado del servidor.
router.post("/sincronizar", async (req, res) => {
  if (!soloEscalador(req, res)) return;
  const { registros = {}, perfil = null } = req.body || {};
  const trimestre = trimestreDe(req.body?.trimestre);
  const entradas = Object.entries(registros).filter(([k, v]) => RE_CLAVE.test(k) && !validarDatos(v));
  if (entradas.length > MAX_REGISTROS) return res.status(400).json({ error: "Demasiados registros" });
  const escaladorId = req.user.escalador.id;
  try {
    // Lo del navegador que no corresponda a un mes pagado se ignora (no se sube).
    const acc = await accesoEscalador(escaladorId);
    let subidos = 0;
    for (const [clave, datos] of entradas) {
      const [, sem, num] = clave.match(RE_CLAVE);
      if (!puedeRegistrar(acc, trimestre, `S${sem}`)) continue;
      if (await upsertRegistro(escaladorId, trimestre, `S${sem}`, Number(num), datos)) subidos++;
    }
    // El perfil local solo se sube si el servidor aún no tiene uno
    if (perfil && !validarDatos(perfil)) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO perfil_entrenamiento (escalador_id, datos) VALUES ($1::uuid, $2::jsonb)
         ON CONFLICT (escalador_id) DO NOTHING`,
        escaladorId, JSON.stringify(perfil)
      );
    }
    res.json({ ...(await leerTodo(escaladorId, trimestre)), subidos });
  } catch (err) {
    console.error("[POST /registros/sincronizar]", err.message);
    res.status(500).json({ error: "No se pudo sincronizar" });
  }
});

module.exports = router;
