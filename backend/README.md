# NovaTech Backend — guía de puesta en marcha

Este backend reemplaza todo lo que hoy vive en `localStorage`: productos, pedidos, clientes,
configuración y login de administrador. Ahora todo se guarda en una base de datos MySQL real,
compartida entre vos y todos tus clientes.

## 1. Crear la base de datos en Aiven (gratis)

1. Entrá a https://aiven.io y creá una cuenta (no pide tarjeta para el plan gratis).
2. "Create service" → elegí **MySQL** → plan **Free**.
3. Cuando esté listo, andá a la pestaña "Overview" del servicio y copiá: Host, Port, User, Password, Database name.
4. Pegá esos datos en tu archivo `.env` (copiá `.env.example` como `.env` primero).

## 2. Crear las tablas

Con Node.js instalado en tu computadora:

```bash
npm install
npm run migrate
```

Esto crea todas las tablas y tu primer usuario administrador. Por defecto usa
`admin@novatech.com` / `cambiame123` — podés definir otro con `ADMIN_EMAIL` y
`ADMIN_PASSWORD` en el `.env` antes de correr el comando. **Cambiá la contraseña
apenas entres al panel**, usando el endpoint `/api/auth/change-password`.

## 3. Probarlo en tu computadora

```bash
npm run dev
```

Se levanta en `http://localhost:4000`. Probá abrir `http://localhost:4000` en el navegador:
deberías ver `{"status":"NovaTech API funcionando"}`.

## 4. Subir el backend a Render (gratis)

1. Subí esta carpeta a un repositorio de GitHub (puede ser privado).
2. Entrá a https://render.com → "New" → "Web Service" → conectá tu repo.
3. Build command: `npm install` — Start command: `npm start`.
4. En "Environment", cargá las mismas variables que tenés en tu `.env` (Render nunca
   lee el archivo `.env`, hay que cargarlas ahí a mano).
5. Sumá una variable más: `BACKEND_URL` con la URL que Render te va a dar
   (algo como `https://novatech-backend.onrender.com`).
6. Deploy. Cuando termine, correr la migración una vez más apuntando a la base de
   producción (podés hacerlo desde tu computadora, con el `.env` apuntando a Aiven).

> Nota: el plan gratis de Render "duerme" el servidor después de un rato sin uso,
> y tarda unos segundos en despertar con la primera visita del día. Es normal y
> esperable en un plan gratuito; si tu negocio crece, ahí sí conviene pasar a un
> plan pago para que esté siempre activo.

## 5. Conectar el frontend

En tu `app.js` (y los demás archivos JS de la tienda), cada lectura/escritura a
`localStorage` se reemplaza por un `fetch` a la API. Por ejemplo, así cambia la
carga de productos:

```js
// Antes (products.js):
const products = JSON.parse(localStorage.getItem("novatech-products") || "null") || defaultProducts;

// Después:
const products = await fetch("https://novatech-backend.onrender.com/api/products").then(r => r.json());
```

Esto implica reescribir varias partes del frontend para que trabajen con datos
que llegan async (con `fetch`) en vez de estar disponibles al instante como con
`localStorage`. Es el paso que sigue — avisame cuando quieras que lo encaremos
juntos, archivo por archivo.

## 6. Mercado Pago

1. Creá tu cuenta en https://www.mercadopago.com.ar/developers.
2. "Tus integraciones" → creá una app → copiá el **Access Token de producción**.
3. Pegalo en `MP_ACCESS_TOKEN` en las variables de entorno de Render.
4. El flujo queda así: tu checkout crea el pedido en la base → pide un link de pago
   a `/api/payments/create-preference` → redirigís al comprador a ese link →
   Mercado Pago le cobra ahí → te avisa solo por webhook → el pedido pasa a "Pagado"
   automáticamente en tu panel.

## Rutas disponibles

| Método | Ruta | Qué hace | Requiere login admin |
|---|---|---|---|
| GET | `/api/products` | Catálogo público | No |
| POST | `/api/products` | Crear/editar producto | Sí |
| PATCH | `/api/products/:id/status` | Activar/desactivar | Sí |
| POST | `/api/orders` | Crear pedido (descuenta stock) | No |
| GET | `/api/orders` | Ver todos los pedidos | Sí |
| GET | `/api/customers` | Ver clientes | Sí |
| DELETE | `/api/customers/:email` | Borrar cliente | Sí |
| GET/POST | `/api/settings` | Configuración del negocio | Solo POST |
| GET/POST | `/api/promotions` | Promociones | Sí |
| POST | `/api/auth/login` | Login admin (devuelve token) | No |
| POST | `/api/payments/create-preference` | Link de pago Mercado Pago | No |
| POST | `/api/payments/webhook` | Notificación automática de MP | No (la usa MP) |
