const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── GET /evaluaciones?escaladorId=x&cohorteId=y ─────────
router.get("/", async (req, res) => {
  try {
    const { escaladorId, cohorteId, tipo } = req.query;

    if (req.user.rol === "escalador" && escaladorId !== req.user.escalador.id) {
      return res.status(403).json({ error: "Solo puedes ver tus propias evaluaciones" });
    }

    let sql = `
      SELECT ev.*, p.nombre as programa_nombre, ci.codigo as ciclo_codigo,
             co.horario, m.nombre as muro_nombre,
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
    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error listando evaluaciones:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /evaluaciones — Crear evaluación ──────────────
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
    const result = await db(
      `INSERT INTO evaluacion (escalador_id, grupo_id, tipo, fecha, notas)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [escaladorId, cohorteId, tipo, fecha, notas || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creando evaluación:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /evaluaciones/progreso/:escaladorId — CURVA DE PROGRESO ──
router.get("/progreso/:escaladorId", async (req, res) => {
  try {
    const { escaladorId } = req.params;

    if (req.user.rol === "escalador" && req.user.escalador.id !== escaladorId) {
      return res.status(403).json({ error: "Solo puedes ver tu propio progreso" });
    }

    const result = await db(
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
      [escaladorId]
    );

    if (result.rows.length === 0) {
      return res.json({ escaladorId, metricas: {}, evaluaciones: [], hayDatos: false });
    }

    const metricas = {};
    const evaluaciones = [];
    const evalSet = new Set();

    for (const row of result.rows) {
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

    res.json({ escaladorId, metricas, evaluaciones, hayDatos: true, totalPuntos: result.rows.length });
  } catch (err) {
    console.error("Error obteniendo progreso:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /evaluaciones/comparar/:cohorteId — Comparación de grupo
router.get("/comparar/:cohorteId", authorize("entrenador", "admin"), async (req, res) => {
  try {
    const result = await db(
      `SELECT e.nombre, e.apellido,
              rt.metrica, rt.valor, rt.unidad, rt.semaforo,
              ev.tipo as eval_tipo
       FROM resultado_test rt
       JOIN evaluacion ev ON rt.evaluacion_id = ev.id
       JOIN escalador e ON ev.escalador_id = e.id
       WHERE ev.grupo_id = $1 AND ev.estado = 'realizada'
       ORDER BY e.nombre, rt.metrica, ev.tipo`,
      [req.params.cohorteId]
    );

    const escaladores = {};
    for (const row of result.rows) {
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

// ─── GET /evaluaciones/:id — Detalle con resultados ──────
router.get("/:id", async (req, res) => {
  try {
    const ev = await db(
      `SELECT ev.*, p.nombre as programa_nombre, ci.codigo as ciclo_codigo,
              e.nombre as escalador_nombre, e.apellido as escalador_apellido
       FROM evaluacion ev
       JOIN grupo g ON ev.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       JOIN escalador e ON ev.escalador_id = e.id
       WHERE ev.id = $1`,
      [req.params.id]
    );
    if (ev.rows.length === 0) return res.status(404).json({ error: "Evaluación no encontrada" });

    const resultados = await db(
      "SELECT * FROM resultado_test WHERE evaluacion_id = $1 ORDER BY metrica",
      [req.params.id]
    );

    res.json({ ...ev.rows[0], resultados: resultados.rows });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /evaluaciones/:id/resultados — Registrar resultados batch
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

    // Verificar que la evaluación existe
    const ev = await db("SELECT id FROM evaluacion WHERE id = $1", [evalId]);
    if (ev.rows.length === 0) return res.status(404).json({ error: "Evaluación no encontrada" });

    let insertados = 0;
    for (const r of resultados) {
      await db(
        `INSERT INTO resultado_test (evaluacion_id, metrica, valor, unidad, semaforo, percentil)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [evalId, r.metrica, r.valor, r.unidad, r.semaforo, r.percentil || null]
      );
      insertados++;
    }

    // Marcar evaluación como realizada
    await db("UPDATE evaluacion SET estado = 'realizada' WHERE id = $1", [evalId]);

    res.status(201).json({ message: `${insertados} resultados registrados`, insertados });
  } catch (err) {
    console.error("Error registrando resultados:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
