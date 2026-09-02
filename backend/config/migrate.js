// Ejecutá esto UNA VEZ (npm run migrate) para crear las tablas
// y tu primer usuario administrador con contraseña encriptada de verdad.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("./db");

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log("Creando tablas...");
  for (const statement of statements) {
    await pool.query(statement);
  }
  console.log("Tablas listas ✔");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@novatech.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "cambiame123";
  const [existing] = await pool.query("SELECT id FROM admins WHERE email = ?", [adminEmail]);

  if (existing.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.query("INSERT INTO admins (email, password_hash) VALUES (?, ?)", [adminEmail, hash]);
    console.log(`Admin creado: ${adminEmail} / ${adminPassword}`);
    console.log("⚠️  Cambiá esta contraseña apenas entres al panel.");
  } else {
    console.log("El admin ya existía, no se tocó.");
  }

  process.exit(0);
}

migrate().catch((err) => {
  console.error("Error en la migración:", err);
  process.exit(1);
});
