const rateLimit = require("express-rate-limit");

// Máx 10 intentos cada 15 min por IP para cambiar contraseña. Se aplica
// ADEMÁS de requireAdmin (o sea: hace falta estar autenticado Y no superar
// el límite). Esto frena tanto a un atacante con un token robado probando
// "currentPassword" a fuerza bruta, como a cualquier flood de requests.
const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
});

// Frena el abuso del endpoint público de creación de pedidos (podría usarse
// para vaciar stock a propósito o floodear la base de clientes/pedidos).
const createOrderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Estás creando pedidos demasiado rápido. Esperá unos minutos e intentá de nuevo." },
});

module.exports = { changePasswordLimiter, createOrderLimiter };
