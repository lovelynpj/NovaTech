// Protege las rutas de administración. El navegador manda el token
// que recibió al iniciar sesión; acá lo validamos del lado del servidor
// (esto es lo que hoy NO existe: antes cualquiera podía "activarse" como
// admin ejecutando una línea en la consola del navegador).
const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "No autorizado. Iniciá sesión de nuevo." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Sesión inválida o expirada." });
  }
}

module.exports = { requireAdmin };
