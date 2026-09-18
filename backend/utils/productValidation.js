// Valida y normaliza los datos de un producto antes de guardarlo en la base.
// Nunca confía en lo que llega del frontend: precios y stock siempre se
// re-verifican acá, sin importar qué haya validado (o no) el navegador.

const MAX_TEXT_LENGTH = 190;
const MAX_PRICE = 100_000_000; // 100 millones: techo razonable para evitar overflow/abuso.

function isPlainNonEmptyString(value, maxLength = MAX_TEXT_LENGTH) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

// Acepta números y strings numéricos (el form de admin manda strings),
// pero rechaza explícitamente NaN, Infinity, negativos y no-enteros.
function isValidNonNegativeInt(value, { allowZero = true } = {}) {
  if (value === null || value === undefined || value === "") return false;
  const n = Number(value);
  if (!Number.isFinite(n)) return false; // descarta NaN e Infinity/-Infinity
  if (!Number.isInteger(n)) return false;
  if (n < 0) return false;
  if (!allowZero && n === 0) return false;
  if (n > MAX_PRICE) return false;
  return true;
}

function validateProductInput(p) {
  const errors = [];

  if (!p || typeof p !== "object") {
    return ["Datos de producto inválidos."];
  }
  if (!isPlainNonEmptyString(p.name)) errors.push("El nombre es obligatorio y debe ser texto válido.");
  if (!isPlainNonEmptyString(p.description, 5000)) errors.push("La descripción es obligatoria.");
  if (!isPlainNonEmptyString(p.category, 100)) errors.push("La categoría es obligatoria.");

  if (!isValidNonNegativeInt(p.price, { allowZero: false })) {
    errors.push("El precio debe ser un número entero mayor a 0.");
  }
  if (p.oldPrice !== undefined && p.oldPrice !== null && p.oldPrice !== "") {
    if (!isValidNonNegativeInt(p.oldPrice, { allowZero: false })) {
      errors.push("El precio anterior debe ser un número entero mayor a 0.");
    }
  }
  if (!isValidNonNegativeInt(p.stock, { allowZero: true })) {
    errors.push("El stock debe ser un número entero mayor o igual a 0.");
  }

  return errors;
}

// Devuelve los valores ya normalizados a Number entero, listos para guardar.
function normalizeProductInput(p) {
  return {
    ...p,
    price: Math.round(Number(p.price)),
    oldPrice: p.oldPrice !== undefined && p.oldPrice !== null && p.oldPrice !== "" ? Math.round(Number(p.oldPrice)) : null,
    stock: Math.round(Number(p.stock)),
  };
}

module.exports = { validateProductInput, normalizeProductInput, isValidNonNegativeInt };
