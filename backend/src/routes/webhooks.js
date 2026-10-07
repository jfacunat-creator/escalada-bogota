/**
 * webhooks.js
 * Recibe notificaciones de Wompi y actualiza el estado de los pagos.
 * (El link de pago se genera en POST /pagos/:id/link-pago.)
 */

const express = require("express");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const { aplicarEfectosDePago } = require("../utils/pagos");

const router = express.Router();

const WOMPI_EVENT_KEY = process.env.WOMPI_EVENT_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── POST /webhooks/wompi ─────────────────────────────────────────────────────
router.post("/wompi", async (req, res) => {
  try {
    const { event, data, timestamp, signature } = req.body;

    if (event !== "transaction.updated") {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const transaction = data?.transaction;
    if (!transaction) {
      return res.status(400).json({ error: "Payload inválido" });
    }

    // Sin llave de eventos no hay forma de verificar que el aviso viene de Wompi:
    // aceptarlo permitiría a cualquiera marcar pagos como pagados.
    if (!WOMPI_EVENT_KEY) {
      return res.status(503).json({ error: "Webhook de Wompi no configurado" });
    }
    const checksum = `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${WOMPI_EVENT_KEY}`;
    const expectedSignature = crypto.createHash("sha256").update(checksum).digest("hex");
    if (signature?.checksum !== expectedSignature) {
      console.warn("Webhook Wompi: firma inválida");
      return res.status(401).json({ error: "Firma inválida" });
    }

    // Los pagos con link quedan con referencia "wompi_link:<id del link>" (POST /pagos/:id/link-pago).
    let pago = [];
    if (transaction.payment_link_id) {
      pago = await prisma.$queryRawUnsafe(
        "SELECT id FROM pago WHERE referencia = $1", `wompi_link:${transaction.payment_link_id}`
      );
    }
    if (!pago.length && UUID_RE.test(transaction.reference || "")) {
      pago = await prisma.$queryRawUnsafe("SELECT id FROM pago WHERE id = $1", transaction.reference);
    }
    if (!pago.length) {
      console.warn("Webhook Wompi: pago no encontrado", transaction.payment_link_id || transaction.reference);
      return res.status(200).json({ ok: true, not_found: true });
    }
    const pagoId = pago[0].id;

    if (transaction.status !== "APPROVED") {
      return res.status(200).json({ ok: true, status_ignored: transaction.status });
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE pago SET estado = 'pagado', metodo = 'wompi', referencia = $1,
                fecha_pago = CURRENT_DATE, updated_at = NOW()
         WHERE id = $2`,
        `wompi_tx:${transaction.id}`, pagoId
      );
      await aplicarEfectosDePago(pagoId, tx);
    });

    console.log(`Webhook Wompi: pago ${pagoId} → pagado (tx: ${transaction.id})`);
    res.status(200).json({ ok: true, pago_id: pagoId, estado: "pagado" });
  } catch (err) {
    console.error("Error en webhook Wompi:", err);
    res.status(500).json({ error: "Error procesando webhook" });
  }
});

module.exports = router;
