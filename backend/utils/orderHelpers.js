// Helpers puros (sin dependencia de DB/red) para poder testearlos de forma aislada.
const crypto = require("crypto");

class ValidationError extends Error {}

// Valida que "items" sea un array no vacío de {id, quantity} bien formados.
// Rechaza cantidades <= 0, no enteras, o IDs inválidos. Esto es lo que evita
// que una cantidad negativa (ej: -5) termine SUMANDO stock en vez de restarlo
// (porque "stock = stock - (-5)" es "stock = stock + 5"), y evita cantidades
// absurdas enviadas a mano manipulando el request.
function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError("El carrito está vacío.");
  }
  if (items.length > 50) {
    throw new ValidationError("El pedido tiene demasiados productos distintos.");
  }
  for (const item of items) {
    if (!item || typeof item !== "object") {
      throw new ValidationError("Hay un producto inválido en el pedido.");
    }
    const id = Number(item.id);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError("El identificador de un producto es inválido.");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ValidationError("La cantidad de cada producto debe ser un número entero mayor a 0.");
    }
    if (quantity > 100) {
      throw new ValidationError("No se pueden pedir más de 100 unidades del mismo producto.");
    }
  }
  return items;
}

// Combina items repetidos (mismo product_id enviado más de una vez) en una
// sola entrada sumando las cantidades. Así, sea que el request mande el mismo
// producto 1 vez con cantidad 3, o 3 veces con cantidad 1, el resultado final
// es siempre el mismo: se verifica stock y se descuenta UNA sola vez por la
// cantidad total real (antes, cada aparición repetida volvía a descontar
// stock por separado, permitiendo vaciar stock con menos unidades reales).
function mergeItems(items) {
  const merged = new Map();
  for (const item of items) {
    const id = Number(item.id);
    const quantity = Number(item.quantity);
    merged.set(id, (merged.get(id) || 0) + quantity);
  }
  return [...merged.entries()].map(([id, quantity]) => ({ id, quantity }));
}

// IDs de pedido: antes se usaba Date.now() recortado a los últimos 6 dígitos,
// lo que puede colisionar entre dos pedidos creados en la misma ventana de
// tiempo (dos compradores en el mismo segundo) y además es predecible/
// enumerable. Ahora sumamos 4 bytes de entropía criptográfica real:
// 2^32 combinaciones posibles por cada timestamp, imposible de predecir
// o de que choque con otro pedido en la práctica.
function generateOrderId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `NT-${timestamp}-${random}`;
}

module.exports = { ValidationError, validateItems, mergeItems, generateOrderId };
