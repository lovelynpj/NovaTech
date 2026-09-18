// Mercado Pago Checkout Pro: la forma más simple de cobrar online.
// 1) El frontend nos pide un "link de pago" para un pedido ya creado.
// 2) Mandamos al comprador a ese link (una página que arma Mercado Pago).
// 3) Mercado Pago nos avisa solo, con una notificación (webhook), cuándo se pagó.
// No manejamos tarjetas ni datos sensibles de pago en ningún momento: eso es
// justamente lo que hace que esta integración sea segura y simple.
const express = require("express");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");
const pool = require("../config/db");

const router = express.Router();

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

// Función pura (sin red/DB) que decide si un pago de Mercado Pago realmente
// corresponde al pedido que dice cubrir. Separada del handler del webhook
// para poder testearla de forma aislada, sin necesitar la API real de MP.
function paymentMatchesOrder(paymentInfo, order) {
  if (!paymentInfo || !order) return false;
  const isApproved = paymentInfo.status === "approved";
  const paidAmount = Number(paymentInfo.transaction_amount);
  const expectedAmount = Number(order.total);
  const amountMatches = Number.isFinite(paidAmount) && paidAmount === expectedAmount;
  const currencyMatches = !paymentInfo.currency_id || paymentInfo.currency_id === "ARS";
  return isApproved && amountMatches && currencyMatches;
}

// Crea el link de pago para un pedido ya existente en nuestra base.
router.post("/create-preference", async (req, res) => {
  const { orderId } = req.body;
  if (!orderId || typeof orderId !== "string") {
    return res.status(400).json({ error: "Falta el identificador del pedido." });
  }

  const [orders] = await pool.query("SELECT * FROM orders WHERE id = ?", [orderId]);
  const order = orders[0];
  if (!order) return res.status(404).json({ error: "Pedido no encontrado." });
  if (order.status === "Pagado") {
    return res.status(400).json({ error: "Este pedido ya fue pagado." });
  }

  const [items] = await pool.query("SELECT * FROM order_items WHERE order_id = ?", [orderId]);

  try {
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: items.map((i) => ({
          title: i.name,
          quantity: i.quantity,
          unit_price: i.price,
          currency_id: "ARS",
        })),
        external_reference: orderId,
        back_urls: {
          success: `${process.env.FRONTEND_URL}#pedido-confirmado`,
          failure: `${process.env.FRONTEND_URL}#checkout`,
          pending: `${process.env.FRONTEND_URL}#pedido-pendiente`,
        },
        auto_return: "approved",
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      },
    });
    res.json({ checkoutUrl: result.init_point });
  } catch (err) {
    console.error("Error creando preferencia de MP:", err);
    res.status(500).json({ error: "No se pudo iniciar el pago." });
  }
});

// Mercado Pago llama a esta URL solo, cuando cambia el estado de un pago.
// Acá NO confiamos en nada que mande el navegador del comprador: le
// preguntamos directamente a Mercado Pago (payment.get) cuál es el estado
// real del pago, y ahora ADEMÁS verificamos que:
//   - el pedido exista en nuestra base,
//   - no esté ya marcado como "Pagado" con ese mismo payment_id (evita
//     reprocesar el mismo webhook dos veces — MP puede reenviar notificaciones),
//   - el monto pagado coincida EXACTO con el total del pedido,
//   - la moneda sea ARS,
//   - el estado sea realmente "approved".
// Antes, cualquiera de estas condiciones podía faltar: bastaba con que
// "info.status === 'approved'" para marcar el pedido como pagado, sin mirar
// el monto — un pago aprobado por $1 podía marcar como pagado un pedido de
// $500.000 si alguien lograba enviar una notificación de webhook falsa con
// un payment_id de un pago real (pero de otro monto) a nuestro endpoint.
router.post("/webhook", async (req, res) => {
  try {
    const paymentId = req.query.id || req.query["data.id"] || req.body?.data?.id;
    if (!paymentId) return res.sendStatus(200);

    const payment = new Payment(client);
    const info = await payment.get({ id: paymentId });

    const orderId = info.external_reference;
    if (!orderId) return res.sendStatus(200);

    const [orders] = await pool.query("SELECT * FROM orders WHERE id = ?", [orderId]);
    const order = orders[0];
    if (!order) {
      console.warn(`Webhook MP: pedido ${orderId} no existe en la base. Ignorado.`);
      return res.sendStatus(200);
    }

    // Idempotencia: si este mismo pago ya fue el que marcó el pedido como
    // pagado, no reprocesamos (evita doble notificación de MP duplicando efectos).
    if (order.status === "Pagado" && order.mp_payment_id === String(paymentId)) {
      return res.sendStatus(200);
    }
    if (order.status === "Pagado") {
      // El pedido ya está pagado con OTRO payment_id: no lo tocamos.
      return res.sendStatus(200);
    }

    if (paymentMatchesOrder(info, order)) {
      // El "AND status <> 'Pagado'" es una segunda barrera de idempotencia a
      // nivel SQL, por si dos notificaciones llegan casi en simultáneo.
      await pool.query(
        "UPDATE orders SET status = 'Pagado', mp_payment_id = ? WHERE id = ? AND status <> 'Pagado'",
        [String(paymentId), orderId]
      );
    } else {
      console.warn(
        `Webhook MP ignorado para pedido ${orderId}: status=${info.status} monto_pagado=${info.transaction_amount} monto_esperado=${order.total} moneda=${info.currency_id}`
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error procesando webhook de MP:", err);
    res.sendStatus(200); // Igual respondemos 200 para que MP no reintente en loop.
  }
});

module.exports = router;
module.exports.paymentMatchesOrder = paymentMatchesOrder;
