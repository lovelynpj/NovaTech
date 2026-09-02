(function () {
  /* Aplicación principal: vistas, navegación, interacción del cliente y eventos globales.
     Ahora los datos vienen del servidor, así que gran parte del código espera
     ("await") la respuesta antes de mostrar la pantalla. */
  const { apiFetch } = window.NovaApi;
  const { products, categories, money } = window.NovaProducts;
  const { getCart, addToCart, changeQuantity, removeFromCart, cartCount } = window.NovaCart;
  const { userLogged, loginUser, logoutUser } = window.NovaLogin;
  const {
    isAdmin,
    adminLogin,
    logoutAdmin,
    adminView,
    productForm,
    upsertProduct,
    setProductStatus,
    saveSettings,
    getSettingsCached,
    loadSettings,
    addPromotion,
    uploadProductImage,
  } = window.NovaAdmin;
  const { getOrders, createOrder, deleteCustomer } = window.NovaOrders;

  const app = document.querySelector("#app"),
    nav = document.querySelector("#navbar"),
    footer = document.querySelector("#footer");
  let favorites = JSON.parse(localStorage.getItem("novatech-favorites") || "[]");
  let adminSection = "dashboard";
  const route = () => location.hash.slice(1).split("?")[0] || "home";
  const toast = (message, error = false) => {
    const el = document.createElement("div");
    el.className = `toast ${error ? "error" : ""}`;
    el.textContent = message;
    document.querySelector("#toast-region").append(el);
    setTimeout(() => el.remove(), 2800);
  };
  const link = (to, label) =>
    `<a href="#${to}" class="${route() === to ? "active" : ""}">${label}</a>`;

  function renderChrome() {
    nav.innerHTML = `<div class="nav-inner"><button class="icon-btn menu-btn" aria-label="Menú">☰</button><a class="brand" href="#home">nova<i>tech</i></a><nav class="nav-links">${link("home", "Inicio")}${link("shop", "Tienda")}${link("about", "Nosotros")}</nav><div class="nav-actions"><input class="search" id="global-search" placeholder="Buscar productos..." /><button class="icon-btn" aria-label="Mi cuenta" data-route="account">♙</button><button class="icon-btn" aria-label="Carrito" data-route="cart">🛒<b class="cart-count">${cartCount()}</b></button></div></div>`;
    footer.innerHTML = `<div class="footer-grid"><div><a class="brand" href="#home">nova<i>tech</i></a><p>Tecnología seleccionada para hacer más simple lo que importa.</p></div><div><h4>Comprar</h4><a href="#shop">Todos los productos</a><a href="#shop?category=Audio">Audio</a><a href="#shop?category=Computación">Computación</a></div><div><h4>Ayuda</h4><a href="#about">Envíos y entregas</a><a href="#about">Cambios y devoluciones</a><a href="#about">Preguntas frecuentes</a></div><div><h4>Seguinos</h4><a href="#">Instagram</a><a href="#">TikTok</a><a href="#novatech">Acceso administrador</a></div></div><div class="footer-bottom">© 2026 NovaTech. Todos los derechos reservados.</div>`;
  }

  function productCard(p) {
    const fav = favorites.includes(p.id);
    return `<article class="product-card"><span class="tag">${p.tag || "Disponible"}</span><button class="favorite ${fav ? "active" : ""}" data-fav="${p.id}" aria-label="Favorito">${fav ? "♥" : "♡"}</button><a class="product-image" href="#product/${p.id}"><img src="${p.image}" alt="${p.name}" loading="lazy"></a><div class="product-info"><span class="product-category">${p.category}</span><a href="#product/${p.id}" class="product-title">${p.name}</a><div class="prices"><span class="price">${money(p.price)}</span>${p.oldPrice ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}<span class="stock">${p.stock} disp.</span></div><div class="product-actions"><a class="btn btn-outline btn-sm" href="#product/${p.id}">Ver detalle</a><button class="btn btn-primary cart-add" data-add="${p.id}" aria-label="Agregar al carrito">+</button></div></div></article>`;
  }

  function home() {
    return `<section class="hero"><div class="hero-content"><p class="eyebrow">Tecnología para tu ritmo</p><h1>Lo mejor de la tecnología, más cerca.</h1><p>Descubrí productos seleccionados que suman diseño, potencia y practicidad a cada día.</p><div class="hero-actions"><a class="btn btn-primary" href="#shop">Comprar ahora →</a><a class="btn btn-outline" href="#shop?category=Audio">Explorar audio</a></div></div></section><section class="container section"><div class="section-heading"><div><p class="eyebrow">Elegidos para vos</p><h2>Productos destacados</h2></div><a href="#shop" class="btn btn-outline">Ver catálogo</a></div><div class="grid products-grid">${products.filter((p) => p.featured).map(productCard).join("")}</div></section><section class="container section"><div class="section-heading"><div><p class="eyebrow">Encontrá lo tuyo</p><h2>Comprá por categoría</h2></div></div><div class="grid categories">${categories.map((c) => {
      const p = products.find((x) => x.category === c);
      return p
        ? `<a href="#shop?category=${c}" class="category"><img src="${p.image}" alt="${c}"><strong>${c}</strong><span>Explorar productos →</span></a>`
        : "";
    }).join("")}</div></section><section class="benefits section"><div class="container"><div class="grid benefits-grid"><div class="benefit"><div class="benefit-icon">▣</div><h3>Envíos a todo el país</h3><p>Recibí tu compra de forma segura y con seguimiento.</p></div><div class="benefit"><div class="benefit-icon">◫</div><h3>Pagos protegidos</h3><p>Elegí la alternativa que mejor se adapte a vos.</p></div><div class="benefit"><div class="benefit-icon">♡</div><h3>Atención cercana</h3><p>Estamos para ayudarte antes y después de comprar.</p></div></div></div></section><section class="container section"><div class="section-heading"><div><p class="eyebrow">Experiencias reales</p><h2>Nos eligen todos los días</h2></div></div><div class="grid reviews"><article class="review"><div class="stars">★★★★★</div><p>"El proceso fue simple y mi pedido llegó antes de lo esperado. Muy buena experiencia."</p><strong>Camila R.</strong></article><article class="review"><div class="stars">★★★★★</div><p>"Encontré justo lo que buscaba y la calidad del producto es excelente."</p><strong>Martín L.</strong></article><article class="review"><div class="stars">★★★★★</div><p>"Atención rápida, sitio claro y productos impecables. Volvería a comprar."</p><strong>Sofía G.</strong></article></div></section>`;
  }

  function shop() {
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    const selected = params.get("category") || "";
    return `<section class="container catalog-layout"><aside class="filters"><h3>Filtrar productos</h3><span class="filter-label">Categorías</span>${categories.map((c) => `<label class="filter-option"><input type="radio" name="category" value="${c}" ${selected === c ? "checked" : ""}>${c}</label>`).join("")}<label class="filter-option"><input type="radio" name="category" value="" ${!selected ? "checked" : ""}>Todos</label></aside><div><div class="catalog-top"><div><p class="eyebrow">Catálogo</p><h1>Todo lo que necesitás</h1></div><select class="select" id="sort"><option value="popular">Más vendidos</option><option value="low">Menor precio</option><option value="high">Mayor precio</option><option value="new">Más recientes</option></select></div><p class="muted" id="results-count"></p><div class="grid products-grid" id="products-list"></div></div></section>`;
  }

  function showProducts() {
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    let data = [...products];
    const cat = params.get("category"),
      q = params.get("q")?.toLowerCase();
    if (cat) data = data.filter((p) => p.category === cat);
    if (q) data = data.filter((p) => `${p.name} ${p.category} ${p.price}`.toLowerCase().includes(q));
    const sort = document.querySelector("#sort")?.value || "popular";
    if (sort === "low") data.sort((a, b) => a.price - b.price);
    if (sort === "high") data.sort((a, b) => b.price - a.price);
    if (sort === "popular") data.sort((a, b) => b.sold - a.sold);
    if (sort === "new") data.sort((a, b) => Boolean(b.new) - Boolean(a.new));
    document.querySelector("#products-list").innerHTML = data.length
      ? data.map(productCard).join("")
      : '<div class="empty">No encontramos productos con esos filtros.</div>';
    document.querySelector("#results-count").textContent = `${data.length} productos disponibles`;
  }

  function detail(id) {
    const p = products.find((p) => p.id === Number(id));
    if (!p) return notFound();
    return `<div class="container breadcrumbs"><a href="#home">Inicio</a> / <a href="#shop">Tienda</a> / ${p.category}</div><section class="container product-detail"><div class="detail-image"><img src="${p.image}" alt="${p.name}"></div><div class="detail-info"><p class="eyebrow">${p.category} · ${p.tag || "Disponible"}</p><h1>${p.name}</h1><div class="prices"><span class="price">${money(p.price)}</span>${p.oldPrice ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}</div><p>${p.description}</p><p class="stock">● ${p.stock} unidades disponibles</p><div class="specs">${Object.entries(p.specs || {}).map(([k, v]) => `<div class="spec"><span class="muted">${k}</span><strong>${v}</strong></div>`).join("")}</div><div class="buy-actions"><div class="quantity"><button data-qty="-1">−</button><span id="detail-qty">1</span><button data-qty="1">+</button></div><button class="btn btn-primary" data-detail-add="${p.id}">Agregar al carrito</button></div></div></section><section class="container section"><div class="section-heading"><div><p class="eyebrow">También te puede interesar</p><h2>Productos relacionados</h2></div></div><div class="grid products-grid">${products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 3).map(productCard).join("")}</div></section>`;
  }

  function cart() {
    const items = getCart()
      .map((item) => ({ ...products.find((p) => p.id === item.id), quantity: item.quantity }))
      .filter((p) => p.id);
    const subtotal = items.reduce((s, p) => s + p.price * p.quantity, 0),
      shipping = subtotal >= 150000 || !items.length ? 0 : 8900;
    return `<section class="container cart-page"><p class="eyebrow">Tu compra</p><h1>Carrito</h1><div class="cart-layout"><div class="cart-list">${items.length ? items.map((p) => `<article class="cart-item"><img src="${p.image}" alt="${p.name}"><div><strong>${p.name}</strong><div class="muted" style="font-size:12px">${money(p.price)}</div><div class="quantity" style="margin-top:8px"><button data-change="${p.id}" data-amount="-1">−</button><span>${p.quantity}</span><button data-change="${p.id}" data-amount="1">+</button></div><button class="remove" data-remove="${p.id}">Eliminar</button></div><strong class="price">${money(p.price * p.quantity)}</strong></article>`).join("") : '<div class="empty">Tu carrito está vacío.<br><br><a class="btn btn-primary" href="#shop">Explorar productos</a></div>'}</div><aside class="summary"><h3>Resumen de compra</h3><div class="summary-row"><span>Subtotal</span><span>${money(subtotal)}</span></div><div class="summary-row"><span>Envío</span><span>${shipping ? "$8.900" : "Gratis"}</span></div><div class="summary-row summary-total"><span>Total</span><span>${money(subtotal + shipping)}</span></div>${items.length ? '<a class="btn btn-primary" href="#checkout">Continuar compra →</a>' : ""}</aside></div></section>`;
  }

  function checkout() {
    const items = getCart().map((i) => ({ ...products.find((p) => p.id === i.id), quantity: i.quantity }));
    const subtotal = items.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const shipping = 0;
    const total = subtotal + shipping;

    return `
      <section class="container checkout-page">
        <p class="eyebrow">Compra como invitado</p>
        <h1>Finalizar compra</h1>
        <div class="checkout-layout">
          <form class="checkout-form" id="checkout-form">
            <h3>Datos de entrega</h3>
            <p class="muted" style="font-size:13px">No necesitás crear una cuenta para comprar.</p>
            <div class="form-grid">
              <div class="field"><label>Nombre</label><input name="firstName" required placeholder="Tu nombre"></div>
              <div class="field"><label>Apellido</label><input name="lastName" required placeholder="Tu apellido"></div>
              <div class="field full"><label>Email</label><input name="email" type="email" required placeholder="nombre@email.com"></div>
              <div class="field full"><label>Teléfono</label><input name="phone" required placeholder="11 0000 0000"></div>
              <div class="field full"><label>Dirección</label><input name="address" required placeholder="Calle y número"></div>
              <div class="field"><label>Ciudad</label><input name="city" required placeholder="Ciudad"></div>
              <div class="field"><label>Código postal</label><input name="postalCode" required placeholder="0000"></div>
              <div class="field full"><label>¿Cómo recibís tu compra?</label><select name="deliveryMethod" id="delivery-method"><option value="Retiro">La retiro</option><option value="Envío">Quiero envío</option></select></div>
              <div class="field full"><label>Método de pago</label><select name="payment" id="payment-method"><option value="Mercado Pago">Mercado Pago</option><option value="Transferencia">Transferencia</option><option value="Efectivo">Efectivo</option></select></div>
            </div>
            <div class="delivery-details" id="pickup-details"><strong>Retiro a coordinar</strong><p>Nos pondremos en contacto por WhatsApp para definir día, horario y punto de retiro.</p></div>
            <div class="delivery-details hidden" id="shipping-details"><strong>Envío a coordinar</strong><p>Recibimos tu dirección y te contactaremos por WhatsApp para confirmar costo, fecha y seguimiento.</p></div>
            <button class="btn btn-primary" style="margin-top:20px">Confirmar pedido</button>
          </form>
          <aside class="summary"><h3>Tu pedido</h3>${items.map((p) => `<div class="summary-row"><span>${p.quantity} × ${p.name}</span><span>${money(p.price * p.quantity)}</span></div>`).join("")}<div class="summary-row"><span>Envío</span><span>${shipping ? money(shipping) : "A coordinar"}</span></div><div class="summary-row summary-total"><span>Total estimado</span><span>${money(total)}</span></div></aside>
        </div>
      </section>`;
  }

  function account() {
    const user = userLogged();
    if (!user)
      return `<section class="container account-page"><div class="account-card login-card"><p class="eyebrow">Mi cuenta opcional</p><h1>Ingresá a NovaTech</h1><p class="muted">Comprar no requiere una cuenta. Podés hacerlo directamente desde el checkout.</p><form id="login-form" class="form-grid"><div class="field full"><label>Email</label><input required name="email" type="email" placeholder="nombre@email.com"></div><div class="field full"><label>Contraseña</label><input required name="password" type="password" placeholder="••••••••"></div><button class="btn btn-primary field full">Ingresar</button></form><a href="#novatech" class="btn btn-outline" style="width:100%;margin-top:12px">Acceso administrador</a></div></section>`;
    return `<section class="container account-page"><p class="eyebrow">Mi cuenta</p><h1>Hola, ${user.name}</h1><div class="account-nav"><button class="active">Mis pedidos</button><button>Favoritos</button><button data-logout>Cerrar sesión</button></div><div class="account-card"><h3>Mis pedidos</h3><div class="empty">Las compras como invitado se consultan desde el email de confirmación.</div></div><p style="margin-top:18px"><a class="btn btn-outline btn-sm" href="#novatech">Acceso administrador</a></p></section>`;
  }

  // La única vista que necesita esperar al servidor por sí misma (login o panel completo).
  async function admin() {
    if (isAdmin()) return adminView(adminSection);
    return `<section class="container admin-login"><div class="account-card login-card"><p class="eyebrow">Acceso restringido</p><h1>Administración</h1><p class="muted">Ingresá con tu cuenta administrativa.</p><form class="form-grid" id="admin-form"><div class="field full"><label>Email</label><input name="email" type="email" required placeholder="admin@novatech.com"></div><div class="field full"><label>Contraseña</label><input name="password" type="password" required placeholder="••••••••"></div><button class="btn btn-primary field full">Entrar al panel</button></form></div></section>`;
  }

  function about() {
    return `<section class="container section" style="min-height:55vh"><p class="eyebrow">Nuestra filosofía</p><h1 style="font-size:42px;letter-spacing:-2px;max-width:670px">Tecnología elegida con criterio, para usar todos los días.</h1><p class="muted" style="max-width:620px;font-size:17px">En NovaTech reunimos productos confiables, funcionales y con diseño. Queremos que comprar tecnología se sienta claro, seguro y simple.</p></section>`;
  }

  function notFound() {
    return `<section class="container section"><div class="empty"><h2>Esta página no existe</h2><a class="btn btn-primary" href="#home">Volver al inicio</a></div></section>`;
  }

  function purchasePop() {
    if (document.querySelector(".purchase-pop")) return;
    const node = document.createElement("div");
    node.className = "purchase-pop";
    node.innerHTML = "<i>✓</i><div><strong></strong><span></span></div>";
    document.body.append(node);
    const samples = [
      ["Camila", "Auriculares Pulse Pro"],
      ["Mateo", "Notebook Air 14"],
      ["Sofía", "Smartwatch Orbit S2"],
      ["Tomás", "Parlante Wave 360"],
    ];
    let index = 0;
    const show = async () => {
      let data;
      try {
        const recent = await getOrders().catch(() => null);
        data = recent?.[0] ? [recent[0].customer.name, recent[0].items[0].name] : samples[index++ % samples.length];
      } catch {
        data = samples[index++ % samples.length];
      }
      node.querySelector("strong").textContent = `${data[0]} compró ${data[1]}`;
      node.querySelector("span").textContent = "Compra reciente en NovaTech";
      node.classList.add("show");
      setTimeout(() => node.classList.remove("show"), 5000);
    };
    setTimeout(show, 2500);
    setInterval(show, 16000);
  }

  function whatsappButton() {
    if (document.querySelector(".whatsapp-link")) return;
    const phone = getSettingsCached().whatsapp || "543512379493";
    const linkEl = document.createElement("a");
    linkEl.className = "whatsapp-link";
    linkEl.href = `https://wa.me/${phone}?text=Hola%20NovaTech%2C%20necesito%20ayuda%20con%20una%20compra.`;
    linkEl.target = "_blank";
    linkEl.rel = "noopener";
    linkEl.textContent = "◔ WhatsApp";
    document.body.append(linkEl);
  }

  // Renderizador central: pide los datos que hagan falta y muestra la vista.
  async function render() {
    renderChrome();
    const r = route(),
      [name, id] = r.split("/");

    try {
      if (name === "novatech" && isAdmin()) {
        await window.NovaProducts.loadAdminProducts();
      } else {
        await window.NovaProducts.loadProducts();
      }
    } catch (err) {
      app.innerHTML = `<section class="container section"><div class="empty"><h2>No pudimos conectar con el servidor</h2><p class="muted">${err.message}</p></div></section>`;
      return;
    }

    const views = { home, shop, cart, checkout, account, novatech: admin, about };
    let output;
    if (name === "product") output = detail(id);
    else if (views[name]) output = await views[name]();
    else output = notFound();

    app.innerHTML = output;
    if (name === "shop") showProducts();
    purchasePop();
    whatsappButton();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  document.addEventListener("click", async (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      addToCart(products.find((p) => p.id === +add.dataset.add));
      toast("Producto agregado al carrito");
      renderChrome();
    }
    const fav = e.target.closest("[data-fav]");
    if (fav) {
      const id = +fav.dataset.fav;
      favorites = favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id];
      localStorage.setItem("novatech-favorites", JSON.stringify(favorites));
      render();
    }
    const direct = e.target.closest("[data-route]");
    if (direct) location.hash = direct.dataset.route;
    const ch = e.target.closest("[data-change]");
    if (ch) {
      const p = products.find((p) => p.id === +ch.dataset.change);
      changeQuantity(p.id, +ch.dataset.amount, p.stock);
      render();
    }
    const rem = e.target.closest("[data-remove]");
    if (rem) {
      removeFromCart(+rem.dataset.remove);
      render();
    }
    if (e.target.matches("[data-qty]")) {
      const span = document.querySelector("#detail-qty");
      span.textContent = Math.max(1, +span.textContent + +e.target.dataset.qty);
    }
    const dAdd = e.target.closest("[data-detail-add]");
    if (dAdd) {
      const p = products.find((p) => p.id === +dAdd.dataset.detailAdd);
      for (let i = 0; i < +document.querySelector("#detail-qty").textContent; i++) addToCart(p);
      toast("Producto agregado al carrito");
      renderChrome();
    }
    if (e.target.matches("[data-logout]")) {
      logoutUser();
      render();
    }
    const adminTab = e.target.closest("[data-admin-section]");
    if (adminTab) {
      adminSection = adminTab.dataset.adminSection;
      if (adminSection === "products") await window.NovaProducts.loadAdminProducts();
      app.innerHTML = await adminView(adminSection);
    }

    const edit = e.target.closest("[data-edit-product]");
    if (edit) {
      app.innerHTML = productForm(edit.dataset.editProduct);
      return;
    }
    if (e.target.matches("[data-new-product]")) {
      app.innerHTML = productForm();
      return;
    }
    const toggle = e.target.closest("[data-toggle-product]");
    if (toggle) {
      const p = products.find((x) => x.id === Number(toggle.dataset.toggleProduct));
      try {
        await setProductStatus(p.id, p.active === false);
        adminSection = "products";
        app.innerHTML = await adminView(adminSection);
        toast("Estado del producto actualizado");
      } catch (err) {
        toast(err.message, true);
      }
    }

    const deleteBtn = e.target.closest("[data-delete-customer]");
    if (deleteBtn) {
      const email = deleteBtn.dataset.deleteCustomer;
      if (!window.confirm(`¿Eliminar a ${email} y sus pedidos guardados?`)) return;
      try {
        await deleteCustomer(email);
        adminSection = "customers";
        app.innerHTML = await adminView(adminSection);
        toast("Cliente eliminado");
      } catch (err) {
        toast(err.message, true);
      }
    }

    const copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      const alias = copyBtn.dataset.copy;
      try {
        await navigator.clipboard.writeText(alias);
        toast("Alias copiado");
      } catch {
        window.prompt("Copiá este alias:", alias);
      }
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.name === "category") {
      location.hash = `shop${e.target.value ? `?category=${e.target.value}` : ""}`;
    }
    if (e.target.id === "sort") showProducts();
    if (e.target.id === "payment-method") {
      // El detalle de transferencia/efectivo se coordina por WhatsApp; no hay
      // bloques que mostrar/ocultar acá porque ahora el pago principal es Mercado Pago.
    }
    if (e.target.id === "delivery-method") {
      document.querySelector("#pickup-details").classList.toggle("hidden", e.target.value !== "Retiro");
      document.querySelector("#shipping-details").classList.toggle("hidden", e.target.value !== "Envío");
    }
  });

  document.addEventListener("submit", async (e) => {
    // salert("SUBMIT: " + e.target.id);
    if (e.target.id === "login-form") {
      e.preventDefault();
      loginUser(e.target);
      toast("Sesión iniciada correctamente");
      render();
    }

    if (e.target.id === "admin-form") {
      e.preventDefault();
      const ok = await adminLogin(e.target);
      if (ok) {
        toast("Bienvenido al panel");
        adminSection = "dashboard";
        render();
      } else {
        toast("Credenciales incorrectas", true);
      }
    }

    if (e.target.id === "checkout-form") {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const items = getCart().map((i) => ({ id: i.id, quantity: i.quantity }));
      if (!items.length) {
        toast("Tu carrito está vacío", true);
        return;
      }
      try {
        if (data.payment === "Mercado Pago") {
          const order = await createOrder({
            customer: {
              name: `${data.firstName} ${data.lastName}`,
              email: data.email,
              phone: data.phone,
              address: data.address,
              city: data.city,
              postalCode: data.postalCode,
            },
            items,
            payment: data.payment,
            deliveryMethod: data.deliveryMethod,
          });
          const { checkoutUrl } = await apiFetch("/api/payments/create-preference", {
            method: "POST",
            body: JSON.stringify({ orderId: order.id }),
          });
          localStorage.removeItem("novatech-cart");
          window.location.href = checkoutUrl; // Vamos a la página de pago de Mercado Pago.
          return;
        }

        await createOrder({
          customer: {
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.phone,
            address: data.address,
            city: data.city,
            postalCode: data.postalCode,
          },
          items,
          payment: data.payment,
          deliveryMethod: data.deliveryMethod,
        });
        localStorage.removeItem("novatech-cart");
        toast("¡Pedido confirmado! Te contactaremos para coordinar el pago.");
        location.hash = "home";
      } catch (err) {
        toast(err.message || "No se pudo confirmar el pedido.", true);
      }
    }

    if (e.target.id === "product-form") {
      e.preventDefault();
      const form = new FormData(e.target),
        data = Object.fromEntries(form);
        data.id = data.productId;
        delete data.productId;
      data.active = data.active === "true";
      data.featured = form.has("featured");
      data.new = form.has("new");

      const submitBtn = document.querySelector("#product-form-submit");
      const fileInput = document.querySelector("#product-image-file");
      const newImageFile = fileInput?.files[0];

      if (!newImageFile && !data.image) {
        toast("Elegí una imagen para el producto.", true);
        return;
      }

      try {
        if (newImageFile) {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Subiendo imagen...";
          }
          data.image = await uploadProductImage(newImageFile);
        }
        // Si no eligió un archivo nuevo, "data.image" ya trae la URL actual
        // desde el input oculto #product-image-url.

        if (submitBtn) submitBtn.textContent = "Guardando...";
        await upsertProduct(data);
        adminSection = "products";
        app.innerHTML = await adminView(adminSection);
        toast("Producto guardado correctamente");
      } catch (err) {
        toast(err.message, true);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Guardar producto";
        }
      }
    }

    if (e.target.id === "settings-form") {
      e.preventDefault();
      try {
        await saveSettings(Object.fromEntries(new FormData(e.target)));
        toast("Configuración guardada");
      } catch (err) {
        toast(err.message, true);
      }
    }

    if (e.target.id === "promotion-form") {
      e.preventDefault();
      try {
        await addPromotion(Object.fromEntries(new FormData(e.target)));
        adminSection = "promotions";
        app.innerHTML = await adminView(adminSection);
        toast("Promoción creada");
      } catch (err) {
        toast(err.message, true);
      }
    }

    if (e.target.id === "security-form") {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      try {
        await apiFetch("/api/auth/change-password", {
          method: "POST",
          body: JSON.stringify({
            email: sessionStorage.getItem("novatech-admin-email"),
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
          }),
        });
        toast("Contraseña actualizada. Usala la próxima vez que entres.");
        e.target.reset();
      } catch (err) {
        toast(err.message, true);
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "global-search") {
      location.hash = `shop?q=${encodeURIComponent(e.target.value)}`;
    }
  });

  // Arranque: cargamos la configuración del negocio una vez y mostramos la primera pantalla.
  window.addEventListener("hashchange", render);
  loadSettings()
    .catch(() => {})
    .finally(render);
})();
