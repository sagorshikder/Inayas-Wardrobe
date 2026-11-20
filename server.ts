import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildWardrobeWhatsAppUrl,
  computeCustomWardrobeQuote,
  validateOrderPayload,
  type OrderValidationInput,
} from './src/utils/commerce.ts';
import {
  ADMIN_EMAIL,
  hashPassword,
  optionalAuth,
  requireAdmin,
  requireAuth,
  signSessionToken,
  verifyPassword,
  type AuthRequest,
} from './src/middleware/auth.ts';
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

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Expose public assets cleanly at both / and /public paths
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    app.use('/public', express.static(publicDir));
    app.use(express.static(publicDir));
  }

  // Expose root brand assets (Logo.png, cover-photo.jpg, icons, og-image.jpg)
  const rootAssets = [
    '/Logo.png',
    '/cover-photo.jpg',
    '/og-image.jpg',
    '/favicon.ico',
    '/favicon-32.png',
    '/apple-touch-icon.png',
    '/icon-192.png',
    '/robots.txt',
    '/sitemap.xml',
  ];
  app.get(rootAssets, (req, res, next) => {
    const filePath = path.join(__dirname, req.path.replace(/^\/+/, ''));
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
      return;
    }
    next();
  });

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

  app.get('/api/storefront', async (_req, res) => {
    try {
      const [products, reviews, gallery, settings] = await Promise.all([
        listProducts(),
        listReviews(),
        listGallery(),
        getSettingsBundle(),
      ]);
      res.json({
        products,
        reviews,
        gallery,
        siteText: settings.siteText,
        siteImages: settings.siteImages,
      });
    } catch (error) {
      console.error('Failed to load storefront data:', error);
      res.status(500).json({ error: 'Failed to load storefront catalog' });
    }
  });

  app.get('/api/products', async (_req, res) => {
    try {
      const products = await listProducts();
      res.json({ products });
    } catch {
      res.status(500).json({ error: 'Failed to load products' });
    }
  });

  // ---- Authentication API (MySQL + HMAC Session) ----
  app.get('/api/auth/status', async (_req, res) => {
    try {
      const adminCount = await countAdminUsers();
      const envAdminConfigured = Boolean(process.env.ADMIN_PASSWORD?.trim());
      res.json({
        hasAdmin: adminCount > 0 || envAdminConfigured,
        adminEmail: ADMIN_EMAIL,
      });
    } catch {
      res.status(500).json({ error: 'Could not check admin status' });
    }
  });

  app.post('/api/auth/setup-admin', async (req, res) => {
    try {
      const adminCount = await countAdminUsers();
      if (adminCount > 0) {
        res.status(409).json({ error: 'Administrator account is already configured. Please sign in.' });
        return;
      }
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const name = String(req.body?.name || 'Store Owner').trim();

      if (email !== ADMIN_EMAIL) {
        res.status(403).json({ error: `Only the owner email (${ADMIN_EMAIL}) can be registered as administrator.` });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters.' });
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

  app.post('/api/auth/login', async (req, res) => {
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
        const isAdmin = existing.role === 'admin' && existing.email.toLowerCase() === ADMIN_EMAIL;
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

      // Optional env fallback for initial cPanel ADMIN_PASSWORD login
      const envAdminPass = process.env.ADMIN_PASSWORD?.trim();
      if (email === ADMIN_EMAIL && envAdminPass && password === envAdminPass) {
        const created = await createUser({
          email: ADMIN_EMAIL,
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

  app.post('/api/auth/register', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const name = String(req.body?.name || '').trim();

      if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'Please provide a valid email address.' });
        return;
      }
      if (email === ADMIN_EMAIL) {
        res.status(403).json({ error: 'Owner email must sign in via the Admin Studio Portal.' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters.' });
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
    const isAdmin =
      user?.role === 'admin' && user.email.toLowerCase() === ADMIN_EMAIL;
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

  app.post('/api/orders/validate', (req, res) => {
    const input = (req.body || {}) as OrderValidationInput;
    const result = validateOrderPayload(input);
    if (!result.valid) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  });

  app.post('/api/orders', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const input = (req.body || {}) as OrderValidationInput & { note?: string };
      const result = validateOrderPayload(input);
      if (!result.valid) {
        res.status(400).json({ error: result.error });
        return;
      }

      const order = await createOrder({
        name: String(input.name).trim(),
        phone: String(input.phone).trim(),
        address: String(input.address).trim(),
        note: input.note ? String(input.note).trim().slice(0, 400) : undefined,
        paymentMethod: String(input.paymentMethod),
        total: result.normalizedTotal,
        items: input.items.map((i) => ({
          id: String(i.id),
          name: String(i.name),
          price: Number(i.price),
          qty: Number(i.qty),
        })),
        userId: req.user?.uid,
      });

      res.status(201).json({ id: order.id, order });
    } catch (error) {
      console.error('Order submission error:', error);
      res.status(500).json({ error: 'Could not place order. Please try again.' });
    }
  });

  app.post('/api/inquiries', async (req, res) => {
    try {
      const name = String(req.body?.name || '').trim();
      const phone = String(req.body?.phone || '').trim();
      const interest = String(req.body?.interest || 'Custom Wardrobe').trim();
      const message = String(req.body?.message || '').trim();

      if (name.length < 2 || phone.replace(/\D/g, '').length < 10) {
        res.status(400).json({ error: 'Please provide your name and valid phone number.' });
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
    res.redirect(302, target + qs);
  });

  // ---- Frontend Serving (Vite Dev Middleware or Production Dist) ----
  const distDir = path.join(__dirname, 'dist');
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
