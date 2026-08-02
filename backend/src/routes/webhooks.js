/**
 * webhooks.js
 * Recibe notificaciones de Wompi y actualiza el estado de los pagos.
 * También expone el endpoint para generar links de pago.
 *
 * Variables de entorno requeridas:
 *   WOMPI_PRIVATE_KEY   — llave privada (prv_prod_... o prv_test_...)
 *   WOMPI_PUBLIC_KEY    — llave pública (pub_prod_... o pub_test_...)
 *   WOMPI_EVENT_KEY     — llave de eventos para validar webhooks
 *   WOMPI_ENV           — "sandbox" o "production" (default: sandbox)
 *   FRONTEND_URL        — URL del frontend para redirección post-pago
 */

const express = require("express");
const crypto = require("crypto");
const { query: db } = require("../config/database");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

const WOMPI_BASE = process.env.WOMPI_ENV === "production"
  ? "https://production.wompi.co/v1"
  : "https://sandbox.wompi.co/v1";

const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;
const WOMPI_EVENT_KEY   = process.env.WOMPI_EVENT_KEY;
const FRONTEND_URL      = process.env.FRONTEND_URL || "http://localhost:5173";

// ─── POST /webhooks/wompi — Webhook de Wompi ─────────────────────────────────
// Recibe notificaciones de transacciones y actualiza el pago correspondiente.
// NO requiere autenticación JWT — Wompi lo llama directamente.
router.post("/wompi", async (req, res) => {
  try {
    const { event, data, timestamp, signature } = req.body;

    // Solo procesamos transacciones
    if (event !== "transaction.updated") {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const transaction = data?.transaction;
    if (!transaction) {
      return res.status(400).json({ error: "Payload inválido" });
    }

    // Validar firma de integridad
    if (WOMPI_EVENT_KEY && signature) {
      const checksum = `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${WOMPI_EVENT_KEY}`;
      const expectedSignature = crypto.createHash("sha256").update(checksum).digest("hex");

      if (signature.checksum !== expectedSignature) {
        console.warn("Webhook Wompi: firma inválida", { received: signature.checksum, expected: expectedSignature });
        return res.status(401).json({ error: "Firma inválida" });
      }
    }

    // Buscar el pago por referencia (usamos pago.id como referencia en Wompi)
    const reference = transaction.reference;
    if (!reference) {
      return res.status(200).json({ ok: true, no_reference: true });
    }

    const pago = await db("SELECT id, estado, inscripcion_id FROM pago WHERE id = $1", [reference]);
    if (pago.rows.length === 0) {
      console.warn("Webhook Wompi: referencia no encontrada:", reference);
      return res.status(200).json({ ok: true, not_found: true });
    }

    // Mapear estado Wompi → estado interno
    const statusMap = {
      APPROVED: "pagado",
      DECLINED: "pendiente",
      VOIDED:   "pendiente",
      ERROR:    "pendiente",
    };

    const nuevoEstado = statusMap[transaction.status];
    if (!nuevoEstado) {
      return res.status(200).json({ ok: true, status_ignored: transaction.status });
    }

    // Actualizar pago
    await db(
      `UPDATE pago SET
        estado = $1,
        metodo = 'wompi',
        referencia = $2,
        fecha_pago = CASE WHEN $1 = 'pagado' THEN CURRENT_DATE ELSE fecha_pago END
       WHERE id = $3`,
      [nuevoEstado, transaction.id, reference]
    );

    console.log(`Webhook Wompi: pago ${reference} → ${nuevoEstado} (tx: ${transaction.id})`);

    res.status(200).json({ ok: true, pago_id: reference, estado: nuevoEstado });
  } catch (err) {
    console.error("Error en webhook Wompi:", err);
    res.status(500).json({ error: "Error procesando webhook" });
  }
});

// ─── POST /pagos/:id/link-pago — Generar link de pago Wompi ─────────────────
// El escalador solicita un link para pagar una mensualidad pendiente.
router.post("/:id/link-pago", authenticate, async (req, res) => {
  try {
    if (!WOMPI_PRIVATE_KEY) {
      return res.status(503).json({ error: "Pasarela de pago no configurada. Contacta al equipo." });
    }

    const pagoId = req.params.id;

    // Verificar que el pago existe y pertenece al escalador
    const pago = await db(
      `SELECT pa.id, pa.monto, pa.estado, pa.inscripcion_id,
              i.escalador_id, e.nombre, e.apellido,
              p.nombre AS programa, ci.codigo AS ciclo
       FROM pago pa
       JOIN inscripcion i ON pa.inscripcion_id = i.id
       JOIN escalador e ON i.escalador_id = e.id
       JOIN cohorte co ON i.cohorte_id = co.id
       JOIN programa p ON co.programa_id = p.id
       JOIN ciclo ci ON co.ciclo_id = ci.id
       WHERE pa.id = $1`,
      [pagoId]
    );

    if (pago.rows.length === 0) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    const p = pago.rows[0];

    // Solo el propio escalador o un admin puede generar el link
    if (req.user.rol === "escalador" && req.user.escalador.id !== p.escalador_id) {
      return res.status(403).json({ error: "No tienes permisos sobre este pago" });
    }

    if (p.estado === "pagado") {
      return res.status(400).json({ error: "Este pago ya fue procesado" });
    }

    // Crear link de pago en Wompi
    const amountInCents = Math.round(parseFloat(p.monto) * 100);
    const body = {
      name: `${p.programa} · ${p.ciclo}`,
      description: `Mensualidad de ${p.nombre} ${p.apellido} — EscaladaBogotá`,
      single_use: true,
      collect_shipping: false,
      currency: "COP",
      amount_in_cents: amountInCents,
      redirect_url: `${FRONTEND_URL}/app/mis-pagos?pago=${pagoId}&status=redirect`,
      // La referencia vincula el pago con nuestro sistema
      sku: pagoId,
    };

    const wompiRes = await fetch(`${WOMPI_BASE}/payment_links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WOMPI_PRIVATE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const wompiData = await wompiRes.json();

    if (!wompiRes.ok) {
      console.error("Error Wompi API:", wompiData);
      return res.status(502).json({ error: "Error al generar el link de pago. Intenta de nuevo." });
    }

    const linkData = wompiData.data;
    const paymentUrl = `https://checkout.wompi.co/l/${linkData.id}`;

    // Guardar referencia del link en el pago
    await db(
      "UPDATE pago SET referencia = $1 WHERE id = $2",
      [`wompi_link:${linkData.id}`, pagoId]
    );

    res.json({
      payment_url: paymentUrl,
      link_id: linkData.id,
      amount: parseFloat(p.monto),
      expires: linkData.expires_at || null,
    });
  } catch (err) {
    console.error("Error generando link de pago:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
