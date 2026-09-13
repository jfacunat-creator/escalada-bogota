const express = require("express");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const { authenticate, authorize } = require("../middleware/auth");

const WOMPI_BASE = process.env.WOMPI_ENV === "production"
  ? "https://production.wompi.co/v1"
  : "https://sandbox.wompi.co/v1";
const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const router = express.Router();
router.use(authenticate);

// ─── GET /pagos/resumen ───────────────────────────────────
router.get("/resumen", authorize("admin"), async (req, res) => {
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) FILTER (WHERE i.estado = 'activa') AS activas,
        COALESCE(SUM(p.monto), 0) AS ingresos_esperados,
        COALESCE(SUM(p.monto) FILTER (WHERE p.estado = 'pagado'), 0) AS ingresos_recibidos,
        COUNT(p.id) FILTER (WHERE p.estado = 'pendiente') AS pagos_pendientes,
        CASE
          WHEN SUM(p.monto) > 0
          THEN ROUND(
            SUM(p.monto) FILTER (WHERE p.estado = 'pagado') * 100.0 /
            SUM(p.monto)
          )
          ELSE 0
        END AS tasa_recaudo
      FROM inscripcion i
      LEFT JOIN pago p ON p.inscripcion_id = i.id
    `);
    res.json(result[0]);
  } catch (err) {
    console.error("Error GET /pagos/resumen:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /pagos ───────────────────────────────────────────
router.get("/", async (req, res) => {
  if (req.user.rol !== "admin" && req.user.rol !== "escalador") {
    return res.status(403).json({ error: "Sin acceso" });
  }
  try {
    const { estado, grupoId } = req.query;
    let sql = `
      SELECT pg.*,
             e.nombre, e.apellido,
             e.id AS escalador_id,
             pr.nombre AS programa,
             g.modalidad, g.horario,
             ci.codigo AS ciclo
      FROM pago pg
      JOIN inscripcion i ON pg.inscripcion_id = i.id
      JOIN escalador e ON i.escalador_id = e.id
      JOIN grupo g ON i.grupo_id = g.id
      JOIN programa pr ON g.programa_id = pr.id
      JOIN ciclo ci ON g.ciclo_id = ci.id
      WHERE 1=1`;
    const params = [];

    if (estado) { params.push(estado); sql += ` AND pg.estado::text = $${params.length}`; }
    if (grupoId) { params.push(grupoId); sql += ` AND i.grupo_id = $${params.length}`; }

    if (req.user.rol === "escalador") {
      params.push(req.user.escalador.id);
      sql += ` AND i.escalador_id = $${params.length}`;
    }

    sql += " ORDER BY pg.created_at DESC";
    const result = await prisma.$queryRawUnsafe(sql, ...params);
    res.json(result);
  } catch (err) {
    console.error("Error GET /pagos:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /pagos ──────────────────────────────────────────
router.post("/", authorize("admin"), async (req, res) => {
  try {
    const { inscripcionId, monto, metodo, referencia } = req.body;
    if (!inscripcionId || !monto || parseFloat(monto) <= 0) {
      return res.status(400).json({ error: "inscripcionId y monto son requeridos" });
    }
    const insc = await prisma.$queryRawUnsafe("SELECT id FROM inscripcion WHERE id = $1", inscripcionId);
    if (!insc.length) return res.status(404).json({ error: "Inscripción no encontrada" });

    const result = await prisma.$queryRawUnsafe(
      `INSERT INTO pago (id, inscripcion_id, monto, estado, metodo, referencia, fecha_pago, fecha_vencimiento, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'pagado', $3, $4, CURRENT_DATE, CURRENT_DATE, NOW())
       RETURNING *`,
      inscripcionId, parseFloat(monto), metodo || "transferencia", referencia || null
    );

    const escCheck = await prisma.$queryRawUnsafe(
      `SELECT e.id, e.estado, i.estado as insc_estado, i.grupo_id FROM inscripcion i
       JOIN escalador e ON i.escalador_id = e.id
       WHERE i.id = $1`,
      inscripcionId
    );
    if (escCheck.length) {
      const row = escCheck[0];
      if (row.insc_estado === "reservada") {
        await prisma.$executeRawUnsafe("UPDATE inscripcion SET estado='activa', updated_at=NOW() WHERE id=$1", inscripcionId);
        await prisma.$executeRawUnsafe("UPDATE grupo SET inscritos_actual = inscritos_actual + 1 WHERE id=$1", row.grupo_id);
      }
      if (row.estado === "pendiente") {
        await prisma.$executeRawUnsafe("UPDATE escalador SET estado='activo', updated_at=NOW() WHERE id=$1", row.id);
      }
    }

    res.status(201).json(result[0]);
  } catch (err) {
    console.error("Error POST /pagos:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── GET /pagos/:id ───────────────────────────────────────
router.get("/:id", authorize("admin"), async (req, res) => {
  try {
    const result = await prisma.$queryRawUnsafe(
      `SELECT pg.*,
              e.nombre || ' ' || e.apellido AS escalador_nombre,
              p.nombre AS programa, ci.codigo AS ciclo,
              g.modalidad, g.horario, m.nombre AS muro
       FROM pago pg
       JOIN inscripcion i ON pg.inscripcion_id = i.id
       JOIN escalador e ON i.escalador_id = e.id
       JOIN grupo g ON i.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       JOIN muro_aliado m ON g.muro_id = m.id
       WHERE pg.id = $1`,
      req.params.id
    );
    if (!result.length) return res.status(404).json({ error: "Pago no encontrado" });
    res.json(result[0]);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── PATCH /pagos/:id ─────────────────────────────────────
router.patch("/:id", authorize("admin"), async (req, res) => {
  try {
    const { estado, referencia, metodo } = req.body;
    const sets = [], params = [];

    if (estado) {
      if (!["pendiente", "pagado", "vencido"].includes(estado)) {
        return res.status(400).json({ error: "Estado inválido (pendiente | pagado | vencido)" });
      }
      params.push(estado);
      sets.push(`estado = $${params.length}`);
      if (estado === "pagado") {
        sets.push(`fecha_pago = CURRENT_DATE`);
      }
    }
    if (referencia) { params.push(referencia); sets.push(`referencia = $${params.length}`); }
    if (metodo) { params.push(metodo); sets.push(`metodo = $${params.length}`); }

    if (!sets.length) return res.status(400).json({ error: "Nada que actualizar" });

    params.push(req.params.id);
    const result = await prisma.$queryRawUnsafe(
      `UPDATE pago SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
      ...params
    );

    if (estado === "pagado") {
      const escCheck = await prisma.$queryRawUnsafe(
        `SELECT e.id, e.estado, i.id as insc_id, i.estado as insc_estado, i.grupo_id FROM pago p
         JOIN inscripcion i ON p.inscripcion_id = i.id
         JOIN escalador e ON i.escalador_id = e.id
         WHERE p.id = $1`,
        req.params.id
      );
      if (escCheck.length) {
        const row = escCheck[0];
        if (row.insc_estado === "reservada") {
          await prisma.$executeRawUnsafe("UPDATE inscripcion SET estado='activa', updated_at=NOW() WHERE id=$1", row.insc_id);
          await prisma.$executeRawUnsafe("UPDATE grupo SET inscritos_actual = inscritos_actual + 1 WHERE id=$1", row.grupo_id);
        }
        if (row.estado === "pendiente") {
          await prisma.$executeRawUnsafe("UPDATE escalador SET estado='activo', updated_at=NOW() WHERE id=$1", row.id);
        }
      }
    }

    res.json(result[0]);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── POST /pagos/:id/link-pago ────────────────────────────
router.post("/:id/link-pago", async (req, res) => {
  try {
    if (!WOMPI_PRIVATE_KEY) {
      return res.status(503).json({ error: "Pasarela de pago no configurada. Contacta al equipo." });
    }

    const pagoId = req.params.id;
    const pago = await prisma.$queryRawUnsafe(
      `SELECT pa.id, pa.monto, pa.estado, pa.inscripcion_id,
              i.escalador_id, e.nombre, e.apellido,
              p.nombre AS programa, ci.codigo AS ciclo
       FROM pago pa
       JOIN inscripcion i ON pa.inscripcion_id = i.id
       JOIN escalador e ON i.escalador_id = e.id
       JOIN grupo g ON i.grupo_id = g.id
       JOIN programa p ON g.programa_id = p.id
       JOIN ciclo ci ON g.ciclo_id = ci.id
       WHERE pa.id = $1`,
      pagoId
    );

    if (!pago.length) return res.status(404).json({ error: "Pago no encontrado" });
    const p = pago[0];

    if (req.user.rol === "escalador" && req.user.escalador.id !== p.escalador_id) {
      return res.status(403).json({ error: "Sin permiso sobre este pago" });
    }
    if (p.estado === "pagado") return res.status(400).json({ error: "Este pago ya fue procesado" });

    const amountInCents = Math.round(parseFloat(p.monto) * 100);
    const wompiRes = await fetch(`${WOMPI_BASE}/payment_links`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${WOMPI_PRIVATE_KEY}` },
      body: JSON.stringify({
        name: `${p.programa} · ${p.ciclo}`,
        description: `Mensualidad de ${p.nombre} ${p.apellido} — EscaladaBogotá`,
        single_use: true,
        collect_shipping: false,
        currency: "COP",
        amount_in_cents: amountInCents,
        redirect_url: `${FRONTEND_URL}/app/mis-pagos?pago=${pagoId}&status=redirect`,
        sku: pagoId,
      }),
    });

    const wompiData = await wompiRes.json();
    if (!wompiRes.ok) {
      console.error("Error Wompi API:", wompiData);
      return res.status(502).json({ error: "Error al generar el link de pago. Intenta de nuevo." });
    }

    const linkData = wompiData.data;
    const paymentUrl = `https://checkout.wompi.co/l/${linkData.id}`;
    await prisma.$executeRawUnsafe(
      "UPDATE pago SET referencia = $1 WHERE id = $2",
      `wompi_link:${linkData.id}`, pagoId
    );

    res.json({ payment_url: paymentUrl, link_id: linkData.id, amount: parseFloat(p.monto) });
  } catch (err) {
    console.error("Error generando link de pago:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ─── DELETE /pagos/:id ────────────────────────────────────
router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    const check = await prisma.$queryRawUnsafe("SELECT id FROM pago WHERE id = $1", req.params.id);
    if (!check.length) return res.status(404).json({ error: "Pago no encontrado" });

    await prisma.$executeRawUnsafe("DELETE FROM pago WHERE id = $1", req.params.id);
    res.json({ message: "Pago eliminado" });
  } catch (err) {
    console.error("Error DELETE /pagos/:id:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
