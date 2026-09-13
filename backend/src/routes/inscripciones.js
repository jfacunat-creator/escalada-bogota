const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

const PRECIO_MENSUAL = {
  iniciacion: { autonomo: 120_000, acompanado: 350_000 },
  intermedio: { autonomo: 150_000, acompanado: 450_000 },
  avanzado:   { autonomo: 180_000, acompanado: 600_000 },
};

// ─── GET /inscripciones ──────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { grupoId, escaladorId, estado } = req.query;
    let sql = `
      SELECT i.*, e.nombre, e.apellido, e.estado as esc_estado, e.rango_etario,
             u.email,
             p.nombre as programa, ci.codigo as ciclo, m.nombre as muro,
             co.horario, co.modalidad,
             ent.nombre as entrenador_nombre,
             (SELECT COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado='pagado'),0) FROM pago pa WHERE pa.inscripcion_id=i.id) as total_pagado,
             (SELECT COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado='pendiente'),0) FROM pago pa WHERE pa.inscripcion_id=i.id) as total_pendiente,
             (SELECT COUNT(*) FROM pago pa WHERE pa.inscripcion_id=i.id AND pa.estado='pendiente') as pagos_pendientes,
             (SELECT fecha_vencimiento FROM pago pa WHERE pa.inscripcion_id=i.id AND pa.estado='pendiente' ORDER BY fecha_vencimiento ASC LIMIT 1) as fecha_vencimiento_reserva
      FROM inscripcion i
      JOIN escalador e ON i.escalador_id = e.id
      JOIN usuario u ON e.usuario_id = u.id
      JOIN grupo co ON i.grupo_id = co.id
      JOIN programa p ON co.programa_id = p.id
      JOIN ciclo ci ON co.ciclo_id = ci.id
      LEFT JOIN muro_aliado m ON co.muro_id = m.id
      JOIN entrenador ent ON co.entrenador_id = ent.id
      WHERE 1=1
    `;
    const params = [];
    if (grupoId)     { params.push(grupoId);     sql += ` AND i.grupo_id = $${params.length}`; }
    if (escaladorId) { params.push(escaladorId); sql += ` AND i.escalador_id = $${params.length}`; }
    if (estado)      { params.push(estado);      sql += ` AND i.estado::text = $${params.length}`; }
    if (req.user.rol === "escalador")  { params.push(req.user.escalador.id);  sql += ` AND i.escalador_id = $${params.length}`; }
    if (req.user.rol === "entrenador") { params.push(req.user.entrenador.id); sql += ` AND co.entrenador_id = $${params.length}`; }
    sql += " ORDER BY i.fecha_inscripcion DESC";

    const result = await prisma.$queryRawUnsafe(sql, ...params);
    res.json(result);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /inscripciones ─────────────────────────────────
router.post("/", authorize("admin", "entrenador"), [
  body("escaladorId").isUUID(),
  body("grupoId").isUUID(),
  body("precioCiclo").isFloat({ min: 0 }),
  body("descuentoAplicado").optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { escaladorId, grupoId, precioCiclo, descuentoAplicado } = req.body;

    const coh = await prisma.$queryRawUnsafe(
      "SELECT estado, cupo_maximo, inscritos_actual, programa_id FROM grupo WHERE id=$1",
      grupoId
    );
    if (!coh.length) return res.status(404).json({ error: "Grupo no encontrado" });
    if (coh[0].estado !== "abierta") return res.status(400).json({ error: "El grupo no está abierto para inscripciones" });

    const inscritos = await prisma.$queryRawUnsafe(
      "SELECT COUNT(*) as n FROM inscripcion WHERE grupo_id=$1 AND estado='activa'",
      grupoId
    );
    if (Number(inscritos[0].n) >= coh[0].cupo_maximo) {
      return res.status(400).json({ error: "Grupo sin cupos disponibles" });
    }

    const dup = await prisma.$queryRawUnsafe(
      "SELECT id FROM inscripcion WHERE escalador_id=$1 AND grupo_id=$2",
      escaladorId, grupoId
    );
    if (dup.length > 0) return res.status(409).json({ error: "Escalador ya inscrito en este grupo" });

    const esc = await prisma.$queryRawUnsafe("SELECT rango_etario FROM escalador WHERE id=$1", escaladorId);
    const prog = await prisma.$queryRawUnsafe(
      "SELECT poblacion, rango_etario_menor FROM programa WHERE id=$1",
      coh[0].programa_id
    );
    if (prog[0].poblacion === "menor" && esc[0].rango_etario === "adulto") {
      return res.status(400).json({ error: "Un adulto no puede inscribirse en un programa de menores" });
    }
    if (prog[0].poblacion === "adulto" && esc[0].rango_etario !== "adulto") {
      return res.status(400).json({ error: "Un menor no puede inscribirse en un programa de adultos" });
    }

    const result = await prisma.$queryRawUnsafe(
      `INSERT INTO inscripcion (escalador_id, grupo_id, precio_ciclo, descuento_aplicado)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      escaladorId, grupoId, precioCiclo, descuentoAplicado || null
    );

    await prisma.$executeRawUnsafe(
      "UPDATE grupo SET inscritos_actual = inscritos_actual + 1 WHERE id=$1",
      grupoId
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO pago (inscripcion_id, monto, estado, fecha_vencimiento)
       VALUES ($1, $2, 'pendiente', CURRENT_DATE + INTERVAL '15 days')`,
      result[0].id, precioCiclo
    );

    res.status(201).json({ message: "Inscripción creada con pago pendiente", inscripcion: result[0] });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /inscripciones/autoservicio ────────────────────
router.post(
  "/autoservicio",
  authorize("escalador"),
  [body("grupoId").isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const escaladorId = req.user.escalador.id;
      const { grupoId } = req.body;

      const inscripcion = await prisma.$transaction(async (tx) => {
        const coh = await tx.$queryRawUnsafe(
          `SELECT c.id, c.estado, c.cupo_maximo, c.inscritos_actual, c.modalidad,
                  p.nivel, p.poblacion
           FROM grupo c JOIN programa p ON c.programa_id = p.id
           WHERE c.id = $1
           FOR UPDATE OF c`,
          grupoId
        );
        if (!coh.length)
          throw Object.assign(new Error("Grupo no encontrado"), { status: 404 });

        const grupo = coh[0];
        if (grupo.estado !== "abierta")
          throw Object.assign(new Error("El grupo no está abierto para inscripciones"), { status: 400 });
        if (grupo.inscritos_actual >= grupo.cupo_maximo)
          throw Object.assign(new Error("Grupo sin cupos disponibles"), { status: 400 });
        if (grupo.poblacion !== "adulto")
          throw Object.assign(new Error("Solo puedes inscribirte en programas adultos"), { status: 400 });

        const escNivel = await tx.$queryRawUnsafe(
          "SELECT nivel FROM escalador WHERE id=$1",
          escaladorId
        );
        if (!escNivel[0]?.nivel)
          throw Object.assign(
            new Error("El equipo aún no te ha asignado un nivel. Espera a ser contactado."),
            { status: 403 }
          );
        if (escNivel[0].nivel !== grupo.nivel)
          throw Object.assign(
            new Error(`Este grupo es de nivel ${grupo.nivel}, pero tu nivel asignado es ${escNivel[0].nivel}.`),
            { status: 400 }
          );

        const activas = await tx.$queryRawUnsafe(
          `SELECT COUNT(*) AS n FROM inscripcion
           WHERE escalador_id = $1 AND estado IN ('activa', 'reservada')`,
          escaladorId
        );
        if (Number(activas[0].n) > 0)
          throw Object.assign(
            new Error("Ya tienes una inscripción activa o un cupo reservado. Finaliza o cancela el ciclo actual para inscribirte en otro."),
            { status: 409 }
          );

        const precioMensual = PRECIO_MENSUAL[grupo.nivel]?.[grupo.modalidad] ?? 150_000;
        const precioCiclo   = precioMensual * 3;

        const ins = await tx.$queryRawUnsafe(
          `INSERT INTO inscripcion (id, escalador_id, grupo_id, precio_ciclo, estado, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 'reservada', NOW()) RETURNING *`,
          escaladorId, grupoId, precioCiclo
        );

        await tx.$executeRawUnsafe(
          `INSERT INTO pago (id, inscripcion_id, monto, estado, fecha_vencimiento, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 'pendiente', CURRENT_DATE + 1, NOW())`,
          ins[0].id, precioMensual
        );

        return ins[0];
      });

      res.status(201).json({
        message: "Cupo reservado. Tienes 24 horas para enviar el soporte de pago. El equipo activará tu inscripción al confirmar el pago.",
        inscripcion,
      });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      if (err.code === "23505" || err.cause?.code === "23505")
        return res.status(409).json({ error: "Ya estás inscrito en este grupo" });
      console.error("Error POST /inscripciones/autoservicio:", err);
      res.status(500).json({ error: "Error interno" });
    }
  }
);

// ─── PATCH /inscripciones/:id/estado ─────────────────────
router.patch("/:id/estado", authorize("admin", "entrenador"), [
  body("estado").isIn(["activa", "congelada", "cancelada", "completada", "reservada"]),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { estado } = req.body;
    const insc = await prisma.$queryRawUnsafe(
      `SELECT i.estado as old, i.grupo_id, g.entrenador_id
       FROM inscripcion i
       JOIN grupo g ON i.grupo_id = g.id
       WHERE i.id=$1`,
      req.params.id
    );
    if (!insc.length) return res.status(404).json({ error: "Inscripción no encontrada" });

    if (req.user.rol === "entrenador" && insc[0].entrenador_id !== req.user.entrenador?.id) {
      return res.status(403).json({ error: "No puedes modificar inscripciones de grupos que no son tuyos" });
    }

    await prisma.$executeRawUnsafe("UPDATE inscripcion SET estado=$1 WHERE id=$2", estado, req.params.id);

    const old = insc[0].old;
    if (old === "activa" && estado !== "activa") {
      await prisma.$executeRawUnsafe(
        "UPDATE grupo SET inscritos_actual = GREATEST(inscritos_actual - 1, 0) WHERE id=$1",
        insc[0].grupo_id
      );
    } else if (old !== "activa" && estado === "activa") {
      await prisma.$executeRawUnsafe(
        "UPDATE grupo SET inscritos_actual = inscritos_actual + 1 WHERE id=$1",
        insc[0].grupo_id
      );
    }

    res.json({ message: `Estado cambiado a ${estado}` });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── DELETE /inscripciones/:id ────────────────────────────
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    const insc = await prisma.$queryRawUnsafe(
      "SELECT grupo_id, estado FROM inscripcion WHERE id = $1",
      req.params.id
    );
    if (!insc.length) return res.status(404).json({ error: "Inscripción no encontrada" });

    await prisma.$executeRawUnsafe("DELETE FROM pago WHERE inscripcion_id = $1", req.params.id);
    await prisma.$executeRawUnsafe("DELETE FROM inscripcion WHERE id = $1", req.params.id);

    if (insc[0].estado === "activa") {
      await prisma.$executeRawUnsafe(
        "UPDATE grupo SET inscritos_actual = GREATEST(inscritos_actual - 1, 0) WHERE id = $1",
        insc[0].grupo_id
      );
    }

    res.json({ message: "Inscripción eliminada" });
  } catch (err) {
    console.error("Error DELETE /inscripciones/:id:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
