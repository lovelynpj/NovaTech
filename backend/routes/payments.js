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

// Crea el link de pago para un pedido ya existente en nuestra base.
router.post("/create-preference", async (req, res) => {
  const { orderId } = req.body;

  const [orders] = await pool.query("SELECT * FROM orders WHERE id = ?", [orderId]);
  const order = orders[0];
  if (!order) return res.status(404).json({ error: "Pedido no encontrado." });

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
// preguntamos directamente a Mercado Pago cuál es el estado real del pago.
router.post("/webhook", async (req, res) => {
  try {
    const paymentId = req.query.id || req.body?.data?.id;
    if (!paymentId) return res.sendStatus(200);

    const payment = new Payment(client);
    const info = await payment.get({ id: paymentId });

    if (info.status === "approved") {
      const orderId = info.external_reference;
      await pool.query("UPDATE orders SET status = 'Pagado', mp_payment_id = ? WHERE id = ?", [
        paymentId, orderId,
      ]);
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Error procesando webhook de MP:", err);
    res.sendStatus(200); // Igual respondemos 200 para que MP no reintente en loop.
  }
});

module.exports = router;
