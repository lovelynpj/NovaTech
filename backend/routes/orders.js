const express = require("express");
const pool = require("../config/db");
const { requireAdmin } = require("../middleware/auth");
const { createOrderLimiter } = require("../middleware/rateLimiters");
const { ValidationError, validateItems, mergeItems, generateOrderId } = require("../utils/orderHelpers");

const router = express.Router();

async function findOrCreateCustomer(connection, customer) {
  const [existing] = await connection.query("SELECT id FROM customers WHERE email = ?", [customer.email]);
  if (existing[0]) {
    await connection.query(
      "UPDATE customers SET name=?, phone=?, address=?, city=?, postal_code=? WHERE id=?",
      [customer.name, customer.phone, customer.address, customer.city, customer.postalCode, existing[0].id]
    );
    return existing[0].id;
  }
  const [result] = await connection.query(
    "INSERT INTO customers (name, email, phone, address, city, postal_code) VALUES (?, ?, ?, ?, ?, ?)",
    [customer.name, customer.email, customer.phone, customer.address, customer.city, customer.postalCode]
  );
  return result.insertId;
}

// Crea un pedido. Usa una transacción para que el descuento de stock
// y la creación del pedido sean una sola operación atómica: si algo
// falla a mitad de camino, no queda stock descontado "en el aire".
router.post("/", createOrderLimiter, async (req, res) => {
  const { customer, items: rawItems, payment, deliveryMethod } = req.body;

  // CORREGIDO: antes solo se chequeaba "items?.length", sin validar que cada
  // cantidad fuera un entero positivo. Una cantidad negativa (ej: -5) hacía
  // que "stock = stock - (-5)" SUMARA stock en vez de restarlo. Además, si el
  // mismo product_id venía repetido más de una vez, se descontaba stock una
  // vez por cada aparición (podía vaciar stock real con menos unidades
  // "declaradas"). validateItems + mergeItems arreglan ambos casos.
  let items;
  try {
    items = mergeItems(validateItems(rawItems));
  } catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
    throw err;
  }

  if (!customer || typeof customer !== "object" || !customer.email || !customer.name) {
    return res.status(400).json({ error: "Faltan datos del cliente." });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1) Verificamos stock real (server-side) y traemos precio/nombre/imagen
    // vigentes de cada producto. No confiamos en lo que mande el navegador.
    // Además exigimos que el producto esté activo: un producto desactivado
    // no debería poder comprarse aunque alguien arme el request a mano.
    const productData = new Map();
    for (const item of items) {
      const [rows] = await connection.query(
        "SELECT price, name, image, stock FROM products WHERE id = ? AND active = TRUE FOR UPDATE",
        [item.id]
      );
      const product = rows[0];
      if (!product || product.stock < item.quantity) {
        throw new ValidationError(`Sin stock suficiente para el producto ${item.id}.`);
      }
      productData.set(item.id, product);
    }

    const subtotal = items.reduce((sum, item) => sum + productData.get(item.id).price * item.quantity, 0);
    const shipping = 0;
    const customerId = await findOrCreateCustomer(connection, customer);
    const orderId = generateOrderId();

    // 2) Insertamos la orden PRIMERO: order_items tiene una foreign key hacia
    // orders.id, así que la orden tiene que existir antes de insertar sus items.
    await connection.query(
      "INSERT INTO orders (id, customer_id, subtotal, shipping, total, payment, delivery_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente')",
      [orderId, customerId, subtotal, shipping, subtotal + shipping, payment, deliveryMethod]
    );

    // 3) Recién ahora insertamos los items (ya fusionados: un solo renglón
    // por producto, con la cantidad total real) y descontamos stock UNA vez.
    for (const item of items) {
      const product = productData.get(item.id);
      await connection.query(
        "INSERT INTO order_items (order_id, product_id, name, price, quantity, image) VALUES (?, ?, ?, ?, ?, ?)",
        [orderId, item.id, product.name, product.price, item.quantity, product.image]
      );
      await connection.query("UPDATE products SET stock = stock - ?, sold = sold + ? WHERE id = ?", [
        item.quantity, item.quantity, item.id,
      ]);
    }

    await connection.commit();
    res.json({ id: orderId, total: subtotal + shipping });
  } catch (err) {
    await connection.rollback();
    // No devolvemos err.message tal cual si no es un error "esperado"
    // (ValidationError o falta de stock): un error inesperado de MySQL
    // podría filtrar detalles internos del servidor al cliente.
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
    } else {
      console.error("Error creando pedido:", err);
      res.status(500).json({ error: "No se pudo procesar el pedido. Intentá de nuevo." });
    }
  } finally {
    connection.release();
  }
});

// Admin: lista de pedidos con datos del cliente e items.
router.get("/", requireAdmin, async (req, res) => {
  const [orders] = await pool.query(
    `SELECT o.*, c.name AS customer_name, c.email AS customer_email
     FROM orders o JOIN customers c ON c.id = o.customer_id
     ORDER BY o.created_at DESC`
  );
  const [items] = await pool.query("SELECT * FROM order_items");

  const result = orders.map((o) => ({
    id: o.id,
    createdAt: o.created_at,
    customer: { name: o.customer_name, email: o.customer_email },
    items: items.filter((i) => i.order_id === o.id),
    payment: o.payment,
    deliveryMethod: o.delivery_method,
    total: o.total,
    status: o.status,
  }));
  res.json(result);
});

router.patch("/:id/status", requireAdmin, async (req, res) => {
  const allowedStatuses = ["Pendiente", "Pagado", "Enviado", "Entregado", "Cancelado"];
  if (!allowedStatuses.includes(req.body.status)) {
    return res.status(400).json({ error: "Estado de pedido inválido." });
  }
  await pool.query("UPDATE orders SET status = ? WHERE id = ?", [req.body.status, req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
