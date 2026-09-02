(function () {
  /* Carrito: guarda productos y cantidades en el navegador mediante localStorage. */
  const KEY = "novatech-cart";
  const getCart = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const saveCart = (cart) => localStorage.setItem(KEY, JSON.stringify(cart));
  function addToCart(product) {
    const cart = getCart();
    const item = cart.find((i) => i.id === product.id);
    if (item) {
      item.quantity = Math.min(item.quantity + 1, product.stock);
    } else cart.push({ id: product.id, quantity: 1 });
    saveCart(cart);
    return cart;
  }
  function changeQuantity(id, amount, stock) {
    let cart = getCart();
    const item = cart.find((i) => i.id === id);
    if (item)
      item.quantity = Math.max(1, Math.min(item.quantity + amount, stock));
    saveCart(cart);
    return cart;
  }
  function removeFromCart(id) {
    const cart = getCart().filter((i) => i.id !== id);
    saveCart(cart);
    return cart;
  }
  const cartCount = () =>
    getCart().reduce((sum, item) => sum + item.quantity, 0);
  window.NovaCart = {
    getCart,
    addToCart,
    changeQuantity,
    removeFromCart,
    cartCount,
  };
})();
