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
import { ADMIN_EMAIL, requireAuth, type AuthRequest } from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

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

  // ---- REST API Routes ----
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'inayas-wardrobe-api' });
  });

  app.get('/api/auth/session', requireAuth, (req: AuthRequest, res) => {
    const user = req.user;
    const isAdmin =
      Boolean(user?.email_verified) &&
      user?.email?.toLowerCase() === ADMIN_EMAIL;
    res.json({
      uid: user?.uid || '',
      email: user?.email || '',
      name: user?.name || '',
      emailVerified: Boolean(user?.email_verified),
      isAdmin,
    });
  });

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
