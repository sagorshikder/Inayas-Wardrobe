import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { ensureMysqlSchema, getMysqlPool, isMysqlConfigured } from './mysql.ts';

export interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'customer';
  createdAt: string;
}

export interface DbProduct {
  id: string;
  name: string;
  cat: string;
  price: number;
  old?: number;
  desc: string;
  tag?: string;
  rating: number;
  reviews: number;
  image: string;
  thumb?: string;
  images?: string[];
  createdAt: string;
}

export interface DbOrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface DbOrder {
  id: string;
  name: string;
  phone: string;
  address: string;
  note?: string;
  paymentMethod: string;
  total: number;
  status: 'New' | 'Confirmed' | 'Delivered' | 'Cancelled';
  items: DbOrderItem[];
  userId?: string;
  createdAt: string;
}

export interface DbInquiry {
  id: string;
  name: string;
  phone: string;
  interest: string;
  message?: string;
  status: 'New' | 'Contacted' | 'Closed';
  createdAt: string;
}

export interface DbGalleryItem {
  id: string;
  cat: string;
  title: string;
  image: string;
  createdAt: string;
}

export interface DbReview {
  id: string;
  name: string;
  stars: number;
  text: string;
  createdAt: string;
}

export interface DbSettingsBundle {
  siteText: Record<string, string>;
  siteImages: Record<string, string>;
}

interface LocalStoreFile {
  users: DbUser[];
  products: DbProduct[];
  orders: DbOrder[];
  inquiries: DbInquiry[];
  gallery: DbGalleryItem[];
  reviews: DbReview[];
  siteText: Record<string, string>;
  siteImages: Record<string, string>;
}

const DATA_FILE = path.resolve(process.cwd(), 'data', 'local-db.json');

function readLocalStore(): LocalStoreFile {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Partial<LocalStoreFile>;
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        products: Array.isArray(parsed.products) ? parsed.products : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
        gallery: Array.isArray(parsed.gallery) ? parsed.gallery : [],
        reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
        siteText: parsed.siteText && typeof parsed.siteText === 'object' ? parsed.siteText : {},
        siteImages:
          parsed.siteImages && typeof parsed.siteImages === 'object' ? parsed.siteImages : {},
      };
    }
  } catch {
    // ignore corrupt file and reset cleanly
  }
  return {
    users: [],
    products: [],
    orders: [],
    inquiries: [],
    gallery: [],
    reviews: [],
    siteText: {},
    siteImages: {},
  };
}

function writeLocalStore(data: LocalStoreFile): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function parseJsonSafe<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getDatabaseMode(): Promise<'mysql' | 'local-store'> {
  if (!isMysqlConfigured()) return 'local-store';
  await ensureMysqlSchema();
  return 'mysql';
}

// ---- Users ----
export async function countAdminUsers(): Promise<number> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'",
    );
    return Number(rows[0]?.cnt || 0);
  }
  const store = readLocalStore();
  return store.users.filter((u) => u.role === 'admin').length;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const normalized = email.trim().toLowerCase();
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, email, password_hash, name, role, created_at FROM users WHERE LOWER(email) = ? LIMIT 1',
      [normalized],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: String(r.id),
      email: String(r.email),
      passwordHash: String(r.password_hash),
      name: String(r.name || ''),
      role: r.role === 'admin' ? 'admin' : 'customer',
      createdAt: new Date(r.created_at).toISOString(),
    };
  }
  const store = readLocalStore();
  return store.users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'customer';
}): Promise<DbUser> {
  const id = randomUUID();
  const email = input.email.trim().toLowerCase();
  const createdAt = new Date().toISOString();

  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)',
      [id, email, input.passwordHash, input.name.trim(), input.role],
    );
    return { id, email, passwordHash: input.passwordHash, name: input.name.trim(), role: input.role, createdAt };
  }

  const store = readLocalStore();
  const next: DbUser = {
    id,
    email,
    passwordHash: input.passwordHash,
    name: input.name.trim(),
    role: input.role,
    createdAt,
  };
  store.users.push(next);
  writeLocalStore(store);
  return next;
}

// ---- Products ----
export async function listProducts(): Promise<DbProduct[]> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, name, cat, price, old_price, description, tag, rating, reviews_count, image, thumb, images_json, created_at FROM products ORDER BY created_at DESC',
    );
    return rows.map((r) => {
      const imgs = parseJsonSafe<string[]>(r.images_json, []);
      return {
        id: String(r.id),
        name: String(r.name),
        cat: String(r.cat || 'Wardrobe'),
        price: Number(r.price) || 0,
        old: Number(r.old_price) || 0,
        desc: String(r.description || ''),
        tag: r.tag ? String(r.tag) : undefined,
        rating: Number(r.rating) || 4.8,
        reviews: Number(r.reviews_count) || 0,
        image: String(r.thumb || r.image || ''),
        thumb: r.thumb ? String(r.thumb) : undefined,
        images: imgs.length ? imgs : r.image ? [String(r.image)] : undefined,
        createdAt: new Date(r.created_at).toISOString(),
      };
    });
  }

  const store = readLocalStore();
  return [...store.products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createProduct(
  input: Omit<DbProduct, 'id' | 'createdAt'> & { id?: string },
): Promise<DbProduct> {
  const id = input.id || randomUUID();
  const createdAt = new Date().toISOString();
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
        input.desc || '',
        input.tag || null,
        Number(input.rating) || 4.9,
        Number(input.reviews) || 1,
        input.image || '',
        input.thumb || null,
        JSON.stringify(images),
      ],
    );
    return { ...input, id, images, createdAt };
  }

  const store = readLocalStore();
  const record: DbProduct = { ...input, id, images, createdAt };
  const idx = store.products.findIndex((p) => p.id === id);
  if (idx >= 0) {
    store.products[idx] = record;
  } else {
    store.products.unshift(record);
  }
  writeLocalStore(store);
  return record;
}

export async function updateProduct(
  id: string,
  input: Partial<Omit<DbProduct, 'id' | 'createdAt'>>,
): Promise<boolean> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [existingRows] = await db.query<RowDataPacket[]>(
      'SELECT id, name, cat, price, old_price, description, tag, image, thumb, images_json FROM products WHERE id = ? LIMIT 1',
      [id],
    );
    const existing = existingRows[0];
    if (!existing) return false;
    const nextImages =
      input.images ?? (input.image ? [input.image] : parseJsonSafe<string[]>(existing.images_json, []));
    await db.query(
      `UPDATE products
       SET name = ?, cat = ?, price = ?, old_price = ?, description = ?, tag = ?, image = ?, thumb = ?, images_json = ?
       WHERE id = ?`,
      [
        input.name ?? existing.name,
        input.cat ?? existing.cat,
        input.price !== undefined ? Math.max(0, Math.round(input.price)) : existing.price,
        input.old !== undefined ? Math.max(0, Math.round(input.old)) : existing.old_price,
        input.desc !== undefined ? input.desc : existing.description,
        input.tag !== undefined ? input.tag || null : existing.tag,
        input.image ?? existing.image,
        input.thumb !== undefined ? input.thumb || null : existing.thumb,
        JSON.stringify(nextImages),
        id,
      ],
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

export async function deleteProduct(id: string): Promise<void> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query('DELETE FROM products WHERE id = ?', [id]);
    return;
  }
  const store = readLocalStore();
  store.products = store.products.filter((p) => p.id !== id);
  writeLocalStore(store);
}

// ---- Orders ----
export async function listOrders(): Promise<DbOrder[]> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, customer_name, phone, address, note, payment_method, total, status, items_json, user_id, created_at FROM orders ORDER BY created_at DESC',
    );
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.customer_name),
      phone: String(r.phone),
      address: String(r.address),
      note: r.note ? String(r.note) : undefined,
      paymentMethod: String(r.payment_method),
      total: Number(r.total) || 0,
      status: (r.status as DbOrder['status']) || 'New',
      items: parseJsonSafe<DbOrderItem[]>(r.items_json, []),
      userId: r.user_id ? String(r.user_id) : undefined,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }
  const store = readLocalStore();
  return [...store.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createOrder(input: Omit<DbOrder, 'id' | 'createdAt' | 'status'>): Promise<DbOrder> {
  const id = `ORD-${randomUUID().slice(0, 8).toUpperCase()}`;
  const createdAt = new Date().toISOString();
  const status: DbOrder['status'] = 'New';

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
        input.userId || null,
      ],
    );
    return { ...input, id, status, createdAt };
  }

  const store = readLocalStore();
  const order: DbOrder = { ...input, id, status, createdAt };
  store.orders.unshift(order);
  writeLocalStore(store);
  return order;
}

export async function updateOrderStatus(id: string, status: DbOrder['status']): Promise<void> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    return;
  }
  const store = readLocalStore();
  const item = store.orders.find((o) => o.id === id);
  if (item) {
    item.status = status;
    writeLocalStore(store);
  }
}

export async function deleteOrder(id: string): Promise<void> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query('DELETE FROM orders WHERE id = ?', [id]);
    return;
  }
  const store = readLocalStore();
  store.orders = store.orders.filter((o) => o.id !== id);
  writeLocalStore(store);
}

// ---- Inquiries ----
export async function listInquiries(): Promise<DbInquiry[]> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, name, phone, interest, message, status, created_at FROM inquiries ORDER BY created_at DESC',
    );
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      phone: String(r.phone),
      interest: String(r.interest),
      message: r.message ? String(r.message) : undefined,
      status: (r.status as DbInquiry['status']) || 'New',
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }
  const store = readLocalStore();
  return [...store.inquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createInquiry(
  input: Omit<DbInquiry, 'id' | 'createdAt' | 'status'>,
): Promise<DbInquiry> {
  const id = `INQ-${randomUUID().slice(0, 8).toUpperCase()}`;
  const createdAt = new Date().toISOString();
  const status: DbInquiry['status'] = 'New';

  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query(
      'INSERT INTO inquiries (id, name, phone, interest, message, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, input.name, input.phone, input.interest, input.message || null, status],
    );
    return { ...input, id, status, createdAt };
  }

  const store = readLocalStore();
  const inquiry: DbInquiry = { ...input, id, status, createdAt };
  store.inquiries.unshift(inquiry);
  writeLocalStore(store);
  return inquiry;
}

export async function updateInquiryStatus(id: string, status: DbInquiry['status']): Promise<void> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query('UPDATE inquiries SET status = ? WHERE id = ?', [status, id]);
    return;
  }
  const store = readLocalStore();
  const item = store.inquiries.find((i) => i.id === id);
  if (item) {
    item.status = status;
    writeLocalStore(store);
  }
}

export async function deleteInquiry(id: string): Promise<void> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query('DELETE FROM inquiries WHERE id = ?', [id]);
    return;
  }
  const store = readLocalStore();
  store.inquiries = store.inquiries.filter((i) => i.id !== id);
  writeLocalStore(store);
}

// ---- Gallery ----
export async function listGallery(): Promise<DbGalleryItem[]> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, cat, title, image, created_at FROM gallery ORDER BY created_at DESC',
    );
    return rows.map((r) => ({
      id: String(r.id),
      cat: String(r.cat || 'Wardrobe'),
      title: String(r.title),
      image: String(r.image),
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }
  const store = readLocalStore();
  return [...store.gallery].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createGalleryItem(input: {
  cat: string;
  title: string;
  image: string;
}): Promise<DbGalleryItem> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query('INSERT INTO gallery (id, cat, title, image) VALUES (?, ?, ?, ?)', [
      id,
      input.cat,
      input.title,
      input.image,
    ]);
    return { ...input, id, createdAt };
  }

  const store = readLocalStore();
  const item: DbGalleryItem = { ...input, id, createdAt };
  store.gallery.unshift(item);
  writeLocalStore(store);
  return item;
}

export async function deleteGalleryItem(id: string): Promise<void> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query('DELETE FROM gallery WHERE id = ?', [id]);
    return;
  }
  const store = readLocalStore();
  store.gallery = store.gallery.filter((g) => g.id !== id);
  writeLocalStore(store);
}

// ---- Reviews ----
export async function listReviews(): Promise<DbReview[]> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, name, stars, text, created_at FROM reviews ORDER BY created_at DESC',
    );
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      stars: Math.max(1, Math.min(5, Number(r.stars) || 5)),
      text: String(r.text),
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }
  const store = readLocalStore();
  return [...store.reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createReview(input: {
  name: string;
  stars: number;
  text: string;
}): Promise<DbReview> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const stars = Math.max(1, Math.min(5, Math.round(input.stars || 5)));

  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query('INSERT INTO reviews (id, name, stars, text) VALUES (?, ?, ?, ?)', [
      id,
      input.name,
      stars,
      input.text,
    ]);
    return { id, name: input.name, stars, text: input.text, createdAt };
  }

  const store = readLocalStore();
  const rev: DbReview = { id, name: input.name, stars, text: input.text, createdAt };
  store.reviews.unshift(rev);
  writeLocalStore(store);
  return rev;
}

export async function deleteReview(id: string): Promise<void> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query('DELETE FROM reviews WHERE id = ?', [id]);
    return;
  }
  const store = readLocalStore();
  store.reviews = store.reviews.filter((r) => r.id !== id);
  writeLocalStore(store);
}

// ---- Site Settings ----
export async function getSettingsBundle(): Promise<DbSettingsBundle> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT setting_key, setting_value_json FROM site_settings',
    );
    let siteText: Record<string, string> = {};
    const siteImages: Record<string, string> = {};
    for (const r of rows) {
      const key = String(r.setting_key);
      if (key === 'site_text') {
        siteText = parseJsonSafe<Record<string, string>>(r.setting_value_json, {});
      } else if (key.startsWith('img-')) {
        const parsed = parseJsonSafe<{ data?: string }>(r.setting_value_json, {});
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
    siteImages: store.siteImages,
  };
}

export async function saveSiteText(siteText: Record<string, string>): Promise<void> {
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query(
      `INSERT INTO site_settings (setting_key, setting_value_json) VALUES ('site_text', ?)
       ON DUPLICATE KEY UPDATE setting_value_json = VALUES(setting_value_json)`,
      [JSON.stringify(siteText)],
    );
    return;
  }
  const store = readLocalStore();
  store.siteText = siteText;
  writeLocalStore(store);
}

export async function saveSiteImage(slotKey: string, dataUrl: string): Promise<void> {
  const safeKey = `img-${slotKey.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  if (isMysqlConfigured()) {
    await ensureMysqlSchema();
    const db = getMysqlPool();
    await db.query(
      `INSERT INTO site_settings (setting_key, setting_value_json) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value_json = VALUES(setting_value_json)`,
      [safeKey, JSON.stringify({ data: dataUrl })],
    );
    return;
  }
  const store = readLocalStore();
  store.siteImages[slotKey] = dataUrl;
  writeLocalStore(store);
}
