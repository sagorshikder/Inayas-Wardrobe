import mysql from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';

let pool: Pool | null = null;
let schemaInitialized = false;

export function isMysqlConfigured(): boolean {
  return Boolean(
    process.env.DB_HOST?.trim() &&
      process.env.DB_NAME?.trim() &&
      process.env.DB_USER?.trim(),
  );
}

export function getMysqlPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST?.trim() || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME?.trim(),
      user: process.env.DB_USER?.trim(),
      password: process.env.DB_PASSWORD ?? '',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

export async function ensureMysqlSchema(): Promise<void> {
  if (schemaInitialized || !isMysqlConfigured()) return;
  const db = getMysqlPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) NOT NULL,
      email VARCHAR(191) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(120) NOT NULL DEFAULT '',
      role ENUM('admin', 'customer') NOT NULL DEFAULT 'customer',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(64) NOT NULL,
      name VARCHAR(180) NOT NULL,
      cat VARCHAR(80) NOT NULL DEFAULT 'Wardrobe',
      price INT UNSIGNED NOT NULL DEFAULT 0,
      old_price INT UNSIGNED NOT NULL DEFAULT 0,
      description TEXT NOT NULL,
      tag VARCHAR(60) DEFAULT NULL,
      rating DECIMAL(3,1) NOT NULL DEFAULT 4.8,
      reviews_count INT UNSIGNED NOT NULL DEFAULT 0,
      image LONGTEXT NOT NULL,
      thumb LONGTEXT DEFAULT NULL,
      images_json LONGTEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_products_cat (cat),
      KEY idx_products_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) NOT NULL,
      customer_name VARCHAR(120) NOT NULL,
      phone VARCHAR(32) NOT NULL,
      address VARCHAR(320) NOT NULL,
      note VARCHAR(500) DEFAULT NULL,
      payment_method ENUM('COD', 'bKash', 'Nagad', 'Rocket', 'IBBL') NOT NULL DEFAULT 'COD',
      total INT UNSIGNED NOT NULL DEFAULT 0,
      status ENUM('New', 'Confirmed', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'New',
      items_json LONGTEXT NOT NULL,
      user_id VARCHAR(64) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_orders_status (status),
      KEY idx_orders_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id VARCHAR(64) NOT NULL,
      name VARCHAR(120) NOT NULL,
      phone VARCHAR(32) NOT NULL,
      interest VARCHAR(120) NOT NULL,
      message TEXT DEFAULT NULL,
      status ENUM('New', 'Contacted', 'Closed') NOT NULL DEFAULT 'New',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_inquiries_status (status),
      KEY idx_inquiries_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS gallery (
      id VARCHAR(64) NOT NULL,
      cat VARCHAR(80) NOT NULL DEFAULT 'Wardrobe',
      title VARCHAR(180) NOT NULL,
      image LONGTEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_gallery_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id VARCHAR(64) NOT NULL,
      name VARCHAR(140) NOT NULL,
      stars TINYINT UNSIGNED NOT NULL DEFAULT 5,
      text TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_reviews_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key VARCHAR(64) NOT NULL,
      setting_value_json LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  schemaInitialized = true;
}
