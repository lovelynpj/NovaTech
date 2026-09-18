const express = require("express");
const pool = require("../config/db");
const { requireAdmin } = require("../middleware/auth");
const upload = require("../middleware/upload");
const cloudinary = require("../config/cloudinary");
const { validateProductInput, normalizeProductInput } = require("../utils/productValidation");

const router = express.Router();

const mapProduct = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  category: row.category,
  brand: row.brand,
  sku: row.sku,
  price: row.price,
  oldPrice: row.old_price,
  stock: row.stock,
  tag: row.tag,
  image: row.image,
  specs: typeof row.specs === "string" ? JSON.parse(row.specs) : row.specs || {},
  featured: !!row.featured,
  new: !!row.is_new,
  active: !!row.active,
  sold: row.sold,
});

// Público: lista de productos activos (para la tienda).
router.get("/", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM products WHERE active = TRUE ORDER BY created_at DESC");
  res.json(rows.map(mapProduct));
});

// Admin: lista completa (incluye inactivos) para el panel.
router.get("/admin", requireAdmin, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM products ORDER BY created_at DESC");
  res.json(rows.map(mapProduct));
});

// Admin: sube una imagen a Cloudinary y devuelve su URL segura.
router.post("/upload-image", requireAdmin, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se recibió ninguna imagen." });

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "novatech/products", resource_type: "image" },
        (error, uploadResult) => (error ? reject(error) : resolve(uploadResult)),
      );
      stream.end(req.file.buffer);
    });
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Error al subir imagen a Cloudinary:", err);
    res.status(500).json({ error: "No se pudo subir la imagen. Intentá de nuevo." });
  }
});

// CORREGIDO: antes esta ruta devolvía CUALQUIER producto por id, esté activo
// o no — un producto desactivado (ej: descontinuado, o retirado por algún
// motivo) seguía siendo consultable públicamente conociendo su id. Ahora
// solo se devuelven productos activos, igual que en la lista pública.
router.get("/:id", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM products WHERE id = ? AND active = TRUE", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "Producto no encontrado." });
  res.json(mapProduct(rows[0]));
});

// Crear o editar producto (solo admin).
// CORREGIDO: antes se guardaba p.price/p.oldPrice/p.stock tal cual llegaran
// del request, sin validar. Se podían guardar precios negativos, stock
// negativo, NaN, Infinity, o strings no numéricos ("abc"), rompiendo cálculos
// de totales/carrito en el resto del sitio. Ahora se valida y normaliza todo
// a enteros seguros antes de tocar la base.
router.post("/", requireAdmin, async (req, res) => {
  const errors = validateProductInput(req.body);
  if (errors.length) {
    return res.status(400).json({ error: errors.join(" ") });
  }
  const p = normalizeProductInput(req.body);
  const specs = JSON.stringify(p.specs || { Marca: p.brand || "NovaTech", SKU: p.sku || "Sin SKU" });

  if (p.id) {
    await pool.query(
      `UPDATE products SET name=?, description=?, category=?, brand=?, sku=?, price=?, old_price=?,
       stock=?, tag=?, image=?, specs=?, featured=?, is_new=?, active=? WHERE id=?`,
      [p.name, p.description, p.category, p.brand, p.sku, p.price, p.oldPrice,
       p.stock, p.tag, p.image, specs, !!p.featured, !!p.new, p.active !== false, p.id]
    );
    return res.json({ id: Number(p.id), ...p });
  }

  const [result] = await pool.query(
    `INSERT INTO products (name, description, category, brand, sku, price, old_price, stock, tag, image, specs, featured, is_new, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.name, p.description, p.category, p.brand, p.sku, p.price, p.oldPrice,
     p.stock, p.tag, p.image, specs, !!p.featured, !!p.new, p.active !== false]
  );
  res.json({ id: result.insertId, ...p });
});

// Activar / desactivar producto.
router.patch("/:id/status", requireAdmin, async (req, res) => {
  await pool.query("UPDATE products SET active = ? WHERE id = ?", [!!req.body.active, req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
