// Conexión a MySQL (Aiven). Usamos un "pool" para reutilizar conexiones
// en vez de abrir una nueva por cada pedido — esto es clave en producción.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

// Aiven firma su certificado SSL con una autoridad propia (CA). Le pasamos
// ese certificado a mysql2 para que confíe en la conexión; sin esto, Node
// la rechaza con "self-signed certificate in certificate chain".
function buildSslConfig() {
  if (process.env.DB_SSL !== "true") return undefined;
  const caPath = process.env.DB_CA_PATH
    ? path.resolve(process.env.DB_CA_PATH)
    : path.join(__dirname, "ca.pem");
  if (fs.existsSync(caPath)) {
    return { ca: fs.readFileSync(caPath, "utf8") };
  }
  console.warn(
    `⚠️  No encontré el certificado CA en ${caPath}. Descargalo desde Aiven ` +
      `("CA certificate" → Show → ⬇) y guardalo en config/ca.pem`
  );
  return { rejectUnauthorized: false };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: buildSslConfig(),
  waitForConnections: true,
  connectionLimit: 8,
  queueLimit: 0,
});

module.exports = pool;