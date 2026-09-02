# NovaTech — guía rápida del proyecto

Esta es una tienda de demostración hecha con HTML, CSS y JavaScript puro. Los datos se guardan localmente en el navegador para simular el comportamiento de una futura base de datos.

## Dónde editar cada parte

- `index.html`: estructura inicial y orden de carga de estilos y scripts.
- `css/style.css`: colores, tipografía, navegación, botones y componentes compartidos.
- `css/home.css`: hero, categorías, beneficios y opiniones de Inicio.
- `css/shop.css`: catálogo, productos, carrito, checkout y cuenta.
- `css/admin.css`: panel de administración, tablas y promociones.
- `css/extras.css`: botón flotante de WhatsApp.
- `js/products.js`: productos iniciales y funciones para crear, editar y activar/desactivar productos.
- `js/cart.js`: lógica del carrito.
- `js/orders.js`: pedidos de compra como invitado y clientes derivados de esos pedidos.
- `js/login.js`: inicio/cierre de sesión opcional para usuarios.
- `js/admin.js`: pantallas y acciones de administración.
- `js/app.js`: navegación, vistas públicas y eventos generales de la tienda.

## Datos de demostración

Los productos, pedidos y configuraciones se guardan en `localStorage`. Al conectar un backend, los módulos `products.js`, `orders.js` y `admin.js` son los lugares principales para reemplazar esas lecturas y guardados por llamadas a una API.

## Acceso administrativo

- Email: `admin@novatech.com`
- Contraseña: `admin123`
