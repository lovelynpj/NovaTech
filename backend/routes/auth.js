const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const pool = require("../config/db");
const { requireAdmin } = require("../middleware/auth");
const { changePasswordLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

// Frena intentos de fuerza bruta contra el login (máx 10 intentos cada 15 min por IP).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
});

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Falta email o contraseña." });
  }

  const [rows] = await pool.query("SELECT * FROM admins WHERE email = ?", [email]);
  const admin = rows[0];

  const valid = admin ? await bcrypt.compare(password, admin.password_hash) : false;
  if (!valid) {
    return res.status(401).json({ error: "Credenciales incorrectas." });
  }

  const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });

  res.json({ token, email: admin.email });
});

// CORREGIDO (crítico): antes esta ruta no verificaba en absoluto que quien la
// llamaba estuviera autenticado como admin — cualquiera que supiera (o
// adivinara) el email podía intentar cambiar la contraseña sin loguearse.
// Ahora:
//   1) requireAdmin exige un JWT válido (mismo mecanismo que protege el resto
//      del panel).
//   2) changePasswordLimiter frena fuerza bruta sobre "currentPassword".
//   3) Usamos req.admin.id (del token verificado), NO el email que venga en
//      el body, para que un admin autenticado no pueda pasar el email de
//      OTRO admin y cambiarle la contraseña a él.
router.post("/change-password", changePasswordLimiter, requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Faltan datos." });
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres." });
  }

  const [rows] = await pool.query("SELECT * FROM admins WHERE id = ?", [req.admin.id]);
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(currentPassword, admin.password_hash))) {
    return res.status(401).json({ error: "Contraseña actual incorrecta." });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE admins SET password_hash = ? WHERE id = ?", [hash, admin.id]);
  res.json({ ok: true });
});

module.exports = router;
