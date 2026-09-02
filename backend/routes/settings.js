const express = require("express");
const pool = require("../config/db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM settings WHERE id = 1");
  const s = rows[0];
  res.json({
    businessName: s.business_name,
    supportEmail: s.support_email,
    senderEmail: s.sender_email,
    whatsapp: s.whatsapp,
    shipping: s.shipping,
    payment: s.payment,
  });
});

router.post("/", requireAdmin, async (req, res) => {
  const s = req.body;
  await pool.query(
    `UPDATE settings SET business_name=?, support_email=?, sender_email=?, whatsapp=?, shipping=?, payment=? WHERE id = 1`,
    [s.businessName, s.supportEmail, s.senderEmail, s.whatsapp, s.shipping, s.payment]
  );
  res.json({ ok: true });
});

module.exports = router;
