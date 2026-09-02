const express = require("express");
const pool = require("../config/db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAdmin, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT c.id, c.name, c.email, c.phone,
           COUNT(o.id) AS orders, COALESCE(SUM(o.total), 0) AS spent, MAX(o.created_at) AS lastOrder
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id
    ORDER BY lastOrder DESC
  `);
  res.json(rows);
});

router.delete("/:email", requireAdmin, async (req, res) => {
  const [rows] = await pool.query("SELECT id FROM customers WHERE email = ?", [req.params.email]);
  if (rows[0]) {
    await pool.query("DELETE FROM orders WHERE customer_id = ?", [rows[0].id]);
    await pool.query("DELETE FROM customers WHERE id = ?", [rows[0].id]);
  }
  res.json({ ok: true });
});

module.exports = router;
