import mysql from 'mysql2/promise';
import type { Pool, RowDataPacket } from 'mysql2/promise';

export interface MysqlConnectionConfig {
  host: string;
  port: number;
  socketPath?: string;
  database: string;
  user: string;
  password: string;
}

let pool: Pool | null = null;
let schemaInitialized = false;

export function getMysqlConfig(): MysqlConnectionConfig {
  return {
    host: process.env.DB_HOST?.trim() || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    socketPath: process.env.DB_SOCKET?.trim() || undefined,
    database: process.env.DB_NAME?.trim() || '',
    user: process.env.DB_USER?.trim() || '',
    password: process.env.DB_PASSWORD ?? '',
  };
}

export function isMysqlConfigured(): boolean {
  const cfg = getMysqlConfig();
  return Boolean((cfg.host || cfg.socketPath) && cfg.database && cfg.user);
}

export function getMysqlPool(): Pool {
  if (!pool) {
    const cfg = getMysqlConfig();
    pool = mysql.createPool({
      host: cfg.socketPath ? undefined : cfg.host,
      port: cfg.socketPath ? undefined : cfg.port,
      socketPath: cfg.socketPath,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: '+06:00',
    });
  }
  return pool;
}

export async function testMysqlConnection(): Promise<{ database: string; version: string }> {
  if (!isMysqlConfigured()) {
    throw new Error('MySQL is not configured. Set DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in .env.');
  }
  const db = getMysqlPool();
  try {
    const [rows] = await db.query<RowDataPacket[]>('SELECT DATABASE() AS db, VERSION() AS version');
    const row = rows[0] || {};
    return {
      database: String(row.db || getMysqlConfig().database),
      version: String(row.version || 'unknown'),
    };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'ER_ACCESS_DENIED_ERROR') {
      throw new Error('MySQL access denied: verify DB_USER, DB_PASSWORD, and user privileges in cPanel -> MySQL Databases.');
    }
    if (code === 'ER_BAD_DB_ERROR') {
      throw new Error(`MySQL database "${getMysqlConfig().database}" does not exist or user is not assigned to it.`);
    }
    throw err;
  }
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
