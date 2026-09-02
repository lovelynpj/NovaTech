const express = require("express");
const pool = require("../config/db");
const { requireAdmin } = require("../middleware/auth");

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
router.post("/", async (req, res) => {
  const { customer, items, payment, deliveryMethod } = req.body;
  if (!items?.length) return res.status(400).json({ error: "El carrito está vacío." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1) Verificamos stock real (server-side) y traemos precio/nombre/imagen
    // vigentes de cada producto. No confiamos en lo que mande el navegador.
    const productData = new Map();
    for (const item of items) {
      const [rows] = await connection.query(
        "SELECT price, name, image, stock FROM products WHERE id = ? FOR UPDATE",
        [item.id]
      );
      const product = rows[0];
      if (!product || product.stock < item.quantity) {
        throw new Error(`Sin stock suficiente para el producto ${item.id}.`);
      }
      productData.set(item.id, product);
    }

    const subtotal = items.reduce((sum, item) => sum + productData.get(item.id).price * item.quantity, 0);
    const shipping = 0;
    const customerId = await findOrCreateCustomer(connection, customer);
    const orderId = `NT-${Date.now().toString().slice(-6)}`;

    // 2) Insertamos la orden PRIMERO: order_items tiene una foreign key hacia
    // orders.id, así que la orden tiene que existir antes de insertar sus items.
    await connection.query(
      "INSERT INTO orders (id, customer_id, subtotal, shipping, total, payment, delivery_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente')",
      [orderId, customerId, subtotal, shipping, subtotal + shipping, payment, deliveryMethod]
    );

    // 3) Recién ahora insertamos los items y descontamos stock.
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
    res.status(400).json({ error: err.message });
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
  await pool.query("UPDATE orders SET status = ? WHERE id = ?", [req.body.status, req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
