const express = require("express");
const pool = require("../config/db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAdmin, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM promotions ORDER BY created_at DESC");
  res.json(rows);
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, code, discount, validity } = req.body;
  const [result] = await pool.query(
    "INSERT INTO promotions (name, code, discount, validity) VALUES (?, ?, ?, ?)",
    [name, code, discount, validity]
  );
  res.json({ id: result.insertId, name, code, discount, validity, active: true });
});

module.exports = router;
