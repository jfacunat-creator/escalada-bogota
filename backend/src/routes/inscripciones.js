const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db, pool } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

// ─── Precios mensuales de referencia (misma tabla que cohortes.js) ────────────
const PRECIO_MENSUAL = {
  iniciacion: { autonomo: 120_000, acompanado: 350_000 },
  intermedio: { autonomo: 150_000, acompanado: 450_000 },
  avanzado:   { autonomo: 180_000, acompanado: 600_000 },
};

// ─── GET /inscripciones ──────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { cohorteId, escaladorId, estado } = req.query;
    let sql = `
      SELECT i.*, e.nombre, e.apellido, e.estado as esc_estado, e.rango_etario,
             u.email,
             p.nombre as programa, ci.codigo as ciclo, m.nombre as muro,
             co.horario, co.modalidad,
             ent.nombre as entrenador_nombre,
             (SELECT COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado='pagado'),0) FROM pago pa WHERE pa.inscripcion_id=i.id) as total_pagado,
             (SELECT COUNT(*) FROM pago pa WHERE pa.inscripcion_id=i.id AND pa.estado='pendiente') as pagos_pendientes
      FROM inscripcion i
      JOIN escalador e ON i.escalador_id = e.id
      JOIN usuario u ON e.usuario_id = u.id
      JOIN cohorte co ON i.cohorte_id = co.id
      JOIN programa p ON co.programa_id = p.id
      JOIN ciclo ci ON co.ciclo_id = ci.id
      JOIN muro_aliado m ON co.muro_id = m.id
      JOIN entrenador ent ON co.entrenador_id = ent.id
      WHERE 1=1
    `;
    const params = [];
    if (cohorteId) { params.push(cohorteId); sql += ` AND i.cohorte_id = $${params.length}`; }
    if (escaladorId) { params.push(escaladorId); sql += ` AND i.escalador_id = $${params.length}`; }
    if (estado) { params.push(estado); sql += ` AND i.estado = $${params.length}`; }
    if (req.user.rol === "escalador") { params.push(req.user.escalador.id); sql += ` AND i.escalador_id = $${params.length}`; }
    if (req.user.rol === "entrenador") { params.push(req.user.entrenador.id); sql += ` AND co.entrenador_id = $${params.length}`; }
    sql += " ORDER BY i.fecha_inscripcion DESC";

    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error:", err); res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /inscripciones — Inscribir escalador (admin/entrenador) ─────────
router.post("/", authorize("admin", "entrenador"), [
  body("escaladorId").isUUID(),
  body("cohorteId").isUUID(),
  body("precioCiclo").isFloat({ min: 0 }),
  body("descuentoAplicado").optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { escaladorId, cohorteId, precioCiclo, descuentoAplicado } = req.body;

    const coh = await db("SELECT estado, cupo_maximo, inscritos_actual, programa_id FROM cohorte WHERE id=$1", [cohorteId]);
    if (coh.rows.length === 0) return res.status(404).json({ error: "Cohorte no encontrada" });
    if (coh.rows[0].estado !== "abierta") return res.status(400).json({ error: "La cohorte no está abierta para inscripciones" });

    const inscritos = await db("SELECT COUNT(*) as n FROM inscripcion WHERE cohorte_id=$1 AND estado='activa'", [cohorteId]);
    if (parseInt(inscritos.rows[0].n) >= coh.rows[0].cupo_maximo) {
      return res.status(400).json({ error: "Cohorte sin cupos disponibles" });
    }

    const dup = await db("SELECT id FROM inscripcion WHERE escalador_id=$1 AND cohorte_id=$2", [escaladorId, cohorteId]);
    if (dup.rows.length > 0) return res.status(409).json({ error: "Escalador ya inscrito en esta cohorte" });

    const esc = await db("SELECT rango_etario FROM escalador WHERE id=$1", [escaladorId]);
    const prog = await db("SELECT poblacion, rango_etario_menor FROM programa WHERE id=$1", [coh.rows[0].programa_id]);
    if (prog.rows[0].poblacion === "menor" && esc.rows[0].rango_etario === "adulto") {
      return res.status(400).json({ error: "Un adulto no puede inscribirse en un programa de menores" });
    }
    if (prog.rows[0].poblacion === "adulto" && esc.rows[0].rango_etario !== "adulto") {
      return res.status(400).json({ error: "Un menor no puede inscribirse en un programa de adultos" });
    }

    const result = await db(
      `INSERT INTO inscripcion (escalador_id, cohorte_id, precio_ciclo, descuento_aplicado)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [escaladorId, cohorteId, precioCiclo, descuentoAplicado || null]
    );

    await db("UPDATE cohorte SET inscritos_actual = inscritos_actual + 1 WHERE id=$1", [cohorteId]);

    await db(
      `INSERT INTO pago (inscripcion_id, monto, estado, fecha_vencimiento)
       VALUES ($1, $2, 'pendiente', CURRENT_DATE + INTERVAL '15 days')`,
      [result.rows[0].id, precioCiclo]
    );

    res.status(201).json({ message: "Inscripción creada con pago pendiente", inscripcion: result.rows[0] });
  } catch (err) {
    console.error("Error:", err); res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /inscripciones/autoservicio — Auto-inscripción del escalador ────
// Transacción completa: SELECT FOR UPDATE → validaciones → INSERT → UPDATE.
// Previene condición de carrera cuando dos escaladores inscriben simultáneamente.
router.post(
  "/autoservicio",
  authorize("escalador"),
  [body("cohorteId").isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const client = await pool.connect();
    try {
      const escaladorId = req.user.escalador.id;
      const { cohorteId } = req.body;

      await client.query("BEGIN");

      // Bloqueo de fila: nadie más puede modificar esta cohorte hasta COMMIT
      const coh = await client.query(
        `SELECT c.id, c.estado, c.cupo_maximo, c.inscritos_actual, c.modalidad,
                p.nivel, p.poblacion
         FROM cohorte c JOIN programa p ON c.programa_id = p.id
         WHERE c.id = $1
         FOR UPDATE OF c`,
        [cohorteId]
      );
      if (coh.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Cohorte no encontrada" });
      }

      const cohorte = coh.rows[0];
      if (cohorte.estado !== "abierta") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "La cohorte no está abierta para inscripciones" });
      }
      if (cohorte.inscritos_actual >= cohorte.cupo_maximo) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Cohorte sin cupos disponibles" });
      }
      if (cohorte.poblacion !== "adulto") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Solo puedes inscribirte en programas adultos" });
      }

      // Máximo una cohorte activa simultánea por escalador
      const activas = await client.query(
        `SELECT COUNT(*) AS n FROM inscripcion
         WHERE escalador_id = $1 AND estado = 'activa'`,
        [escaladorId]
      );
      if (parseInt(activas.rows[0].n) > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Ya tienes una inscripción activa. Finaliza o cancela el ciclo actual para inscribirte en otro.",
        });
      }

      // Precio
      const nivel     = cohorte.nivel;
      const modalidad = cohorte.modalidad;
      const precioMensual = PRECIO_MENSUAL[nivel]?.[modalidad] ?? 150_000;
      const precioCiclo   = precioMensual * 3;

      // Crear inscripción
      const ins = await client.query(
        `INSERT INTO inscripcion (escalador_id, cohorte_id, precio_ciclo)
         VALUES ($1, $2, $3) RETURNING *`,
        [escaladorId, cohorteId, precioCiclo]
      );

      // Actualizar contador
      await client.query(
        "UPDATE cohorte SET inscritos_actual = inscritos_actual + 1 WHERE id = $1",
        [cohorteId]
      );

      // Primer pago pendiente (mensualidad 1)
      await client.query(
        `INSERT INTO pago (inscripcion_id, monto, estado, fecha_vencimiento)
         VALUES ($1, $2, 'pendiente', CURRENT_DATE + INTERVAL '7 days')`,
        [ins.rows[0].id, precioMensual]
      );

      await client.query("COMMIT");

      res.status(201).json({
        message: "Inscripción exitosa. Se generó tu primer pago pendiente.",
        inscripcion: ins.rows[0],
      });
    } catch (err) {
      await client.query("ROLLBACK");
      if (err.code === "23505")
        return res.status(409).json({ error: "Ya estás inscrito en esta cohorte" });
      console.error("Error POST /inscripciones/autoservicio:", err);
      res.status(500).json({ error: "Error interno" });
    } finally {
      client.release();
    }
  }
);

// ─── PATCH /inscripciones/:id/estado — Cambiar estado ────
router.patch("/:id/estado", authorize("admin"), [
  body("estado").isIn(["activa", "congelada", "cancelada", "completada"]),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { estado } = req.body;
    const insc = await db("SELECT estado as old, cohorte_id FROM inscripcion WHERE id=$1", [req.params.id]);
    if (insc.rows.length === 0) return res.status(404).json({ error: "Inscripción no encontrada" });

    await db("UPDATE inscripcion SET estado=$1 WHERE id=$2", [estado, req.params.id]);

    const old = insc.rows[0].old;
    if (old === "activa" && estado !== "activa") {
      await db("UPDATE cohorte SET inscritos_actual = GREATEST(inscritos_actual - 1, 0) WHERE id=$1", [insc.rows[0].cohorte_id]);
    } else if (old !== "activa" && estado === "activa") {
      await db("UPDATE cohorte SET inscritos_actual = inscritos_actual + 1 WHERE id=$1", [insc.rows[0].cohorte_id]);
    }

    res.json({ message: `Estado cambiado a ${estado}` });
  } catch (err) {
    console.error("Error:", err); res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
