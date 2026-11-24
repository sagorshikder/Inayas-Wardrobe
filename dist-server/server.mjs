// server.ts
import "dotenv/config";
import express from "express";
import fs3 from "node:fs";
import path3 from "node:path";
import { randomUUID as randomUUID2 } from "node:crypto";
import { fileURLToPath } from "node:url";

// src/utils/commerce.ts
var WA_NUMBER = "8801714000349";
function formatTaka(amount) {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return "\u09F3 " + safe.toLocaleString("en-IN");
}
function computeCartSummary(items) {
  let count = 0;
  let total = 0;
  for (const item of items) {
    const qty = Math.max(0, Math.floor(Number(item.qty) || 0));
    const price = Math.max(0, Number(item.price) || 0);
    count += qty;
    total += qty * price;
  }
  return { count, total };
}
function computeCustomWardrobeQuote(params) {
  const w = Math.max(2, Math.min(20, Number(params.widthFt) || 0));
  const h = Math.max(4, Math.min(12, Number(params.heightFt) || 0));
  const d = Math.max(1.5, Math.min(4, Number(params.depthFt) || 2));
  const rate = Math.max(500, Number(params.ratePerSqFt) || 1600);
  const doorMul = Math.max(0.8, Number(params.doorMultiplier) || 1);
  const depthMul = 1 + Math.max(0, d - 2) * 0.1;
  return Math.round(w * h * rate * doorMul * depthMul / 100) * 100;
}
function buildWardrobeWhatsAppUrl(params) {
  const targetWa = (params.waNumber || WA_NUMBER).replace(/[^\d]/g, "") || WA_NUMBER;
  const lines = [
    "Hello, I want a custom wardrobe.",
    `Size: ${params.widthFt} ft wide x ${params.heightFt} ft high`,
    `Finish: ${params.finishName}`
  ];
  if (params.estimatedTaka && params.estimatedTaka > 0) {
    lines.push(`Estimated Quote: ${formatTaka(params.estimatedTaka)}`);
  }
  return `https://wa.me/${targetWa}?text=${encodeURIComponent(lines.join("\n"))}`;
}
var VALID_PAYMENTS = /* @__PURE__ */ new Set(["COD", "bKash", "Nagad", "Rocket", "IBBL"]);
function normalizePhoneDigits(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length === 13) {
    return digits.slice(2);
  }
  return digits;
}
function isValidBdPhone(raw) {
  const normalized = normalizePhoneDigits(raw);
  return /^01[3-9]\d{8}$/.test(normalized);
}
function validateOrderPayload(input) {
  const name = (input.name || "").trim();
  const address = (input.address || "").trim();
  if (name.length < 2) {
    return { valid: false, error: "Please enter your full name.", normalizedTotal: 0 };
  }
  if (!isValidBdPhone(input.phone)) {
    return {
      valid: false,
      error: "Please enter a valid 11-digit BD mobile number (e.g. 017XXXXXXXX).",
      normalizedTotal: 0
    };
  }
  if (address.length < 4) {
    return { valid: false, error: "Please provide a complete delivery address.", normalizedTotal: 0 };
  }
  if (!VALID_PAYMENTS.has(input.paymentMethod)) {
    return { valid: false, error: "Please select a valid payment method.", normalizedTotal: 0 };
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { valid: false, error: "Your cart is empty.", normalizedTotal: 0 };
  }
  const { total } = computeCartSummary(input.items);
  if (total <= 0) {
    return { valid: false, error: "Order total must be greater than zero.", normalizedTotal: 0 };
  }
  return { valid: true, normalizedTotal: total };
}

// src/utils/catalogPrices.ts
var DEFAULT_CATALOG_PRICES = {
  "1": { id: "1", name: "Sliding Door Wardrobe", price: 48500 },
  "2": { id: "2", name: "Royal Queen Size Bed", price: 38e3 },
  "3": { id: "3", name: "Modern 3-Seater Sofa", price: 32e3 },
  "4": { id: "4", name: "6-Seater Dining Set", price: 42e3 },
  "5": { id: "5", name: "Hinged 3-Door Wardrobe", price: 36e3 },
  "6": { id: "6", name: "Architectural Storage Cabinet", price: 18500 },
  "7": { id: "7", name: "Dressing Table with Mirror", price: 15500 },
  "8": { id: "8", name: "Minimalist TV Cabinet", price: 21e3 },
  "9": { id: "9", name: "Sculpted Coffee Table", price: 9500 },
  "10": { id: "10", name: "4-Seater Apartment Dining Set", price: 29e3 },
  "11": { id: "11", name: "Slim Shoe Rack Cabinet", price: 8500 },
  "12": { id: "12", name: "Custom Study & Work Desk", price: 16e3 }
};
function lookupCatalogProduct(rawItemId, dbProducts) {
  const trimmed = String(rawItemId || "").trim();
  if (!trimmed) return null;
  const exactDb = dbProducts.find((p) => p.id === trimmed || p.id === `seed_${trimmed}`);
  if (exactDb) return exactDb;
  for (const p of dbProducts) {
    const base = p.id.replace(/^seed_/, "");
    if (trimmed.startsWith(`${p.id}-`) || trimmed.startsWith(`${base}-`)) {
      return p;
    }
  }
  if (DEFAULT_CATALOG_PRICES[trimmed]) {
    return DEFAULT_CATALOG_PRICES[trimmed];
  }
  const strippedSeed = trimmed.replace(/^seed_/, "");
  if (DEFAULT_CATALOG_PRICES[strippedSeed]) {
    return DEFAULT_CATALOG_PRICES[strippedSeed];
  }
  const dashIdx = strippedSeed.indexOf("-");
  if (dashIdx > 0) {
    const baseId = strippedSeed.slice(0, dashIdx);
    if (DEFAULT_CATALOG_PRICES[baseId]) {
      return DEFAULT_CATALOG_PRICES[baseId];
    }
  }
  return null;
}
function resolveVerifiedOrderItems(clientItems, dbProducts) {
  if (!Array.isArray(clientItems) || clientItems.length === 0) {
    return { valid: false, error: "Your cart is empty.", items: [], normalizedTotal: 0 };
  }
  if (clientItems.length > 50) {
    return { valid: false, error: "Too many line items in a single order.", items: [], normalizedTotal: 0 };
  }
  const verified = [];
  for (const raw of clientItems) {
    const qty = Math.floor(Number(raw.qty) || 0);
    if (qty < 1 || qty > 50) {
      return {
        valid: false,
        error: "Each item quantity must be between 1 and 50.",
        items: [],
        normalizedTotal: 0
      };
    }
    const match = lookupCatalogProduct(raw.id, dbProducts);
    if (!match || match.price <= 0) {
      return {
        valid: false,
        error: `Unknown or unavailable product in order (${String(raw.id || "").slice(0, 40)}).`,
        items: [],
        normalizedTotal: 0
      };
    }
    const rawName = String(raw.name || "").trim();
    const variantSuffixMatch = rawName.match(/\(([^()]{1,40})\)$/);
    const displayName = variantSuffixMatch ? `${match.name} (${variantSuffixMatch[1]})` : match.name;
    verified.push({
      id: String(raw.id).slice(0, 64),
      name: displayName.slice(0, 180),
      price: Math.round(match.price),
      qty
    });
  }
  const { total } = computeCartSummary(verified);
  if (total <= 0) {
    return { valid: false, error: "Order total must be greater than zero.", items: [], normalizedTotal: 0 };
  }
  return {
    valid: true,
    items: verified,
    normalizedTotal: total
  };
}

// src/middleware/auth.ts
import fs from "node:fs";
import path from "node:path";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
var ADMIN_EMAIL = (process.env.ADMIN_EMAIL?.trim() || "").toLowerCase();
var cachedDevSecret = null;
function getAuthSecret() {
  const envSecret = process.env.AUTH_SECRET?.trim() || "";
  if (envSecret.length >= 32) {
    return envSecret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET environment variable must be set to at least 32 characters in production."
    );
  }
  if (cachedDevSecret) return cachedDevSecret;
  const devSecretPath = path.resolve(process.cwd(), "data", ".dev-auth-secret");
  try {
    if (fs.existsSync(devSecretPath)) {
      const existing = fs.readFileSync(devSecretPath, "utf8").trim();
      if (existing.length >= 32) {
        cachedDevSecret = existing;
        return cachedDevSecret;
      }
    }
    fs.mkdirSync(path.dirname(devSecretPath), { recursive: true });
    cachedDevSecret = randomBytes(32).toString("hex");
    fs.writeFileSync(devSecretPath, cachedDevSecret, { mode: 384 });
  } catch {
    cachedDevSecret = randomBytes(32).toString("hex");
  }
  return cachedDevSecret;
}
function validateSecurityEnvironment() {
  const envSecret = process.env.AUTH_SECRET?.trim() || "";
  if (process.env.NODE_ENV === "production") {
    if (envSecret.length < 32) {
      throw new Error(
        "Startup aborted: AUTH_SECRET must be set (minimum 32 characters) when NODE_ENV=production."
      );
    }
  } else if (!envSecret) {
    console.warn("[dev] AUTH_SECRET is not set; using local development session secret.");
  }
}
function constantTimeEquals(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPassword(password, storedHash) {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const actualBuf = scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, "hex");
  if (actualBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(actualBuf, expectedBuf);
}
function signSessionToken(payload, ttlSeconds = 60 * 60 * 24 * 7) {
  const fullPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1e3) + ttlSeconds
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const sig = createHmac("sha256", getAuthSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}
function verifySessionToken(token) {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;
  const expectedSig = createHmac("sha256", getAuthSecret()).update(encoded).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!parsed.uid || !parsed.email || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
function isAuthorizedAdminUser(user) {
  if (!user || user.role !== "admin") return false;
  if (ADMIN_EMAIL) {
    return user.email.toLowerCase() === ADMIN_EMAIL;
  }
  return true;
}
function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    const decoded = verifySessionToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing bearer token" });
    return;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  const decoded = verifySessionToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    return;
  }
  req.user = decoded;
  next();
}
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!isAuthorizedAdminUser(req.user)) {
      res.status(403).json({ error: "Forbidden: Store administrator access required" });
      return;
    }
    next();
  });
}

// src/middleware/rateLimit.ts
function createRateLimiter(options) {
  const hits = /* @__PURE__ */ new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of hits.entries()) {
      if (bucket.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, Math.max(6e4, options.windowMs));
  timer.unref();
  return (req, res, next) => {
    const forwarded = req.headers["x-forwarded-for"];
    const clientIp = (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : "") || req.ip || req.socket.remoteAddress || "unknown";
    const key = `${req.path}:${clientIp}`;
    const now = Date.now();
    let bucket = hits.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      hits.set(key, bucket);
    }
    bucket.count += 1;
    const remaining = Math.max(0, options.max - bucket.count);
    res.setHeader("X-RateLimit-Limit", String(options.max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    if (bucket.count > options.max) {
      const retrySeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1e3));
      res.setHeader("Retry-After", String(retrySeconds));
      res.status(429).json({ error: options.message });
      return;
    }
    next();
  };
}

// src/db/repository.ts
import fs2 from "node:fs";
import path2 from "node:path";
import { randomUUID } from "node:crypto";

// src/db/mysql.ts
import mysql from "mysql2/promise";
var pool = null;
var schemaInitialized = false;
function getMysqlConfig() {
  return {
    host: process.env.DB_HOST?.trim() || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    socketPath: process.env.DB_SOCKET?.trim() || void 0,
    database: process.env.DB_NAME?.trim() || "",
    user: process.env.DB_USER?.trim() || "",
    password: process.env.DB_PASSWORD ?? ""
  };
}
function isMysqlConfigured() {
  const cfg = getMysqlConfig();
  return Boolean((cfg.host || cfg.socketPath) && cfg.database && cfg.user);
}
function getMysqlPool() {
  if (!pool) {
    const cfg = getMysqlConfig();
    pool = mysql.createPool({
      host: cfg.socketPath ? void 0 : cfg.host,
      port: cfg.socketPath ? void 0 : cfg.port,
      socketPath: cfg.socketPath,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
      timezone: "+06:00"
    });
  }
  return pool;
}
async function ensureMysqlSchema() {
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

// src/db/repository.ts
var DATA_FILE = path2.resolve(process.cwd(), "data", "local-db.json");
function assertDevFallbackAllowed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "MySQL database is not configured. Set DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in production."
    );
  }
}
function readLocalStore() {
  assertDevFallbackAllowed();
  try {
    if (fs2.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs2.readFileSync(DATA_FILE, "utf8"));
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        products: Array.isArray(parsed.products) ? parsed.products : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
        gallery: Array.isArray(parsed.gallery) ? parsed.gallery : [],
        reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
        siteText: parsed.siteText && typeof parsed.siteText === "object" ? parsed.siteText : {},
        siteImages: parsed.siteImages && typeof parsed.siteImages === "object" ? parsed.siteImages : {}
      };
    }
  } catch {
  }
  return {
    users: [],
    products: [],
    orders: [],
    inquiries: [],
    gallery: [],
    reviews: [],
    siteText: {},
    siteImages: {}
  };
}
function writeLocalStore(data) {
  assertDevFallbackAllowed();
  const dir = path2.dirname(DATA_FILE);
  if (!fs2.existsSync(dir)) {
    fs2.mkdirSync(dir, { recursive: true });
  }
  fs2.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}
function parseJsonSafe(raw, fallback) {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
async function getDatabaseMode() {
  if (!isMysqlConfigured()) {
    assertDevFallbackAllowed();
    return "local-store";
  }
  await ensureMysqlSchema();
  return "mysql";
}
async function countAdminUsers() {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query(
      "SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'"
    );
    return Number(rows[0]?.cnt || 0);
  }
  const store = readLocalStore();
  return store.users.filter((u) => u.role === "admin").length;
}
async function findUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query(
      "SELECT id, email, password_hash, name, role, created_at FROM users WHERE LOWER(email) = ? LIMIT 1",
      [normalized]
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: String(r.id),
      email: String(r.email),
      passwordHash: String(r.password_hash),
      name: String(r.name || ""),
      role: r.role === "admin" ? "admin" : "customer",
      createdAt: new Date(r.created_at).toISOString()
    };
  }
  const store = readLocalStore();
  return store.users.find((u) => u.email.toLowerCase() === normalized) || null;
}
async function createUser(input) {
  const id = randomUUID();
  const email = input.email.trim().toLowerCase();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query(
      "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)",
      [id, email, input.passwordHash, input.name.trim(), input.role]
    );
    return { id, email, passwordHash: input.passwordHash, name: input.name.trim(), role: input.role, createdAt };
  }
  const store = readLocalStore();
  const next = {
    id,
    email,
    passwordHash: input.passwordHash,
    name: input.name.trim(),
    role: input.role,
    createdAt
  };
  store.users.push(next);
  writeLocalStore(store);
  return next;
}
async function listProducts() {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query(
      "SELECT id, name, cat, price, old_price, description, tag, rating, reviews_count, image, thumb, images_json, created_at FROM products ORDER BY created_at DESC"
    );
    return rows.map((r) => {
      const imgs = parseJsonSafe(r.images_json, []);
      return {
        id: String(r.id),
        name: String(r.name),
        cat: String(r.cat || "Wardrobe"),
        price: Number(r.price) || 0,
        old: Number(r.old_price) || 0,
        desc: String(r.description || ""),
        tag: r.tag ? String(r.tag) : void 0,
        rating: Number(r.rating) || 4.8,
        reviews: Number(r.reviews_count) || 0,
        image: String(r.thumb || r.image || ""),
        thumb: r.thumb ? String(r.thumb) : void 0,
        images: imgs.length ? imgs : r.image ? [String(r.image)] : void 0,
        createdAt: new Date(r.created_at).toISOString()
      };
    });
  }
  const store = readLocalStore();
  return [...store.products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function createProduct(input) {
  const id = input.id || randomUUID();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const images = input.images && input.images.length ? input.images : input.image ? [input.image] : [];
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query(
      `INSERT INTO products (id, name, cat, price, old_price, description, tag, rating, reviews_count, image, thumb, images_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name), cat = VALUES(cat), price = VALUES(price), old_price = VALUES(old_price),
         description = VALUES(description), tag = VALUES(tag), image = VALUES(image),
         thumb = VALUES(thumb), images_json = VALUES(images_json)`,
      [
        id,
        input.name,
        input.cat,
        Math.max(0, Math.round(input.price)),
        Math.max(0, Math.round(input.old || 0)),
        input.desc || "",
        input.tag || null,
        Number(input.rating) || 4.9,
        Number(input.reviews) || 1,
        input.image || "",
        input.thumb || null,
        JSON.stringify(images)
      ]
    );
    return { ...input, id, images, createdAt };
  }
  const store = readLocalStore();
  const record = { ...input, id, images, createdAt };
  const idx = store.products.findIndex((p) => p.id === id);
  if (idx >= 0) {
    store.products[idx] = record;
  } else {
    store.products.unshift(record);
  }
  writeLocalStore(store);
  return record;
}
async function updateProduct(id, input) {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [existingRows] = await db.query(
      "SELECT id, name, cat, price, old_price, description, tag, image, thumb, images_json FROM products WHERE id = ? LIMIT 1",
      [id]
    );
    const existing = existingRows[0];
    if (!existing) return false;
    const nextImages = input.images ?? (input.image ? [input.image] : parseJsonSafe(existing.images_json, []));
    await db.query(
      `UPDATE products
       SET name = ?, cat = ?, price = ?, old_price = ?, description = ?, tag = ?, image = ?, thumb = ?, images_json = ?
       WHERE id = ?`,
      [
        input.name ?? existing.name,
        input.cat ?? existing.cat,
        input.price !== void 0 ? Math.max(0, Math.round(input.price)) : existing.price,
        input.old !== void 0 ? Math.max(0, Math.round(input.old)) : existing.old_price,
        input.desc !== void 0 ? input.desc : existing.description,
        input.tag !== void 0 ? input.tag || null : existing.tag,
        input.image ?? existing.image,
        input.thumb !== void 0 ? input.thumb || null : existing.thumb,
        JSON.stringify(nextImages),
        id
      ]
    );
    return true;
  }
  const store = readLocalStore();
  const idx = store.products.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  store.products[idx] = { ...store.products[idx], ...input };
  writeLocalStore(store);
  return true;
}
async function deleteProduct(id) {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query("DELETE FROM products WHERE id = ?", [id]);
    return;
  }
  const store = readLocalStore();
  store.products = store.products.filter((p) => p.id !== id);
  writeLocalStore(store);
}
async function listOrders() {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query(
      "SELECT id, customer_name, phone, address, note, payment_method, total, status, items_json, user_id, created_at FROM orders ORDER BY created_at DESC"
    );
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.customer_name),
      phone: String(r.phone),
      address: String(r.address),
      note: r.note ? String(r.note) : void 0,
      paymentMethod: String(r.payment_method),
      total: Number(r.total) || 0,
      status: r.status || "New",
      items: parseJsonSafe(r.items_json, []),
      userId: r.user_id ? String(r.user_id) : void 0,
      createdAt: new Date(r.created_at).toISOString()
    }));
  }
  const store = readLocalStore();
  return [...store.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function createOrder(input) {
  const id = `ORD-${randomUUID().slice(0, 8).toUpperCase()}`;
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const status = "New";
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query(
      `INSERT INTO orders (id, customer_name, phone, address, note, payment_method, total, status, items_json, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.phone,
        input.address,
        input.note || null,
        input.paymentMethod,
        Math.max(0, Math.round(input.total)),
        status,
        JSON.stringify(input.items),
        input.userId || null
      ]
    );
    return { ...input, id, status, createdAt };
  }
  const store = readLocalStore();
  const order = { ...input, id, status, createdAt };
  store.orders.unshift(order);
  writeLocalStore(store);
  return order;
}
async function updateOrderStatus(id, status) {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
    return;
  }
  const store = readLocalStore();
  const item = store.orders.find((o) => o.id === id);
  if (item) {
    item.status = status;
    writeLocalStore(store);
  }
}
async function deleteOrder(id) {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query("DELETE FROM orders WHERE id = ?", [id]);
    return;
  }
  const store = readLocalStore();
  store.orders = store.orders.filter((o) => o.id !== id);
  writeLocalStore(store);
}
async function listInquiries() {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query(
      "SELECT id, name, phone, interest, message, status, created_at FROM inquiries ORDER BY created_at DESC"
    );
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      phone: String(r.phone),
      interest: String(r.interest),
      message: r.message ? String(r.message) : void 0,
      status: r.status || "New",
      createdAt: new Date(r.created_at).toISOString()
    }));
  }
  const store = readLocalStore();
  return [...store.inquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function createInquiry(input) {
  const id = `INQ-${randomUUID().slice(0, 8).toUpperCase()}`;
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const status = "New";
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query(
      "INSERT INTO inquiries (id, name, phone, interest, message, status) VALUES (?, ?, ?, ?, ?, ?)",
      [id, input.name, input.phone, input.interest, input.message || null, status]
    );
    return { ...input, id, status, createdAt };
  }
  const store = readLocalStore();
  const inquiry = { ...input, id, status, createdAt };
  store.inquiries.unshift(inquiry);
  writeLocalStore(store);
  return inquiry;
}
async function updateInquiryStatus(id, status) {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query("UPDATE inquiries SET status = ? WHERE id = ?", [status, id]);
    return;
  }
  const store = readLocalStore();
  const item = store.inquiries.find((i) => i.id === id);
  if (item) {
    item.status = status;
    writeLocalStore(store);
  }
}
async function deleteInquiry(id) {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query("DELETE FROM inquiries WHERE id = ?", [id]);
    return;
  }
  const store = readLocalStore();
  store.inquiries = store.inquiries.filter((i) => i.id !== id);
  writeLocalStore(store);
}
async function listGallery() {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query(
      "SELECT id, cat, title, image, created_at FROM gallery ORDER BY created_at DESC"
    );
    return rows.map((r) => ({
      id: String(r.id),
      cat: String(r.cat || "Wardrobe"),
      title: String(r.title),
      image: String(r.image),
      createdAt: new Date(r.created_at).toISOString()
    }));
  }
  const store = readLocalStore();
  return [...store.gallery].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function createGalleryItem(input) {
  const id = randomUUID();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query("INSERT INTO gallery (id, cat, title, image) VALUES (?, ?, ?, ?)", [
      id,
      input.cat,
      input.title,
      input.image
    ]);
    return { ...input, id, createdAt };
  }
  const store = readLocalStore();
  const item = { ...input, id, createdAt };
  store.gallery.unshift(item);
  writeLocalStore(store);
  return item;
}
async function deleteGalleryItem(id) {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query("DELETE FROM gallery WHERE id = ?", [id]);
    return;
  }
  const store = readLocalStore();
  store.gallery = store.gallery.filter((g) => g.id !== id);
  writeLocalStore(store);
}
async function listReviews() {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query(
      "SELECT id, name, stars, text, created_at FROM reviews ORDER BY created_at DESC"
    );
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      stars: Math.max(1, Math.min(5, Number(r.stars) || 5)),
      text: String(r.text),
      createdAt: new Date(r.created_at).toISOString()
    }));
  }
  const store = readLocalStore();
  return [...store.reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function createReview(input) {
  const id = randomUUID();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const stars = Math.max(1, Math.min(5, Math.round(input.stars || 5)));
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query("INSERT INTO reviews (id, name, stars, text) VALUES (?, ?, ?, ?)", [
      id,
      input.name,
      stars,
      input.text
    ]);
    return { id, name: input.name, stars, text: input.text, createdAt };
  }
  const store = readLocalStore();
  const rev = { id, name: input.name, stars, text: input.text, createdAt };
  store.reviews.unshift(rev);
  writeLocalStore(store);
  return rev;
}
async function deleteReview(id) {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query("DELETE FROM reviews WHERE id = ?", [id]);
    return;
  }
  const store = readLocalStore();
  store.reviews = store.reviews.filter((r) => r.id !== id);
  writeLocalStore(store);
}
async function getSettingsBundle() {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query(
      "SELECT setting_key, setting_value_json FROM site_settings"
    );
    let siteText = {};
    const siteImages = {};
    for (const r of rows) {
      const key = String(r.setting_key);
      if (key === "site_text") {
        siteText = parseJsonSafe(r.setting_value_json, {});
      } else if (key.startsWith("img-")) {
        const parsed = parseJsonSafe(r.setting_value_json, {});
        if (parsed.data) {
          siteImages[key.slice(4)] = parsed.data;
        }
      }
    }
    return { siteText, siteImages };
  }
  const store = readLocalStore();
  return {
    siteText: store.siteText,
    siteImages: store.siteImages
  };
}
async function saveSiteText(siteText) {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query(
      `INSERT INTO site_settings (setting_key, setting_value_json) VALUES ('site_text', ?)
       ON DUPLICATE KEY UPDATE setting_value_json = VALUES(setting_value_json)`,
      [JSON.stringify(siteText)]
    );
    return;
  }
  const store = readLocalStore();
  store.siteText = siteText;
  writeLocalStore(store);
}
async function saveSiteImage(slotKey, dataUrl) {
  const safeKey = `img-${slotKey.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query(
      `INSERT INTO site_settings (setting_key, setting_value_json) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value_json = VALUES(setting_value_json)`,
      [safeKey, JSON.stringify({ data: dataUrl })]
    );
    return;
  }
  const store = readLocalStore();
  store.siteImages[slotKey] = dataUrl;
  writeLocalStore(store);
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path3.dirname(__filename);
var APP_ROOT = fs3.existsSync(path3.join(__dirname, "package.json")) ? __dirname : path3.resolve(__dirname, "..");
var PORT = Number(process.env.PORT) || 3e3;
var HOST = "0.0.0.0";
var isProd = process.env.NODE_ENV === "production";
async function startServer() {
  validateSecurityEnvironment();
  const dbMode = await getDatabaseMode();
  if (dbMode === "local-store") {
    console.warn("[dev] MySQL env vars not set; using local JSON store for preview.");
  }
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "10mb" }));
  const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1e3,
    max: 12,
    message: "Too many authentication attempts. Please try again in 15 minutes."
  });
  const submitLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1e3,
    max: 15,
    message: "Too many submissions from this IP. Please wait a few minutes."
  });
  const uploadsDir = path3.join(APP_ROOT, "data", "uploads");
  app.use(
    "/uploads",
    express.static(uploadsDir, {
      maxAge: "30d",
      immutable: true
    })
  );
  const publicDir = path3.join(APP_ROOT, "public");
  if (fs3.existsSync(publicDir)) {
    app.use("/public", express.static(publicDir, { maxAge: "7d" }));
    app.use(express.static(publicDir, { maxAge: "7d" }));
  }
  const rootAssets = [
    "/Logo.png",
    "/Logo.webp",
    "/cover-photo.jpg",
    "/cover-photo.webp",
    "/og-image.jpg",
    "/favicon.ico",
    "/favicon-32.png",
    "/apple-touch-icon.png",
    "/icon-192.png",
    "/robots.txt",
    "/sitemap.xml"
  ];
  app.get(rootAssets, (req, res, next) => {
    const filePath = path3.join(APP_ROOT, req.path.replace(/^\/+/, ""));
    if (fs3.existsSync(filePath)) {
      if (/\.(webp|png|jpe?g|ico)$/i.test(req.path)) {
        res.setHeader("Cache-Control", "public, max-age=604800");
      }
      res.sendFile(filePath);
      return;
    }
    next();
  });
  function sendDataUrlAsBinary(res, dataUrl) {
    const match = /^data:(image\/(?:webp|jpeg|jpg|png));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) return false;
    const mime = match[1] === "image/jpg" ? "image/jpeg" : match[1];
    const buffer = Buffer.from(match[2], "base64");
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
    return true;
  }
  function externalizeImageField(value, fallbackMediaUrl) {
    if (!value) return "";
    return value.startsWith("data:image/") ? fallbackMediaUrl : value;
  }
  app.get("/api/health", async (_req, res) => {
    try {
      const database = await getDatabaseMode();
      res.json({ ok: true, service: "inayas-wardrobe-api", database });
    } catch (error) {
      res.status(500).json({
        ok: false,
        service: "inayas-wardrobe-api",
        error: error instanceof Error ? error.message : "Database connection error"
      });
    }
  });
  app.get("/api/media/product/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      const idxParam = Number(req.query.index);
      const products = await listProducts();
      const found = products.find((p) => p.id === id);
      if (!found) {
        res.status(404).end();
        return;
      }
      const candidate = Number.isInteger(idxParam) && idxParam >= 0 && found.images?.[idxParam] ? found.images[idxParam] : found.image;
      if (candidate.startsWith("data:image/") && sendDataUrlAsBinary(res, candidate)) {
        return;
      }
      if (candidate && !candidate.startsWith("data:")) {
        res.redirect(302, candidate);
        return;
      }
      res.status(404).end();
    } catch {
      res.status(500).end();
    }
  });
  app.get("/api/media/product-thumb/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      const products = await listProducts();
      const found = products.find((p) => p.id === id);
      if (!found) {
        res.status(404).end();
        return;
      }
      const candidate = found.thumb || found.image;
      if (candidate.startsWith("data:image/") && sendDataUrlAsBinary(res, candidate)) {
        return;
      }
      if (candidate && !candidate.startsWith("data:")) {
        res.redirect(302, candidate);
        return;
      }
      res.status(404).end();
    } catch {
      res.status(500).end();
    }
  });
  app.get("/api/media/gallery/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      const gallery = await listGallery();
      const found = gallery.find((g) => g.id === id);
      if (!found) {
        res.status(404).end();
        return;
      }
      if (found.image.startsWith("data:image/") && sendDataUrlAsBinary(res, found.image)) {
        return;
      }
      if (found.image && !found.image.startsWith("data:")) {
        res.redirect(302, found.image);
        return;
      }
      res.status(404).end();
    } catch {
      res.status(500).end();
    }
  });
  app.get("/api/media/site/:slotKey", async (req, res) => {
    try {
      const slotKey = String(req.params.slotKey || "");
      const settings = await getSettingsBundle();
      const val = settings.siteImages[slotKey];
      if (!val) {
        res.status(404).end();
        return;
      }
      if (val.startsWith("data:image/") && sendDataUrlAsBinary(res, val)) {
        return;
      }
      if (!val.startsWith("data:")) {
        res.redirect(302, val);
        return;
      }
      res.status(404).end();
    } catch {
      res.status(500).end();
    }
  });
  app.get("/api/storefront", async (_req, res) => {
    try {
      const [products, reviews, gallery, settings] = await Promise.all([
        listProducts(),
        listReviews(),
        listGallery(),
        getSettingsBundle()
      ]);
      const lightweightProducts = products.map((p) => ({
        ...p,
        image: externalizeImageField(p.image, `/api/media/product/${encodeURIComponent(p.id)}`),
        thumb: p.thumb ? externalizeImageField(p.thumb, `/api/media/product-thumb/${encodeURIComponent(p.id)}`) : void 0,
        images: (p.images || []).map(
          (img, idx) => externalizeImageField(img, `/api/media/product/${encodeURIComponent(p.id)}?index=${idx}`)
        )
      }));
      const lightweightGallery = gallery.map((g) => ({
        ...g,
        image: externalizeImageField(g.image, `/api/media/gallery/${encodeURIComponent(g.id)}`)
      }));
      const lightweightSiteImages = {};
      for (const [k, v] of Object.entries(settings.siteImages)) {
        lightweightSiteImages[k] = externalizeImageField(v, `/api/media/site/${encodeURIComponent(k)}`);
      }
      res.json({
        products: lightweightProducts,
        reviews,
        gallery: lightweightGallery,
        siteText: settings.siteText,
        siteImages: lightweightSiteImages
      });
    } catch (error) {
      console.error("Failed to load storefront data:", error);
      res.status(500).json({ error: "Failed to load storefront catalog" });
    }
  });
  app.get("/api/products", async (_req, res) => {
    try {
      const products = await listProducts();
      const lightweightProducts = products.map((p) => ({
        ...p,
        image: externalizeImageField(p.image, `/api/media/product/${encodeURIComponent(p.id)}`),
        thumb: p.thumb ? externalizeImageField(p.thumb, `/api/media/product-thumb/${encodeURIComponent(p.id)}`) : void 0,
        images: (p.images || []).map(
          (img, idx) => externalizeImageField(img, `/api/media/product/${encodeURIComponent(p.id)}?index=${idx}`)
        )
      }));
      res.json({ products: lightweightProducts });
    } catch {
      res.status(500).json({ error: "Failed to load products" });
    }
  });
  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      const products = await listProducts();
      const found = products.find((p) => p.id === id);
      if (!found) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json({
        product: {
          ...found,
          image: externalizeImageField(found.image, `/api/media/product/${encodeURIComponent(found.id)}`),
          thumb: found.thumb ? externalizeImageField(found.thumb, `/api/media/product-thumb/${encodeURIComponent(found.id)}`) : void 0,
          images: (found.images || []).map(
            (img, idx) => externalizeImageField(img, `/api/media/product/${encodeURIComponent(found.id)}?index=${idx}`)
          )
        }
      });
    } catch {
      res.status(500).json({ error: "Failed to load product" });
    }
  });
  app.get("/api/auth/status", async (_req, res) => {
    try {
      const adminCount = await countAdminUsers();
      const envAdminConfigured = Boolean(process.env.ADMIN_PASSWORD?.trim());
      res.json({
        hasAdmin: adminCount > 0 || envAdminConfigured,
        setupTokenRequired: isProd || Boolean(process.env.ADMIN_SETUP_TOKEN?.trim())
      });
    } catch {
      res.status(500).json({ error: "Could not check admin status" });
    }
  });
  app.post("/api/auth/setup-admin", authLimiter, async (req, res) => {
    try {
      const adminCount = await countAdminUsers();
      if (adminCount > 0) {
        res.status(409).json({ error: "Administrator account is already configured. Please sign in." });
        return;
      }
      const configuredSetupToken = process.env.ADMIN_SETUP_TOKEN?.trim() || "";
      if (isProd && configuredSetupToken.length < 16) {
        res.status(403).json({
          error: "Admin setup endpoint is disabled in production without ADMIN_SETUP_TOKEN (>=16 chars) or ADMIN_PASSWORD in .env."
        });
        return;
      }
      if (configuredSetupToken) {
        const providedToken = String(req.body?.setupToken || "").trim();
        if (!providedToken || !constantTimeEquals(providedToken, configuredSetupToken)) {
          res.status(403).json({ error: "Invalid or missing setup token." });
          return;
        }
      }
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");
      const name = String(req.body?.name || "Store Owner").trim();
      if (!email || !email.includes("@")) {
        res.status(400).json({ error: "Please provide a valid email address." });
        return;
      }
      if (ADMIN_EMAIL && email !== ADMIN_EMAIL) {
        res.status(403).json({ error: "Email does not match configured ADMIN_EMAIL." });
        return;
      }
      if (password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters." });
        return;
      }
      const passwordHash = hashPassword(password);
      const user = await createUser({
        email,
        passwordHash,
        name: name || "Store Owner",
        role: "admin"
      });
      const token = signSessionToken({
        uid: user.id,
        email: user.email,
        name: user.name,
        role: "admin"
      });
      res.json({
        token,
        user: { uid: user.id, email: user.email, displayName: user.name, role: "admin" },
        isAdmin: true
      });
    } catch (error) {
      console.error("Admin setup error:", error);
      res.status(500).json({ error: "Could not complete admin setup." });
    }
  });
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");
      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required." });
        return;
      }
      const existing = await findUserByEmail(email);
      if (existing) {
        if (!verifyPassword(password, existing.passwordHash)) {
          res.status(401).json({ error: "Invalid email or password." });
          return;
        }
        const isAdmin = isAuthorizedAdminUser({ email: existing.email, role: existing.role });
        const token = signSessionToken({
          uid: existing.id,
          email: existing.email,
          name: existing.name,
          role: isAdmin ? "admin" : "customer"
        });
        res.json({
          token,
          user: {
            uid: existing.id,
            email: existing.email,
            displayName: existing.name,
            role: isAdmin ? "admin" : "customer"
          },
          isAdmin
        });
        return;
      }
      const envAdminPass = process.env.ADMIN_PASSWORD?.trim();
      const targetAdminEmail = ADMIN_EMAIL;
      if (targetAdminEmail && email === targetAdminEmail && envAdminPass && constantTimeEquals(password, envAdminPass)) {
        const created = await createUser({
          email: targetAdminEmail,
          passwordHash: hashPassword(envAdminPass),
          name: "Store Owner",
          role: "admin"
        });
        const token = signSessionToken({
          uid: created.id,
          email: created.email,
          name: created.name,
          role: "admin"
        });
        res.json({
          token,
          user: { uid: created.id, email: created.email, displayName: created.name, role: "admin" },
          isAdmin: true
        });
        return;
      }
      res.status(401).json({ error: "Invalid email or password." });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Sign-in failed." });
    }
  });
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");
      const name = String(req.body?.name || "").trim();
      if (!email || !email.includes("@")) {
        res.status(400).json({ error: "Please provide a valid email address." });
        return;
      }
      if (ADMIN_EMAIL && email === ADMIN_EMAIL) {
        res.status(403).json({ error: "Owner email must sign in via the Admin Studio Portal." });
        return;
      }
      if (password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters." });
        return;
      }
      const duplicate = await findUserByEmail(email);
      if (duplicate) {
        res.status(409).json({ error: "An account with this email already exists." });
        return;
      }
      const user = await createUser({
        email,
        passwordHash: hashPassword(password),
        name: name || email.split("@")[0],
        role: "customer"
      });
      const token = signSessionToken({
        uid: user.id,
        email: user.email,
        name: user.name,
        role: "customer"
      });
      res.status(201).json({
        token,
        user: { uid: user.id, email: user.email, displayName: user.name, role: "customer" },
        isAdmin: false
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Could not create account." });
    }
  });
  app.get("/api/auth/session", requireAuth, (req, res) => {
    const user = req.user;
    const isAdmin = isAuthorizedAdminUser(user);
    res.json({
      uid: user?.uid || "",
      email: user?.email || "",
      displayName: user?.name || "",
      role: isAdmin ? "admin" : "customer",
      isAdmin
    });
  });
  app.post("/api/quote/wardrobe", (req, res) => {
    const body = req.body || {};
    const widthFt = Number(body.widthFt) || 6;
    const heightFt = Number(body.heightFt) || 7;
    const depthFt = Number(body.depthFt) || 2;
    const ratePerSqFt = Number(body.ratePerSqFt) || 1650;
    const doorMultiplier = Number(body.doorMultiplier) || 1.1;
    const finishName = String(body.finishName || "Walnut Brown").slice(0, 60);
    const estimatedTaka = computeCustomWardrobeQuote({
      widthFt,
      heightFt,
      depthFt,
      ratePerSqFt,
      doorMultiplier
    });
    const whatsappUrl = buildWardrobeWhatsAppUrl({
      widthFt,
      heightFt,
      finishName,
      estimatedTaka
    });
    res.json({
      estimatedTaka,
      whatsappUrl,
      dimensions: { widthFt, heightFt, depthFt },
      finishName
    });
  });
  app.post("/api/orders/validate", async (req, res) => {
    const input = req.body || {};
    const formCheck = validateOrderPayload(input);
    if (!formCheck.valid) {
      res.status(400).json(formCheck);
      return;
    }
    const dbProducts = await listProducts();
    const verified = resolveVerifiedOrderItems(input.items, dbProducts);
    if (!verified.valid) {
      res.status(400).json({ valid: false, error: verified.error, normalizedTotal: 0 });
      return;
    }
    res.json({ valid: true, normalizedTotal: verified.normalizedTotal });
  });
  app.post("/api/orders", submitLimiter, optionalAuth, async (req, res) => {
    try {
      const input = req.body || {};
      const formCheck = validateOrderPayload(input);
      if (!formCheck.valid) {
        res.status(400).json({ error: formCheck.error });
        return;
      }
      const dbProducts = await listProducts();
      const verified = resolveVerifiedOrderItems(input.items, dbProducts);
      if (!verified.valid) {
        res.status(400).json({ error: verified.error });
        return;
      }
      const order = await createOrder({
        name: String(input.name).trim(),
        phone: String(input.phone).trim(),
        address: String(input.address).trim(),
        note: input.note ? String(input.note).trim().slice(0, 400) : void 0,
        paymentMethod: String(input.paymentMethod),
        total: verified.normalizedTotal,
        items: verified.items,
        userId: req.user?.uid
      });
      res.status(201).json({ id: order.id, order });
    } catch (error) {
      console.error("Order submission error:", error);
      res.status(500).json({ error: "Could not place order. Please try again." });
    }
  });
  app.post("/api/inquiries", submitLimiter, async (req, res) => {
    try {
      const name = String(req.body?.name || "").trim();
      const phone = String(req.body?.phone || "").trim();
      const interest = String(req.body?.interest || "Custom Wardrobe").trim();
      const message = String(req.body?.message || "").trim();
      if (name.length < 2 || !isValidBdPhone(phone)) {
        res.status(400).json({
          error: "Please provide your name and a valid 11-digit BD mobile number (e.g. 017XXXXXXXX)."
        });
        return;
      }
      const inquiry = await createInquiry({
        name,
        phone,
        interest,
        message: message || void 0
      });
      res.status(201).json({ id: inquiry.id, inquiry });
    } catch (error) {
      console.error("Inquiry error:", error);
      res.status(500).json({ error: "Could not submit inquiry." });
    }
  });
  app.post("/api/admin/upload", requireAdmin, async (req, res) => {
    try {
      const dataUrl = String(req.body?.dataUrl || "");
      const rawPrefix = String(req.body?.prefix || "img").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "img";
      const match = /^data:image\/(webp|jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
      if (!match) {
        res.status(400).json({ error: "Only WebP, JPEG, or PNG images are allowed." });
        return;
      }
      const ext = match[1] === "webp" ? "webp" : match[1] === "png" ? "png" : "jpg";
      const buffer = Buffer.from(match[2], "base64");
      if (buffer.length > 2.5 * 1024 * 1024) {
        res.status(413).json({ error: "Image file is too large (max 2.5 MB)." });
        return;
      }
      fs3.mkdirSync(uploadsDir, { recursive: true });
      const filename = `${rawPrefix}-${Date.now()}-${randomUUID2().slice(0, 8)}.${ext}`;
      fs3.writeFileSync(path3.join(uploadsDir, filename), buffer);
      res.status(201).json({ url: `/uploads/${filename}` });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to store uploaded image." });
    }
  });
  app.get("/api/admin/overview", requireAdmin, async (_req, res) => {
    try {
      const [products, orders, inquiries, gallery, reviews, settings] = await Promise.all([
        listProducts(),
        listOrders(),
        listInquiries(),
        listGallery(),
        listReviews(),
        getSettingsBundle()
      ]);
      res.json({
        products,
        orders,
        inquiries,
        gallery,
        reviews,
        siteText: settings.siteText,
        siteImages: settings.siteImages
      });
    } catch (error) {
      console.error("Admin overview error:", error);
      res.status(500).json({ error: "Failed to load admin overview" });
    }
  });
  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const name = String(b.name || "").trim();
      const price = Math.max(0, Number(b.price) || 0);
      if (!name || price <= 0) {
        res.status(400).json({ error: "Product name and valid price are required." });
        return;
      }
      const product = await createProduct({
        name,
        cat: String(b.cat || "Wardrobe").trim(),
        price,
        old: Math.max(0, Number(b.old) || 0),
        desc: String(b.desc || "").trim(),
        tag: b.tag ? String(b.tag).trim() : void 0,
        rating: 4.9,
        reviews: 1,
        image: String(b.image || ""),
        thumb: b.thumb ? String(b.thumb) : void 0,
        images: Array.isArray(b.images) ? b.images.map(String) : b.image ? [String(b.image)] : []
      });
      res.status(201).json({ product });
    } catch (error) {
      console.error("Create product error:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });
  app.post("/api/admin/products/seed", requireAdmin, async (req, res) => {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      for (const item of items) {
        await createProduct({
          id: `seed_${String(item.id)}`,
          name: String(item.name || "Product"),
          cat: String(item.cat || "Wardrobe"),
          price: Number(item.price) || 0,
          old: Number(item.old) || 0,
          desc: String(item.desc || ""),
          tag: item.tag ? String(item.tag) : void 0,
          rating: Number(item.rating) || 4.8,
          reviews: Number(item.reviews) || 0,
          image: String(item.image || ""),
          thumb: item.thumb ? String(item.thumb) : void 0,
          images: Array.isArray(item.images) ? item.images.map(String) : [String(item.image || "")]
        });
      }
      const products = await listProducts();
      res.json({ products });
    } catch (error) {
      console.error("Seed products error:", error);
      res.status(500).json({ error: "Failed to import default catalog" });
    }
  });
  app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id);
      const b = req.body || {};
      const ok = await updateProduct(id, {
        name: b.name !== void 0 ? String(b.name).trim() : void 0,
        cat: b.cat !== void 0 ? String(b.cat).trim() : void 0,
        price: b.price !== void 0 ? Math.max(0, Number(b.price) || 0) : void 0,
        old: b.old !== void 0 ? Math.max(0, Number(b.old) || 0) : void 0,
        desc: b.desc !== void 0 ? String(b.desc).trim() : void 0,
        tag: b.tag !== void 0 ? String(b.tag).trim() : void 0,
        image: b.image !== void 0 ? String(b.image) : void 0,
        thumb: b.thumb !== void 0 ? String(b.thumb) : void 0,
        images: Array.isArray(b.images) ? b.images.map(String) : void 0
      });
      if (!ok) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Failed to update product" });
    }
  });
  app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      await deleteProduct(String(req.params.id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });
  app.patch("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const status = String(req.body?.status || "");
      if (!["New", "Confirmed", "Delivered", "Cancelled"].includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }
      await updateOrderStatus(String(req.params.id), status);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });
  app.delete("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      await deleteOrder(String(req.params.id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Failed to delete order" });
    }
  });
  app.patch("/api/admin/inquiries/:id", requireAdmin, async (req, res) => {
    try {
      const status = String(req.body?.status || "");
      if (!["New", "Contacted", "Closed"].includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }
      await updateInquiryStatus(String(req.params.id), status);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Failed to update inquiry status" });
    }
  });
  app.delete("/api/admin/inquiries/:id", requireAdmin, async (req, res) => {
    try {
      await deleteInquiry(String(req.params.id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Failed to delete inquiry" });
    }
  });
  app.post("/api/admin/gallery", requireAdmin, async (req, res) => {
    try {
      const image = String(req.body?.image || "");
      if (!image) {
        res.status(400).json({ error: "Image is required" });
        return;
      }
      const item = await createGalleryItem({
        cat: String(req.body?.cat || "Wardrobe"),
        title: String(req.body?.title || "Completed Home Project"),
        image
      });
      res.status(201).json({ item });
    } catch {
      res.status(500).json({ error: "Failed to save gallery photo" });
    }
  });
  app.delete("/api/admin/gallery/:id", requireAdmin, async (req, res) => {
    try {
      await deleteGalleryItem(String(req.params.id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Failed to delete gallery photo" });
    }
  });
  app.post("/api/admin/reviews", requireAdmin, async (req, res) => {
    try {
      const name = String(req.body?.name || "").trim();
      const text = String(req.body?.text || "").trim();
      const stars = Math.max(1, Math.min(5, Number(req.body?.stars) || 5));
      if (!name || !text) {
        res.status(400).json({ error: "Customer name and review text are required" });
        return;
      }
      const review = await createReview({ name, stars, text });
      res.status(201).json({ review });
    } catch {
      res.status(500).json({ error: "Failed to save review" });
    }
  });
  app.delete("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
    try {
      await deleteReview(String(req.params.id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Failed to delete review" });
    }
  });
  app.put("/api/admin/settings/text", requireAdmin, async (req, res) => {
    try {
      const nextText = req.body?.siteText;
      if (!nextText || typeof nextText !== "object") {
        res.status(400).json({ error: "Invalid settings payload" });
        return;
      }
      const clean = {};
      for (const [k, v] of Object.entries(nextText)) {
        if (typeof v === "string") {
          clean[k] = v;
        }
      }
      await saveSiteText(clean);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Failed to save site settings" });
    }
  });
  app.put("/api/admin/settings/image/:slotKey", requireAdmin, async (req, res) => {
    try {
      const slotKey = String(req.params.slotKey || "");
      const dataUrl = String(req.body?.data || "");
      if (!slotKey || !dataUrl) {
        res.status(400).json({ error: "Slot key and image data are required" });
        return;
      }
      await saveSiteImage(slotKey, dataUrl);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Failed to save site image" });
    }
  });
  const legacyRouteMap = {
    "/shop.html": "/shop",
    "/product.html": "/product",
    "/view3d.html": "/view3d",
    "/gallery.html": "/gallery",
    "/about.html": "/about",
    "/contact.html": "/contact",
    "/admin.html": "/admin"
  };
  app.get(Object.keys(legacyRouteMap), (req, res) => {
    const target = legacyRouteMap[req.path] || "/";
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    res.redirect(301, target + qs);
  });
  const distDir = path3.join(APP_ROOT, "dist");
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        next();
        return;
      }
      res.sendFile(path3.join(distDir, "index.html"));
    });
  }
  app.listen(PORT, HOST, () => {
    console.log(`Inaya's Wardrobe server running at http://${HOST}:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
