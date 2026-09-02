(function () {
  /* Catálogo: ahora vive en la base de datos. Este módulo mantiene un array
     local "products" que se recarga desde la API, para que el resto del
     código (app.js, admin.js) pueda seguir usándolo como antes. */
  const { apiFetch } = window.NovaApi;
  const categories = ["Audio", "Computación", "Celulares", "Accesorios"];

  // OJO: nunca reasignamos "products" a un array nuevo (products = [...]),
  // porque otros archivos ya guardaron una referencia a este mismo array al
  // hacer "const { products } = window.NovaProducts". En cambio, lo vaciamos
  // y lo volvemos a llenar en el mismo lugar de memoria.
  const products = [];
  const replaceAll = (data) => {
    products.length = 0;
    products.push(...data);
  };

  // Para la tienda pública: solo productos activos.
  async function loadProducts() {
    const data = await apiFetch("/api/products");
    replaceAll(data);
    return products;
  }

  // Para el panel admin: todos, incluidos los inactivos.
  async function loadAdminProducts() {
    const data = await apiFetch("/api/products/admin");
    replaceAll(data);
    return products;
  }

  async function upsertProduct(data) {
    const saved = await apiFetch("/api/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
    await loadAdminProducts();
    return saved;
  }

  async function setProductStatus(id, active) {
    await apiFetch(`/api/products/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ active }),
    });
    await loadAdminProducts();
  }

  const money = (value) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(value);

  window.NovaProducts = {
    products,
    categories,
    money,
    loadProducts,
    loadAdminProducts,
    upsertProduct,
    setProductStatus,
  };
})();
