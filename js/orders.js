(function () {
  /* Pedidos y clientes: ahora se guardan en la base de datos compartida,
     no en el navegador de cada persona. */
  const { apiFetch } = window.NovaApi;

  // Crea un pedido. Solo mandamos {id, quantity} de cada item: los precios
  // y nombres los toma el backend directo de la base, para que nadie pueda
  // manipular el total editando el código del navegador.
  async function createOrder({ customer, items, payment, deliveryMethod }) {
    return apiFetch("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customer,
        items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
        payment,
        deliveryMethod,
      }),
    });
  }

  async function getOrders() {
    return apiFetch("/api/orders");
  }

  async function getCustomers() {
    return apiFetch("/api/customers");
  }

  async function deleteCustomer(email) {
    return apiFetch(`/api/customers/${encodeURIComponent(email)}`, { method: "DELETE" });
  }

  window.NovaOrders = { createOrder, getOrders, getCustomers, deleteCustomer };
})();
