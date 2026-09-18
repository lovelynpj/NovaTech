(function () {
  /* Carrito: guarda productos y cantidades en el navegador mediante localStorage. */
  const KEY = "novatech-cart";

  // CORREGIDO: antes, si localStorage tenía un JSON corrupto (por ejemplo,
  // por una extensión del navegador que lo pisó a medias, o el usuario
  // editándolo a mano desde devtools), JSON.parse() tiraba una excepción
  // sin atrapar y rompía TODA la app (cualquier pantalla que llamara a
  // getCart() explotaba). Ahora, si el contenido no es JSON válido o no es
  // un array de items bien formados, se descarta y se arranca con carrito
  // vacío en vez de romper la aplicación entera.
  function getCart() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("Formato de carrito inválido.");
      return parsed.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          Number.isInteger(item.id) &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0
      );
    } catch {
      localStorage.removeItem(KEY);
      return [];
    }
  }

  const saveCart = (cart) => localStorage.setItem(KEY, JSON.stringify(cart));

  // CORREGIDO: antes se podía agregar un producto con stock 0 al carrito
  // (quedaba con quantity: 0, un estado inconsistente). Ahora se rechaza
  // directamente si no hay stock disponible. El backend igual vuelve a
  // validar el stock real al crear el pedido — esto es solo para que la
  // experiencia en el navegador sea coherente.
  function addToCart(product) {
    if (!product || !(Number(product.stock) > 0)) {
      return getCart();
    }
    const cart = getCart();
    const item = cart.find((i) => i.id === product.id);
    if (item) {
      item.quantity = Math.min(item.quantity + 1, product.stock);
    } else {
      cart.push({ id: product.id, quantity: 1 });
    }
    saveCart(cart);
    return cart;
  }

  function changeQuantity(id, amount, stock) {
    let cart = getCart();
    const item = cart.find((i) => i.id === id);
    if (item) {
      const next = item.quantity + amount;
      if (!(stock > 0) || next <= 0) {
        cart = cart.filter((i) => i.id !== id);
      } else {
        item.quantity = Math.max(1, Math.min(next, stock));
      }
    }
    saveCart(cart);
    return cart;
  }

  function removeFromCart(id) {
    const cart = getCart().filter((i) => i.id !== id);
    saveCart(cart);
    return cart;
  }

  const cartCount = () => getCart().reduce((sum, item) => sum + item.quantity, 0);

  window.NovaCart = {
    getCart,
    addToCart,
    changeQuantity,
    removeFromCart,
    cartCount,
  };
})();
