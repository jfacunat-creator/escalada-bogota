const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /evaluaciones ───────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { escaladorId, cohorteId, tipo } = req.query;

    if (req.user.rol === "escalador" && escaladorId !== req.user.escalador.id) {
      return res.status(403).json({ error: "Solo puedes ver tus propias evaluaciones" });
    }

    let sql = `
      SELECT ev.*, p.nombre as programa_nombre, ci.codigo as ciclo_codigo,
             g.horario, m.nombre as muro_nombre,
             (SELECT COUNT(*) FROM resultado_test rt WHERE rt.evaluacion_id = ev.id) as num_resultados
      FROM evaluacion ev
      JOIN grupo g ON ev.grupo_id = g.id
      JOIN programa p ON g.programa_id = p.id
      JOIN ciclo ci ON g.ciclo_id = ci.id
      JOIN muro_aliado m ON g.muro_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (escaladorId) { params.push(escaladorId); sql += ` AND ev.escalador_id = $${params.length}`; }
    if (cohorteId) { params.push(cohorteId); sql += ` AND ev.grupo_id = $${params.length}`; }
    if (tipo) { params.push(tipo); sql += ` AND ev.tipo = $${params.length}`; }

    if (req.user.rol === "entrenador") {
      params.push(req.user.entrenador.id);
      sql += ` AND g.entrenador_id = $${params.length}`;
    }

    sql += " ORDER BY ev.fecha DESC";
    const result = await prisma.$queryRawUnsafe(sql, ...params);
    res.json(result);
  } catch (err) {
    console.error("Error listando evaluaciones:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /evaluaciones ──────────────────────────────────
router.post("/", authorize("entrenador", "admin"), [
  body("escaladorId").isUUID(),
  body("cohorteId").isUUID(),
  body("tipo").isIn(["entrada", "salida"]),
  body("fecha").isISO8601(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { escaladorId, cohorteId, tipo, fecha, notas } = req.body;
    const result = await prisma.$queryRawUnsafe(
      `INSERT INTO evaluacion (escalador_id, grupo_id, tipo, fecha, notas)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      escaladorId, cohorteId, tipo, fecha, notas || null
    );
    res.status(201).json(result[0]);
  } catch (err) {
    console.error("Error creando evaluación:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /evaluaciones/mi-test ──────────────────────────
router.post("/mi-test", async (req, res) => {
  if (!req.user.escalador) return res.status(403).json({ error: "Solo para escaladores" });

  try {
    const { sesionId, resultados } = req.body;
    if (!sesionId || !Array.isArray(resultados) || resultados.length === 0) {
      return res.status(400).json({ error: "sesionId y resultados son requeridos" });
    }

    const sesion = await prisma.$queryRawUnsafe(
      `SELECT s.id, s.grupo_id, s.tipo, s.fecha, s.numero_sesion,
              (SELECT COUNT(*) FROM sesion st WHERE st.grupo_id = s.grupo_id AND st.tipo = 'test' AND st.numero_sesion < s.numero_sesion) as tests_previos
       FROM sesion s
       JOIN inscripcion i ON i.grupo_id = s.grupo_id AND i.escalador_id = $1 AND i.estado = 'activa'
       WHERE s.id = $2`,
      req.user.escalador.id, sesionId
    );
    if (!sesion.length) return res.status(404).json({ error: "Sesión no encontrada o sin acceso" });
    if (sesion[0].tipo !== 'test') return res.status(400).json({ error: "Solo se pueden registrar resultados en sesiones de tipo test" });

    const { grupo_id, fecha, numero_sesion, tests_previos } = sesion[0];
    const tipo = Number(tests_previos) === 0 ? 'entrada' : 'salida';

    const existente = await prisma.$queryRawUnsafe(
      "SELECT id FROM evaluacion WHERE escalador_id=$1 AND grupo_id=$2 AND fecha=$3 AND tipo=$4",
      req.user.escalador.id, grupo_id, fecha, tipo
    );
    if (existente.length) {
      return res.status(409).json({ error: "Ya existe una evaluación de este tipo para esta fecha. Contacta al entrenador para editarla." });
    }

    const ev = await prisma.$queryRawUnsafe(
      `INSERT INTO evaluacion (escalador_id, grupo_id, tipo, fecha, estado)
       VALUES ($1, $2, $3, $4, 'realizada') RETURNING id`,
      req.user.escalador.id, grupo_id, tipo, fecha
    );
    const evalId = ev[0].id;

    for (const r of resultados) {
      if (!r.metrica || r.valor === undefined || r.valor === null || r.valor === '') continue;
      const sem = r.semaforo && ['verde','amarillo','rojo'].includes(r.semaforo) ? r.semaforo : 'verde';
      await prisma.$executeRawUnsafe(
        "INSERT INTO resultado_test (evaluacion_id, metrica, valor, unidad, semaforo) VALUES ($1,$2,$3,$4,$5)",
        evalId, r.metrica, parseFloat(r.valor), r.unidad, sem
      );
    }

    res.status(201).json({ id: evalId, tipo, fecha, message: `Test de ${tipo} registrado` });
  } catch (err) {
    console.error("Error registrando test del escalador:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /evaluaciones/progreso/:escaladorId ─────────────
router.get("/progreso/:escaladorId", async (req, res) => {
  try {
    const { escaladorId } = req.params;

    if (req.user.rol === "escalador" && req.user.escalador.id !== escaladorId) {
      return res.status(403).json({ error: "Solo puedes ver tu propio progreso" });
    }

    const result = await prisma.$queryRawUnsafe(
      `SELECT rt.metrica, rt.valor, rt.unidad, rt.semaforo, rt.percentil,
              ev.tipo as eval_tipo, ev.fecha as eval_fecha,
              ci.codigo as ciclo, ci.trimestre, ci.anio,
              p.nombre as programa
       FROM resultado_test rt
       JOIN evaluacion ev ON rt.evaluacion_id = ev.id
       JOIN grupo g ON ev.grupo_id = g.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       JOIN programa p ON g.programa_id = p.id
       WHERE ev.escalador_id = $1
         AND ev.estado = 'realizada'
       ORDER BY ci.fecha_inicio ASC, ev.tipo ASC`,
      escaladorId
    );

    if (result.length === 0) {
      return res.json({ escaladorId, metricas: {}, evaluaciones: [], hayDatos: false });
    }

    const metricas = {};
    const evaluaciones = [];
    const evalSet = new Set();

    for (const row of result) {
      if (!metricas[row.metrica]) {
        metricas[row.metrica] = { unidad: row.unidad, puntos: [] };
      }
      metricas[row.metrica].puntos.push({
        ciclo: row.ciclo,
        tipo: row.eval_tipo,
        valor: parseFloat(row.valor),
        semaforo: row.semaforo,
        fecha: row.eval_fecha,
        percentil: row.percentil,
      });

      const evalKey = `${row.ciclo}-${row.eval_tipo}`;
      if (!evalSet.has(evalKey)) {
        evalSet.add(evalKey);
        evaluaciones.push({ ciclo: row.ciclo, tipo: row.eval_tipo, fecha: row.eval_fecha, programa: row.programa });
      }
    }

    for (const [, data] of Object.entries(metricas)) {
      const puntos = data.puntos;
      if (puntos.length >= 2) {
        const primero = puntos[0].valor;
        const ultimo = puntos[puntos.length - 1].valor;
        const cambio = ultimo - primero;
        const cambioPct = primero !== 0 ? Math.round((cambio / primero) * 100) : 0;
        data.tendencia = { cambio, cambioPct, mejoro: cambio > 0 };
      }
    }

    res.json({ escaladorId, metricas, evaluaciones, hayDatos: true, totalPuntos: result.length });
  } catch (err) {
    console.error("Error obteniendo progreso:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /evaluaciones/comparar/:cohorteId ───────────────
router.get("/comparar/:cohorteId", authorize("entrenador", "admin"), async (req, res) => {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT e.nombre, e.apellido,
              rt.metrica, rt.valor, rt.unidad, rt.semaforo,
              ev.tipo as eval_tipo
       FROM resultado_test rt
       JOIN evaluacion ev ON rt.evaluacion_id = ev.id
       JOIN escalador e ON ev.escalador_id = e.id
       WHERE ev.grupo_id = $1 AND ev.estado = 'realizada'
       ORDER BY e.nombre, rt.metrica, ev.tipo`,
      req.params.cohorteId
    );

    const escaladores = {};
    for (const row of result) {
      const key = `${row.nombre} ${row.apellido}`;
      if (!escaladores[key]) escaladores[key] = {};
      if (!escaladores[key][row.metrica]) escaladores[key][row.metrica] = {};
      escaladores[key][row.metrica][row.eval_tipo] = {
        valor: parseFloat(row.valor),
        unidad: row.unidad,
        semaforo: row.semaforo,
      };
    }

    res.json(escaladores);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /evaluaciones/:id ───────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const ev = await prisma.$queryRawUnsafe(
      `SELECT ev.*, p.nombre as programa_nombre, ci.codigo as ciclo_codigo,
              e.nombre as escalador_nombre, e.apellido as escalador_apellido
       FROM evaluacion ev
       JOIN grupo g ON ev.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       JOIN escalador e ON ev.escalador_id = e.id
       WHERE ev.id = $1`,
      req.params.id
    );
    if (ev.length === 0) return res.status(404).json({ error: "Evaluación no encontrada" });

    const resultados = await prisma.$queryRawUnsafe(
      "SELECT * FROM resultado_test WHERE evaluacion_id = $1 ORDER BY metrica",
      req.params.id
    );

    res.json({ ...ev[0], resultados });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /evaluaciones/:id/resultados ───────────────────
router.post("/:id/resultados", authorize("entrenador", "admin"), [
  body("resultados").isArray({ min: 1 }),
  body("resultados.*.metrica").isString().trim().notEmpty(),
  body("resultados.*.valor").isFloat(),
  body("resultados.*.unidad").isString().trim().notEmpty(),
  body("resultados.*.semaforo").isIn(["verde", "amarillo", "rojo"]),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const evalId = req.params.id;
    const { resultados } = req.body;

    const ev = await prisma.$queryRawUnsafe("SELECT id FROM evaluacion WHERE id = $1", evalId);
    if (ev.length === 0) return res.status(404).json({ error: "Evaluación no encontrada" });

    let insertados = 0;
    for (const r of resultados) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO resultado_test (evaluacion_id, metrica, valor, unidad, semaforo, percentil)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        evalId, r.metrica, r.valor, r.unidad, r.semaforo, r.percentil || null
      );
      insertados++;
    }

    await prisma.$executeRawUnsafe("UPDATE evaluacion SET estado = 'realizada' WHERE id = $1", evalId);

    res.status(201).json({ message: `${insertados} resultados registrados`, insertados });
  } catch (err) {
    console.error("Error registrando resultados:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
