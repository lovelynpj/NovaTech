const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const pool = require("../config/db");

const router = express.Router();

// Frena intentos de fuerza bruta contra el login (máx 10 intentos cada 15 min por IP).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
});

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Falta email o contraseña." });
  }

  const [rows] = await pool.query("SELECT * FROM admins WHERE email = ?", [email]);
  const admin = rows[0];

  // Comparamos siempre con bcrypt (nunca texto plano) y devolvemos
  // el mismo mensaje de error genérico exista o no el usuario.
  const valid = admin ? await bcrypt.compare(password, admin.password_hash) : false;
  if (!valid) {
    return res.status(401).json({ error: "Credenciales incorrectas." });
  }

  const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });

  res.json({ token, email: admin.email });
});

router.post("/change-password", async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  const [rows] = await pool.query("SELECT * FROM admins WHERE email = ?", [email]);
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(currentPassword, admin.password_hash))) {
    return res.status(401).json({ error: "Contraseña actual incorrecta." });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE admins SET password_hash = ? WHERE id = ?", [hash, admin.id]);
  res.json({ ok: true });
});

module.exports = router;
