(function () {
  /* Administración: vistas del panel, gestión de productos, promociones y configuración.
     El login ahora se valida en el servidor (con contraseña encriptada), no en el navegador. */
  const { apiFetch, apiUpload } = window.NovaApi;

  // Sube el archivo elegido en el form de producto y devuelve la URL de Cloudinary.
  async function uploadProductImage(file) {
    const formData = new FormData();
    formData.append("image", file);
    const result = await apiUpload("/api/products/upload-image", formData);
    return result.url;
  }
  const { products, categories, money, upsertProduct, setProductStatus } = window.NovaProducts;
  const { getOrders, getCustomers, deleteCustomer } = window.NovaOrders;

  // --- Sesión de administrador ---
  const isAdmin = () => !!sessionStorage.getItem("novatech-admin-token");
  const logoutAdmin = () => {
    sessionStorage.removeItem("novatech-admin-token");
    sessionStorage.removeItem("novatech-admin-email");
  };
  async function adminLogin(form) {
    const data = Object.fromEntries(new FormData(form));
    try {
      const result = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      sessionStorage.setItem("novatech-admin-token", result.token);
      sessionStorage.setItem("novatech-admin-email", result.email);
      return true;
    } catch {
      return false;
    }
  }

  // --- Configuración del negocio (se cachea localmente para uso instantáneo en la UI) ---
  const defaultSettings = {
    businessName: "NovaTech",
    supportEmail: "ventas@novatech.com",
    senderEmail: "pedidos@novatech.com",
    whatsapp: "543512379493",
    shipping: "Envíos a todo el país",
    payment: "Transferencia y efectivo",
  };
  let settingsCache = { ...defaultSettings };
  async function loadSettings() {
    settingsCache = await apiFetch("/api/settings");
    return settingsCache;
  }
  const getSettingsCached = () => settingsCache;
  async function saveSettings(data) {
    await apiFetch("/api/settings", { method: "POST", body: JSON.stringify(data) });
    await loadSettings();
  }

  // --- Promociones ---
  let promotionsCache = [];
  async function loadPromotions() {
    promotionsCache = await apiFetch("/api/promotions");
    return promotionsCache;
  }
  async function addPromotion(data) {
    await apiFetch("/api/promotions", { method: "POST", body: JSON.stringify(data) });
    await loadPromotions();
  }

  const date = (value) =>
    new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(value));
  const status = (value) => `<span class="status">${value}</span>`;
  const nav = (section) =>
    [
      ["dashboard", "▦ Dashboard"],
      ["products", "◈ Productos"],
      ["orders", "◷ Pedidos"],
      ["customers", "♙ Clientes"],
      ["promotions", "✦ Promociones"],
      ["settings", "⚙ Configuración"],
    ]
      .map(
        ([id, label]) =>
          `<button data-admin-section="${id}" class="${section === id ? "active" : ""}">${label}</button>`,
      )
      .join("");

  function orderRows(orders) {
    return orders.length
      ? orders
          .map(
            (order) => `
              <tr>
                <td><strong>${order.id}</strong><br><small class="muted">${date(order.createdAt)}</small></td>
                <td>${order.customer.name}<br><small class="muted">${order.customer.email}</small></td>
                <td>${order.items.map((item) => `${item.quantity}× ${item.name}`).join("<br>")}</td>
                <td>${order.payment}<br><small class="muted">${order.deliveryMethod || "Sin definir"}</small></td>
                <td>${money(order.total)}</td>
                <td>${status(order.status)}</td>
              </tr>`,
          )
          .join("")
      : '<tr><td colspan="6" class="muted">Aún no hay compras registradas.</td></tr>';
  }

  function productForm(id) {
    const p = products.find((x) => x.id === Number(id)) || {
      name: "",
      description: "",
      price: "",
      oldPrice: "",
      stock: "",
      category: categories[0],
      brand: "",
      image: "",
      tag: "Nuevo",
      sku: "",
      active: true,
      featured: false,
      new: false,
    };
    return `<section class="container admin-page"><aside class="admin-side"><h3>Administración</h3><nav class="admin-nav">${nav("products")}</nav></aside><div class="admin-content"><div class="admin-bar"><div><p class="eyebrow">${id ? "Editar" : "Nuevo"} producto</p><h1>${id ? p.name : "Agregar producto"}</h1></div><button class="btn btn-outline btn-sm" data-admin-section="products">← Volver</button></div><form class="checkout-form" id="product-form"><input type="hidden" name="productId" value="${p.id || ""}"><input type="hidden" name="image" id="product-image-url" value="${p.image || ""}"><div class="form-grid"><div class="field full"><label>Nombre</label><input name="name" required value="${p.name}"></div><div class="field full"><label>Descripción</label><textarea name="description" required rows="3">${p.description}</textarea></div><div class="field"><label>Precio</label><input name="price" type="number" required value="${p.price}"></div><div class="field"><label>Precio anterior (opcional)</label><input name="oldPrice" type="number" value="${p.oldPrice || ""}"></div><div class="field"><label>Stock</label><input name="stock" type="number" required value="${p.stock}"></div><div class="field"><label>Categoría</label><select name="category">${categories.map((c) => `<option ${p.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></div><div class="field"><label>Marca</label><input name="brand" value="${p.brand || ""}" placeholder="Marca"></div><div class="field"><label>SKU</label><input name="sku" value="${p.sku || ""}" placeholder="NOVA-001"></div><div class="field full"><label>Imagen principal</label><div class="image-upload-box"><img id="product-image-preview" src="${p.image || ""}" alt="Vista previa" style="${p.image ? "" : "display:none;"}max-width:160px;border-radius:10px;margin-bottom:10px;display:block;"><input type="file" id="product-image-file" accept="image/png,image/jpeg,image/webp,image/gif">${id ? '<small class="muted">Dejá este campo vacío para conservar la imagen actual.</small>' : ""}</div></div><div class="field"><label>Etiqueta</label><select name="tag"><option ${p.tag === "Nuevo" ? "selected" : ""}>Nuevo</option><option ${p.tag === "Oferta" ? "selected" : ""}>Oferta</option><option ${p.tag === "Disponible" ? "selected" : ""}>Disponible</option></select></div><div class="field"><label>Estado</label><select name="active"><option value="true" ${p.active !== false ? "selected" : ""}>Activo</option><option value="false" ${p.active === false ? "selected" : ""}>Inactivo</option></select></div><label class="filter-option"><input type="checkbox" name="featured" ${p.featured ? "checked" : ""}>Producto destacado</label><label class="filter-option"><input type="checkbox" name="new" ${p.new ? "checked" : ""}>Marcar como nuevo</label></div><button class="btn btn-primary" id="product-form-submit" style="margin-top:22px">Guardar producto</button></form></div></section>`;
  }

  function promotionsView(orders) {
    const best = [...products].sort((a, b) => b.sold - a.sold)[0];
    const low = products.find((product) => product.stock <= 8 && product.active !== false);
    const promotions = promotionsCache;
    return `<p class="eyebrow">Marketing inteligente</p><h1>Promociones</h1><p class="muted">Usá campañas cortas para aumentar ventas, mover stock o atraer primeras compras.</p><div class="grid promo-grid"><article class="promo-card"><span>MÁS VENDIDO</span><h3>${best?.name || "Producto destacado"}</h3><p>Probá un descuento del 10% por 48 horas para impulsar conversiones sobre tu producto con más interés.</p></article><article class="promo-card"><span>STOCK</span><h3>${low ? `Mover ${low.name}` : "Stock saludable"}</h3><p>${low ? `Quedan ${low.stock} unidades. Un cupón o combo puede ayudar a rotar este producto.` : "No hay productos con poco stock por ahora."}</p></article><article class="promo-card"><span>IDEA</span><h3>Primera compra</h3><p>Un cupón de bienvenida ayuda a convertir nuevas visitas sin aplicar descuentos a toda la tienda.</p></article></div><form class="checkout-form" id="promotion-form"><h3>Nueva promoción</h3><div class="form-grid"><div class="field"><label>Nombre de campaña</label><input name="name" required placeholder="Semana tecnológica"></div><div class="field"><label>Código de cupón</label><input name="code" required placeholder="NOVA10"></div><div class="field"><label>Descuento (%)</label><input name="discount" type="number" min="1" max="100" required placeholder="10"></div><div class="field"><label>Vigencia</label><input name="validity" required placeholder="Hasta el 30/06"></div></div><button class="btn btn-primary" style="margin-top:18px">Crear promoción</button></form><div class="admin-bar"><h2>Promociones activas</h2></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Campaña</th><th>Cupón</th><th>Descuento</th><th>Vigencia</th><th>Estado</th></tr></thead><tbody>${promotions.length ? promotions.map((promotion) => `<tr><td>${promotion.name}</td><td><strong>${promotion.code}</strong></td><td>${promotion.discount}%</td><td>${promotion.validity}</td><td>${status("Activa")}</td></tr>`).join("") : '<tr><td colspan="5" class="muted">Todavía no creaste promociones.</td></tr>'}</tbody></table></div>`;
  }

  function settingsView() {
    const s = getSettingsCached();
    return `<p class="eyebrow">Tu negocio</p><h1>Configuración</h1><form class="checkout-form" id="settings-form"><h3>Datos y comunicación</h3><div class="form-grid"><div class="field"><label>Nombre del negocio</label><input name="businessName" value="${s.businessName}"></div><div class="field"><label>Correo de soporte</label><input name="supportEmail" type="email" value="${s.supportEmail}"></div><div class="field full"><label>Correo remitente para pedidos</label><input name="senderEmail" type="email" value="${s.senderEmail}"><small class="muted">Este será el correo informado a tus clientes cuando conectes el servicio de emails.</small></div><div class="field"><label>WhatsApp de atención</label><input name="whatsapp" value="${s.whatsapp}"></div><div class="field"><label>Métodos de pago</label><input name="payment" value="${s.payment}"></div><div class="field full"><label>Métodos de envío</label><input name="shipping" value="${s.shipping}"></div></div><button class="btn btn-primary" style="margin-top:20px">Guardar configuración</button></form><form class="checkout-form" id="security-form" style="margin-top:18px"><h3>Seguridad</h3><div class="form-grid"><div class="field"><label>Correo administrador</label><input type="email" value="${sessionStorage.getItem("novatech-admin-email") || ""}" disabled></div><div class="field"><label>Contraseña actual</label><input type="password" name="currentPassword" placeholder="Contraseña actual"></div><div class="field"><label>Nueva contraseña</label><input type="password" name="newPassword" placeholder="Nueva contraseña"></div></div><button class="btn btn-outline" style="margin-top:16px">Actualizar credenciales</button></form>`;
  }

  function customersView(customers) {
    const rows = customers.length
      ? customers
          .map(
            (customer) => `
              <tr>
                <td><strong>${customer.name}</strong></td>
                <td>${customer.email}<br><small class="muted">${customer.phone || "Sin teléfono"}</small></td>
                <td>${customer.orders}</td>
                <td>${money(customer.spent)}</td>
                <td>${customer.lastOrder ? date(customer.lastOrder) : "—"}</td>
                <td><button class="btn btn-outline btn-sm" data-delete-customer="${customer.email}">Eliminar</button></td>
              </tr>`,
          )
          .join("")
      : '<tr><td colspan="6" class="muted">Los clientes aparecerán aquí al completar su primera compra.</td></tr>';
    return `<p class="eyebrow">Base de clientes</p><h1>Clientes</h1><p class="muted">Personas que realizaron al menos una compra.</p><div class="admin-table-wrap" style="margin-top:24px"><table class="admin-table"><thead><tr><th>Cliente</th><th>Contacto</th><th>Compras</th><th>Total invertido</th><th>Última compra</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function dashboardView({ orders, customers, sales }) {
    const pickups = orders.filter((order) => order.deliveryMethod === "Retiro").length;
    const shipping = orders.filter((order) => order.deliveryMethod === "Envío").length;
    return `<p class="eyebrow">Panel de control</p><h1>Resumen del negocio</h1><p class="muted">Compras, clientes y entregas registradas desde tu tienda.</p><div class="grid stats"><div class="stat"><span>Ventas totales</span><strong>${money(sales)}</strong></div><div class="stat"><span>Clientes</span><strong>${customers.length}</strong></div><div class="stat"><span>Retiros a coordinar</span><strong>${pickups}</strong></div><div class="stat"><span>Envíos a coordinar</span><strong>${shipping}</strong></div></div><div class="admin-bar"><h2>Últimos pedidos</h2><button class="btn btn-outline btn-sm" data-admin-section="orders">Ver todos</button></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Productos</th><th>Pago y entrega</th><th>Total</th><th>Estado</th></tr></thead><tbody>${orderRows(orders.slice(0, 5))}</tbody></table></div>`;
  }

  function productsSectionView() {
    return `<div class="admin-bar"><div><p class="eyebrow">Catálogo</p><h1>Productos</h1></div><button class="btn btn-primary btn-sm" data-new-product>+ Nuevo producto</button></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Producto</th><th>SKU</th><th>Precio</th><th>Stock</th><th>Estado</th><th></th></tr></thead><tbody>${products.map((p) => `<tr><td><strong>${p.name}</strong><br><small class="muted">${p.category}</small></td><td>${p.sku || `NOVA-${String(p.id).slice(-3)}`}</td><td>${money(p.price)}</td><td>${p.stock}</td><td>${status(p.active === false ? "Inactivo" : "Activo")}</td><td><button class="btn btn-outline btn-sm" data-edit-product="${p.id}">Editar</button> <button class="btn btn-sm" data-toggle-product="${p.id}">${p.active === false ? "Activar" : "Desactivar"}</button></td></tr>`).join("")}</tbody></table></div>`;
  }

  function ordersSectionView(orders) {
    return `<p class="eyebrow">Ventas</p><h1>Pedidos</h1><p class="muted">Cada compra hecha aparece acá con su detalle.</p><div class="admin-table-wrap" style="margin-top:24px"><table class="admin-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Productos</th><th>Pago</th><th>Total</th><th>Estado</th></tr></thead><tbody>${orderRows(orders)}</tbody></table></div>`;
  }

  // Trae todo lo necesario de la API y arma el panel completo.
  async function adminView(section = "dashboard") {
    const [orders, customers] = await Promise.all([getOrders(), getCustomers()]);
    const sales = orders.reduce((sum, o) => sum + o.total, 0);

    if (section === "promotions") await loadPromotions();
    if (section === "settings") await loadSettings();

    const views = {
      dashboard: dashboardView({ orders, customers, sales }),
      products: productsSectionView(),
      orders: ordersSectionView(orders),
      customers: customersView(customers),
      promotions: promotionsView(orders),
      settings: settingsView(),
    };
    return `<section class="container admin-page"><aside class="admin-side"><h3>Administración</h3><nav class="admin-nav">${nav(section)}</nav></aside><div class="admin-content">${views[section] || views.dashboard}</div></section>`;
  }

  // Vista previa en vivo cuando el admin elige un nuevo archivo de imagen.
  document.addEventListener("change", (e) => {
    if (e.target.id !== "product-image-file") return;
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.querySelector("#product-image-preview");
    if (preview) {
      preview.src = URL.createObjectURL(file);
      preview.style.display = "block";
    }
  });

  window.NovaAdmin = {
    isAdmin,
    logoutAdmin,
    adminLogin,
    adminView,
    productForm,
    upsertProduct,
    setProductStatus,
    saveSettings,
    getSettingsCached,
    loadSettings,
    addPromotion,
    uploadProductImage,
  };
})();
