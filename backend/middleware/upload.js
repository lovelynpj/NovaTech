const multer = require("multer");

// Guardamos el archivo en memoria (no en disco) porque lo vamos a
// reenviar directo a Cloudinary y no necesitamos conservarlo localmente.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Formato de imagen no permitido. Usá JPG, PNG, WEBP o GIF."));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo
});

module.exports = upload;
