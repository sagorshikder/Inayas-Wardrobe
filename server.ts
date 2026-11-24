import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  buildWardrobeWhatsAppUrl,
  computeCustomWardrobeQuote,
  isValidBdPhone,
  validateOrderPayload,
  type OrderValidationInput,
} from './src/utils/commerce.ts';
import { resolveVerifiedOrderItems } from './src/utils/catalogPrices.ts';
import {
  ADMIN_EMAIL,
  constantTimeEquals,
  hashPassword,
  isAuthorizedAdminUser,
  optionalAuth,
  requireAdmin,
  requireAuth,
  signSessionToken,
  validateSecurityEnvironment,
  verifyPassword,
  type AuthRequest,
} from './src/middleware/auth.ts';
import { createRateLimiter } from './src/middleware/rateLimit.ts';
import {
  countAdminUsers,
  createGalleryItem,
  createInquiry,
  createOrder,
  createProduct,
  createReview,
  createUser,
  deleteGalleryItem,
  deleteInquiry,
  deleteOrder,
  deleteProduct,
  deleteReview,
  findUserByEmail,
  getDatabaseMode,
  getSettingsBundle,
  listGallery,
  listInquiries,
  listOrders,
  listProducts,
  listReviews,
  saveSiteImage,
  saveSiteText,
  updateInquiryStatus,
  updateOrderStatus,
  updateProduct,
  type DbInquiry,
  type DbOrder,
} from './src/db/repository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ROOT = fs.existsSync(path.join(__dirname, 'package.json'))
  ? __dirname
  : path.resolve(__dirname, '..');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  validateSecurityEnvironment();
  const dbMode = await getDatabaseMode();
  if (dbMode === 'local-store') {
    console.warn('[dev] MySQL env vars not set; using local JSON store for preview.');
  }

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));

  const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 12,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  });

  const submitLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 15,
    message: 'Too many submissions from this IP. Please wait a few minutes.',
  });

  // Serve uploaded media files with aggressive cache headers
  const uploadsDir = path.join(APP_ROOT, 'data', 'uploads');
  app.use(
    '/uploads',
    express.static(uploadsDir, {
      maxAge: '30d',
      immutable: true,
    }),
  );

  // Expose public assets cleanly at both / and /public paths
  const publicDir = path.join(APP_ROOT, 'public');
  if (fs.existsSync(publicDir)) {
    app.use('/public', express.static(publicDir, { maxAge: '7d' }));
    app.use(express.static(publicDir, { maxAge: '7d' }));
  }

  // Expose root brand assets (Logo.webp/png, cover-photo.webp/jpg, icons, og-image.jpg)
  const rootAssets = [
    '/Logo.png',
    '/Logo.webp',
    '/cover-photo.jpg',
    '/cover-photo.webp',
    '/og-image.jpg',
    '/favicon.ico',
    '/favicon-32.png',
    '/apple-touch-icon.png',
    '/icon-192.png',
    '/robots.txt',
    '/sitemap.xml',
  ];
  app.get(rootAssets, (req, res, next) => {
    const filePath = path.join(APP_ROOT, req.path.replace(/^\/+/, ''));
    if (fs.existsSync(filePath)) {
      if (/\.(webp|png|jpe?g|ico)$/i.test(req.path)) {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      }
      res.sendFile(filePath);
      return;
    }
    next();
  });

  function sendDataUrlAsBinary(res: express.Response, dataUrl: string): boolean {
    const match = /^data:(image\/(?:webp|jpeg|jpg|png));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) return false;
    const mime = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
    return true;
  }

  function externalizeImageField(value: string | undefined, fallbackMediaUrl: string): string {
    if (!value) return '';
    return value.startsWith('data:image/') ? fallbackMediaUrl : value;
  }

  // ---- Health & Public Storefront API ----
  app.get('/api/health', async (_req, res) => {
    try {
      const database = await getDatabaseMode();
      res.json({ ok: true, service: 'inayas-wardrobe-api', database });
    } catch (error) {
      res.status(500).json({
        ok: false,
        service: 'inayas-wardrobe-api',
        error: error instanceof Error ? error.message : 'Database connection error',
      });
    }
  });

  // Serve legacy base64 DB images as cacheable HTTP image responses instead of embedding in JSON
  app.get('/api/media/product/:id', async (req, res) => {
    try {
      const id = String(req.params.id);
      const idxParam = Number(req.query.index);
      const products = await listProducts();
      const found = products.find((p) => p.id === id);
      if (!found) {
        res.status(404).end();
        return;
      }
      const candidate =
        Number.isInteger(idxParam) && idxParam >= 0 && found.images?.[idxParam]
          ? found.images[idxParam]
          : found.image;
      if (candidate.startsWith('data:image/') && sendDataUrlAsBinary(res, candidate)) {
        return;
      }
      if (candidate && !candidate.startsWith('data:')) {
        res.redirect(302, candidate);
        return;
      }
      res.status(404).end();
    } catch {
      res.status(500).end();
    }
  });

  app.get('/api/media/product-thumb/:id', async (req, res) => {
    try {
      const id = String(req.params.id);
      const products = await listProducts();
      const found = products.find((p) => p.id === id);
      if (!found) {
        res.status(404).end();
        return;
      }
      const candidate = found.thumb || found.image;
      if (candidate.startsWith('data:image/') && sendDataUrlAsBinary(res, candidate)) {
        return;
      }
      if (candidate && !candidate.startsWith('data:')) {
        res.redirect(302, candidate);
        return;
      }
      res.status(404).end();
    } catch {
      res.status(500).end();
    }
  });

  app.get('/api/media/gallery/:id', async (req, res) => {
    try {
      const id = String(req.params.id);
      const gallery = await listGallery();
      const found = gallery.find((g) => g.id === id);
      if (!found) {
        res.status(404).end();
        return;
      }
      if (found.image.startsWith('data:image/') && sendDataUrlAsBinary(res, found.image)) {
        return;
      }
      if (found.image && !found.image.startsWith('data:')) {
        res.redirect(302, found.image);
        return;
      }
      res.status(404).end();
    } catch {
      res.status(500).end();
    }
  });

  app.get('/api/media/site/:slotKey', async (req, res) => {
    try {
      const slotKey = String(req.params.slotKey || '');
      const settings = await getSettingsBundle();
      const val = settings.siteImages[slotKey];
      if (!val) {
        res.status(404).end();
        return;
      }
      if (val.startsWith('data:image/') && sendDataUrlAsBinary(res, val)) {
        return;
      }
      if (!val.startsWith('data:')) {
        res.redirect(302, val);
        return;
      }
      res.status(404).end();
    } catch {
      res.status(500).end();
    }
  });

  app.get('/api/storefront', async (_req, res) => {
    try {
      const [products, reviews, gallery, settings] = await Promise.all([
        listProducts(),
        listReviews(),
        listGallery(),
        getSettingsBundle(),
      ]);

      // Never dump megabytes of inline base64 strings into the storefront bootstrap JSON
      const lightweightProducts = products.map((p) => ({
        ...p,
        image: externalizeImageField(p.image, `/api/media/product/${encodeURIComponent(p.id)}`),
        thumb: p.thumb
          ? externalizeImageField(p.thumb, `/api/media/product-thumb/${encodeURIComponent(p.id)}`)
          : undefined,
        images: (p.images || []).map((img, idx) =>
          externalizeImageField(img, `/api/media/product/${encodeURIComponent(p.id)}?index=${idx}`),
        ),
      }));

      const lightweightGallery = gallery.map((g) => ({
        ...g,
        image: externalizeImageField(g.image, `/api/media/gallery/${encodeURIComponent(g.id)}`),
      }));

      const lightweightSiteImages: Record<string, string> = {};
      for (const [k, v] of Object.entries(settings.siteImages)) {
        lightweightSiteImages[k] = externalizeImageField(v, `/api/media/site/${encodeURIComponent(k)}`);
      }

      res.json({
        products: lightweightProducts,
        reviews,
        gallery: lightweightGallery,
        siteText: settings.siteText,
        siteImages: lightweightSiteImages,
      });
    } catch (error) {
      console.error('Failed to load storefront data:', error);
      res.status(500).json({ error: 'Failed to load storefront catalog' });
    }
  });

  app.get('/api/products', async (_req, res) => {
    try {
      const products = await listProducts();
      const lightweightProducts = products.map((p) => ({
        ...p,
        image: externalizeImageField(p.image, `/api/media/product/${encodeURIComponent(p.id)}`),
        thumb: p.thumb
          ? externalizeImageField(p.thumb, `/api/media/product-thumb/${encodeURIComponent(p.id)}`)
          : undefined,
        images: (p.images || []).map((img, idx) =>
          externalizeImageField(img, `/api/media/product/${encodeURIComponent(p.id)}?index=${idx}`),
        ),
      }));
      res.json({ products: lightweightProducts });
    } catch {
      res.status(500).json({ error: 'Failed to load products' });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const id = String(req.params.id);
      const products = await listProducts();
      const found = products.find((p) => p.id === id);
      if (!found) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({
        product: {
          ...found,
          image: externalizeImageField(found.image, `/api/media/product/${encodeURIComponent(found.id)}`),
          thumb: found.thumb
            ? externalizeImageField(found.thumb, `/api/media/product-thumb/${encodeURIComponent(found.id)}`)
            : undefined,
          images: (found.images || []).map((img, idx) =>
            externalizeImageField(img, `/api/media/product/${encodeURIComponent(found.id)}?index=${idx}`),
          ),
        },
      });
    } catch {
      res.status(500).json({ error: 'Failed to load product' });
    }
  });

  // ---- Authentication API (MySQL + HMAC Session, Rate-Limited) ----
  app.get('/api/auth/status', async (_req, res) => {
    try {
      const adminCount = await countAdminUsers();
      const envAdminConfigured = Boolean(process.env.ADMIN_PASSWORD?.trim());
      res.json({
        hasAdmin: adminCount > 0 || envAdminConfigured,
        setupTokenRequired: isProd || Boolean(process.env.ADMIN_SETUP_TOKEN?.trim()),
      });
    } catch {
      res.status(500).json({ error: 'Could not check admin status' });
    }
  });

  app.post('/api/auth/setup-admin', authLimiter, async (req, res) => {
    try {
      const adminCount = await countAdminUsers();
      if (adminCount > 0) {
        res.status(409).json({ error: 'Administrator account is already configured. Please sign in.' });
        return;
      }

      const configuredSetupToken = process.env.ADMIN_SETUP_TOKEN?.trim() || '';
      if (isProd && configuredSetupToken.length < 16) {
        res.status(403).json({
          error:
            'Admin setup endpoint is disabled in production without ADMIN_SETUP_TOKEN (>=16 chars) or ADMIN_PASSWORD in .env.',
        });
        return;
      }
      if (configuredSetupToken) {
        const providedToken = String(req.body?.setupToken || '').trim();
        if (!providedToken || !constantTimeEquals(providedToken, configuredSetupToken)) {
          res.status(403).json({ error: 'Invalid or missing setup token.' });
          return;
        }
      }

      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const name = String(req.body?.name || 'Store Owner').trim();

      if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'Please provide a valid email address.' });
        return;
      }
      if (ADMIN_EMAIL && email !== ADMIN_EMAIL) {
        res.status(403).json({ error: 'Email does not match configured ADMIN_EMAIL.' });
        return;
      }
      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters.' });
        return;
      }

      const passwordHash = hashPassword(password);
      const user = await createUser({
        email,
        passwordHash,
        name: name || 'Store Owner',
        role: 'admin',
      });
      const token = signSessionToken({
        uid: user.id,
        email: user.email,
        name: user.name,
        role: 'admin',
      });

      res.json({
        token,
        user: { uid: user.id, email: user.email, displayName: user.name, role: 'admin' },
        isAdmin: true,
      });
    } catch (error) {
      console.error('Admin setup error:', error);
      res.status(500).json({ error: 'Could not complete admin setup.' });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }

      const existing = await findUserByEmail(email);
      if (existing) {
        if (!verifyPassword(password, existing.passwordHash)) {
          res.status(401).json({ error: 'Invalid email or password.' });
          return;
        }
        const isAdmin = isAuthorizedAdminUser({ email: existing.email, role: existing.role });
        const token = signSessionToken({
          uid: existing.id,
          email: existing.email,
          name: existing.name,
          role: isAdmin ? 'admin' : 'customer',
        });
        res.json({
          token,
          user: {
            uid: existing.id,
            email: existing.email,
            displayName: existing.name,
            role: isAdmin ? 'admin' : 'customer',
          },
          isAdmin,
        });
        return;
      }

      // Optional env bootstrap login when ADMIN_EMAIL and ADMIN_PASSWORD are configured in .env
      const envAdminPass = process.env.ADMIN_PASSWORD?.trim();
      const targetAdminEmail = ADMIN_EMAIL;
      if (
        targetAdminEmail &&
        email === targetAdminEmail &&
        envAdminPass &&
        constantTimeEquals(password, envAdminPass)
      ) {
        const created = await createUser({
          email: targetAdminEmail,
          passwordHash: hashPassword(envAdminPass),
          name: 'Store Owner',
          role: 'admin',
        });
        const token = signSessionToken({
          uid: created.id,
          email: created.email,
          name: created.name,
          role: 'admin',
        });
        res.json({
          token,
          user: { uid: created.id, email: created.email, displayName: created.name, role: 'admin' },
          isAdmin: true,
        });
        return;
      }

      res.status(401).json({ error: 'Invalid email or password.' });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Sign-in failed.' });
    }
  });

  app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const name = String(req.body?.name || '').trim();

      if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'Please provide a valid email address.' });
        return;
      }
      if (ADMIN_EMAIL && email === ADMIN_EMAIL) {
        res.status(403).json({ error: 'Owner email must sign in via the Admin Studio Portal.' });
        return;
      }
      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters.' });
        return;
      }

      const duplicate = await findUserByEmail(email);
      if (duplicate) {
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }

      const user = await createUser({
        email,
        passwordHash: hashPassword(password),
        name: name || email.split('@')[0],
        role: 'customer',
      });
      const token = signSessionToken({
        uid: user.id,
        email: user.email,
        name: user.name,
        role: 'customer',
      });

      res.status(201).json({
        token,
        user: { uid: user.id, email: user.email, displayName: user.name, role: 'customer' },
        isAdmin: false,
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Could not create account.' });
    }
  });

  app.get('/api/auth/session', requireAuth, (req: AuthRequest, res) => {
    const user = req.user;
    const isAdmin = isAuthorizedAdminUser(user);
    res.json({
      uid: user?.uid || '',
      email: user?.email || '',
      displayName: user?.name || '',
      role: isAdmin ? 'admin' : 'customer',
      isAdmin,
    });
  });

  // ---- Customer Orders, Quotes & Inquiries ----
  app.post('/api/quote/wardrobe', (req, res) => {
    const body = req.body || {};
    const widthFt = Number(body.widthFt) || 6;
    const heightFt = Number(body.heightFt) || 7;
    const depthFt = Number(body.depthFt) || 2;
    const ratePerSqFt = Number(body.ratePerSqFt) || 1650;
    const doorMultiplier = Number(body.doorMultiplier) || 1.1;
    const finishName = String(body.finishName || 'Walnut Brown').slice(0, 60);

    const estimatedTaka = computeCustomWardrobeQuote({
      widthFt,
      heightFt,
      depthFt,
      ratePerSqFt,
      doorMultiplier,
    });

    const whatsappUrl = buildWardrobeWhatsAppUrl({
      widthFt,
      heightFt,
      finishName,
      estimatedTaka,
    });

    res.json({
      estimatedTaka,
      whatsappUrl,
      dimensions: { widthFt, heightFt, depthFt },
      finishName,
    });
  });

  app.post('/api/orders/validate', async (req, res) => {
    const input = (req.body || {}) as OrderValidationInput;
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

  app.post('/api/orders', submitLimiter, optionalAuth, async (req: AuthRequest, res) => {
    try {
      const input = (req.body || {}) as OrderValidationInput & { note?: string };
      const formCheck = validateOrderPayload(input);
      if (!formCheck.valid) {
        res.status(400).json({ error: formCheck.error });
        return;
      }

      // Compute prices and total exclusively from authoritative server/DB catalog
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
        note: input.note ? String(input.note).trim().slice(0, 400) : undefined,
        paymentMethod: String(input.paymentMethod),
        total: verified.normalizedTotal,
        items: verified.items,
        userId: req.user?.uid,
      });

      res.status(201).json({ id: order.id, order });
    } catch (error) {
      console.error('Order submission error:', error);
      res.status(500).json({ error: 'Could not place order. Please try again.' });
    }
  });

  app.post('/api/inquiries', submitLimiter, async (req, res) => {
    try {
      const name = String(req.body?.name || '').trim();
      const phone = String(req.body?.phone || '').trim();
      const interest = String(req.body?.interest || 'Custom Wardrobe').trim();
      const message = String(req.body?.message || '').trim();

      if (name.length < 2 || !isValidBdPhone(phone)) {
        res.status(400).json({
          error: 'Please provide your name and a valid 11-digit BD mobile number (e.g. 017XXXXXXXX).',
        });
        return;
      }

      const inquiry = await createInquiry({
        name,
        phone,
        interest,
        message: message || undefined,
      });
      res.status(201).json({ id: inquiry.id, inquiry });
    } catch (error) {
      console.error('Inquiry error:', error);
      res.status(500).json({ error: 'Could not submit inquiry.' });
    }
  });

  // ---- Protected Admin Management API ----
  app.post('/api/admin/upload', requireAdmin, async (req, res) => {
    try {
      const dataUrl = String(req.body?.dataUrl || '');
      const rawPrefix = String(req.body?.prefix || 'img').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'img';
      const match = /^data:image\/(webp|jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
      if (!match) {
        res.status(400).json({ error: 'Only WebP, JPEG, or PNG images are allowed.' });
        return;
      }
      const ext = match[1] === 'webp' ? 'webp' : match[1] === 'png' ? 'png' : 'jpg';
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length > 2.5 * 1024 * 1024) {
        res.status(413).json({ error: 'Image file is too large (max 2.5 MB).' });
        return;
      }
      fs.mkdirSync(uploadsDir, { recursive: true });
      const filename = `${rawPrefix}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      res.status(201).json({ url: `/uploads/${filename}` });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to store uploaded image.' });
    }
  });

  app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
    try {
      const [products, orders, inquiries, gallery, reviews, settings] = await Promise.all([
        listProducts(),
        listOrders(),
        listInquiries(),
        listGallery(),
        listReviews(),
        getSettingsBundle(),
      ]);
      res.json({
        products,
        orders,
        inquiries,
        gallery,
        reviews,
        siteText: settings.siteText,
        siteImages: settings.siteImages,
      });
    } catch (error) {
      console.error('Admin overview error:', error);
      res.status(500).json({ error: 'Failed to load admin overview' });
    }
  });

  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const name = String(b.name || '').trim();
      const price = Math.max(0, Number(b.price) || 0);
      if (!name || price <= 0) {
        res.status(400).json({ error: 'Product name and valid price are required.' });
        return;
      }
      const product = await createProduct({
        name,
        cat: String(b.cat || 'Wardrobe').trim(),
        price,
        old: Math.max(0, Number(b.old) || 0),
        desc: String(b.desc || '').trim(),
        tag: b.tag ? String(b.tag).trim() : undefined,
        rating: 4.9,
        reviews: 1,
        image: String(b.image || ''),
        thumb: b.thumb ? String(b.thumb) : undefined,
        images: Array.isArray(b.images) ? b.images.map(String) : b.image ? [String(b.image)] : [],
      });
      res.status(201).json({ product });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  });

  app.post('/api/admin/products/seed', requireAdmin, async (req, res) => {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      for (const item of items) {
        await createProduct({
          id: `seed_${String(item.id)}`,
          name: String(item.name || 'Product'),
          cat: String(item.cat || 'Wardrobe'),
          price: Number(item.price) || 0,
          old: Number(item.old) || 0,
          desc: String(item.desc || ''),
          tag: item.tag ? String(item.tag) : undefined,
          rating: Number(item.rating) || 4.8,
          reviews: Number(item.reviews) || 0,
          image: String(item.image || ''),
          thumb: item.thumb ? String(item.thumb) : undefined,
          images: Array.isArray(item.images) ? item.images.map(String) : [String(item.image || '')],
        });
      }
      const products = await listProducts();
      res.json({ products });
    } catch (error) {
      console.error('Seed products error:', error);
      res.status(500).json({ error: 'Failed to import default catalog' });
    }
  });

  app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id);
      const b = req.body || {};
      const ok = await updateProduct(id, {
        name: b.name !== undefined ? String(b.name).trim() : undefined,
        cat: b.cat !== undefined ? String(b.cat).trim() : undefined,
        price: b.price !== undefined ? Math.max(0, Number(b.price) || 0) : undefined,
        old: b.old !== undefined ? Math.max(0, Number(b.old) || 0) : undefined,
        desc: b.desc !== undefined ? String(b.desc).trim() : undefined,
        tag: b.tag !== undefined ? String(b.tag).trim() : undefined,
        image: b.image !== undefined ? String(b.image) : undefined,
        thumb: b.thumb !== undefined ? String(b.thumb) : undefined,
        images: Array.isArray(b.images) ? b.images.map(String) : undefined,
      });
      if (!ok) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to update product' });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      await deleteProduct(String(req.params.id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    try {
      const status = String(req.body?.status || '') as DbOrder['status'];
      if (!['New', 'Confirmed', 'Delivered', 'Cancelled'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }
      await updateOrderStatus(String(req.params.id), status);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to update order status' });
    }
  });

  app.delete('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    try {
      await deleteOrder(String(req.params.id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete order' });
    }
  });

  app.patch('/api/admin/inquiries/:id', requireAdmin, async (req, res) => {
    try {
      const status = String(req.body?.status || '') as DbInquiry['status'];
      if (!['New', 'Contacted', 'Closed'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }
      await updateInquiryStatus(String(req.params.id), status);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to update inquiry status' });
    }
  });

  app.delete('/api/admin/inquiries/:id', requireAdmin, async (req, res) => {
    try {
      await deleteInquiry(String(req.params.id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete inquiry' });
    }
  });

  app.post('/api/admin/gallery', requireAdmin, async (req, res) => {
    try {
      const image = String(req.body?.image || '');
      if (!image) {
        res.status(400).json({ error: 'Image is required' });
        return;
      }
      const item = await createGalleryItem({
        cat: String(req.body?.cat || 'Wardrobe'),
        title: String(req.body?.title || 'Completed Home Project'),
        image,
      });
      res.status(201).json({ item });
    } catch {
      res.status(500).json({ error: 'Failed to save gallery photo' });
    }
  });

  app.delete('/api/admin/gallery/:id', requireAdmin, async (req, res) => {
    try {
      await deleteGalleryItem(String(req.params.id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete gallery photo' });
    }
  });

  app.post('/api/admin/reviews', requireAdmin, async (req, res) => {
    try {
      const name = String(req.body?.name || '').trim();
      const text = String(req.body?.text || '').trim();
      const stars = Math.max(1, Math.min(5, Number(req.body?.stars) || 5));
      if (!name || !text) {
        res.status(400).json({ error: 'Customer name and review text are required' });
        return;
      }
      const review = await createReview({ name, stars, text });
      res.status(201).json({ review });
    } catch {
      res.status(500).json({ error: 'Failed to save review' });
    }
  });

  app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
    try {
      await deleteReview(String(req.params.id));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete review' });
    }
  });

  app.put('/api/admin/settings/text', requireAdmin, async (req, res) => {
    try {
      const nextText = req.body?.siteText;
      if (!nextText || typeof nextText !== 'object') {
        res.status(400).json({ error: 'Invalid settings payload' });
        return;
      }
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(nextText as Record<string, unknown>)) {
        if (typeof v === 'string') {
          clean[k] = v;
        }
      }
      await saveSiteText(clean);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to save site settings' });
    }
  });

  app.put('/api/admin/settings/image/:slotKey', requireAdmin, async (req, res) => {
    try {
      const slotKey = String(req.params.slotKey || '');
      const dataUrl = String(req.body?.data || '');
      if (!slotKey || !dataUrl) {
        res.status(400).json({ error: 'Slot key and image data are required' });
        return;
      }
      await saveSiteImage(slotKey, dataUrl);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to save site image' });
    }
  });

  // Redirect legacy multi-page .html paths gracefully to SPA routes
  const legacyRouteMap: Record<string, string> = {
    '/shop.html': '/shop',
    '/product.html': '/product',
    '/view3d.html': '/view3d',
    '/gallery.html': '/gallery',
    '/about.html': '/about',
    '/contact.html': '/contact',
    '/admin.html': '/admin',
  };
  app.get(Object.keys(legacyRouteMap), (req, res) => {
    const target = legacyRouteMap[req.path] || '/';
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(301, target + qs);
  });

  // ---- Frontend Serving (Vite Dev Middleware or Production Dist) ----
  const distDir = path.join(APP_ROOT, 'dist');
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Inaya's Wardrobe server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
