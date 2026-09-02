-- Esquema de NovaTech. Ejecutar una sola vez sobre la base de datos vacía en Aiven.
-- Reemplaza lo que hoy vive repartido en localStorage (products.js, orders.js, admin.js).

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  brand VARCHAR(100),
  sku VARCHAR(100),
  price INT NOT NULL,
  old_price INT,
  stock INT NOT NULL DEFAULT 0,
  tag VARCHAR(50),
  image VARCHAR(500),
  specs JSON,
  featured BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  sold INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  email VARCHAR(190) UNIQUE NOT NULL,
  phone VARCHAR(50),
  address VARCHAR(255),
  city VARCHAR(120),
  postal_code VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(30) PRIMARY KEY,
  customer_id INT NOT NULL,
  subtotal INT NOT NULL,
  shipping INT NOT NULL DEFAULT 0,
  total INT NOT NULL,
  payment VARCHAR(50),
  delivery_method VARCHAR(50),
  status VARCHAR(30) DEFAULT 'Pendiente',
  mp_payment_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(30) NOT NULL,
  product_id INT,
  name VARCHAR(190) NOT NULL,
  price INT NOT NULL,
  quantity INT NOT NULL,
  image VARCHAR(500),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS promotions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  code VARCHAR(50) NOT NULL,
  discount INT NOT NULL,
  validity VARCHAR(190),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  business_name VARCHAR(190),
  support_email VARCHAR(190),
  sender_email VARCHAR(190),
  whatsapp VARCHAR(50),
  shipping VARCHAR(190),
  payment VARCHAR(190)
);

INSERT IGNORE INTO settings (id, business_name, support_email, sender_email, whatsapp, shipping, payment)
VALUES (1, 'NovaTech', 'ventas@novatech.com', 'pedidos@novatech.com', '543512379493', 'Envíos a todo el país', 'Transferencia y efectivo');
