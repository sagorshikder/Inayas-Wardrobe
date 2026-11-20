import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTaka,
  computeCartSummary,
  upsertCartItem,
  updateCartQuantity,
  computeCustomWardrobeQuote,
  buildWardrobeWhatsAppUrl,
  validateOrderPayload,
  isValidBdPhone,
} from './commerce.ts';
import { resolveVerifiedOrderItems } from './catalogPrices.ts';
import { buildSeoMetadata } from './seo.ts';
import type { SiteTextConfig } from '../data/catalog.ts';

const TEST_SITE_TEXT: SiteTextConfig = {
  hero_eyebrow: 'Premium furniture collection',
  hero_title: 'Transform Your Space with Timeless Elegance.',
  hero_text: 'Custom furniture.',
  hero_btn1: 'Explore',
  hero_btn2: 'Customize',
  hero_chip: 'Custom wardrobe',
  phone: '+880 1714-000349',
  wa: '8801714000349',
  address: 'Pangsha-Rajbari, Bangladesh',
  fb: 'https://www.facebook.com/share/1FZzyT7ius/',
  ig: 'https://www.instagram.com/',
  tt: 'https://www.tiktok.com/@wardrobe204',
  tagline: 'Quality Furniture',
  g_title: 'Gallery',
  g_text: 'Real homes.',
  f_title: '3D View',
  f_text: 'Explore 3D.',
  c_title: 'Custom Design',
  c_text: 'Your choice.',
  foot_text: 'Elegance.',
  copy: "© 2026 INAYA'S WARDROBE",
  pay_bkash_nagad: '01714000350',
  pay_rocket: '017140003504',
  pay_ibbl: '20503900200723012',
};

test('formatTaka formats BDT currency cleanly', () => {
  assert.equal(formatTaka(48500), '৳ 48,500');
  assert.equal(formatTaka(0), '৳ 0');
});

test('cart upsert, increment, and removal behave deterministically', () => {
  let cart = upsertCartItem([], { id: '1', name: 'Sliding Wardrobe', price: 48500 });
  assert.equal(cart.length, 1);
  assert.equal(cart[0].qty, 1);

  cart = upsertCartItem(cart, { id: '1', name: 'Sliding Wardrobe', price: 48500 });
  assert.equal(cart[0].qty, 2);

  cart = upsertCartItem(cart, { id: '2', name: 'Royal Bed', price: 38000 });
  const summary = computeCartSummary(cart);
  assert.equal(summary.count, 3);
  assert.equal(summary.total, 135000);

  cart = updateCartQuantity(cart, '1', 0);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].id, '2');
});

test('custom wardrobe quote rounds to nearest 100 taka and builds WhatsApp URL', () => {
  const quote = computeCustomWardrobeQuote({
    widthFt: 6,
    heightFt: 7,
    depthFt: 2,
    ratePerSqFt: 1650,
    doorMultiplier: 1.1,
  });
  assert.equal(quote, 76200);

  const url = buildWardrobeWhatsAppUrl({
    widthFt: 6,
    heightFt: 7,
    finishName: 'Walnut Brown',
    estimatedTaka: quote,
  });
  assert.ok(url.startsWith('https://wa.me/8801714000349?text='));
  assert.ok(decodeURIComponent(url).includes('Walnut Brown'));
});

test('order payload validation enforces required fields and valid payment methods', () => {
  const bad = validateOrderPayload({
    name: 'A',
    phone: '123',
    address: 'Dhaka',
    paymentMethod: 'COD',
    items: [],
  });
  assert.equal(bad.valid, false);

  const good = validateOrderPayload({
    name: 'Sagor Shikder',
    phone: '01714000349',
    address: 'Pangsha, Rajbari, Bangladesh',
    paymentMethod: 'bKash',
    items: [{ id: '1', name: 'Sliding Wardrobe', price: 48500, qty: 1 }],
  });
  assert.equal(good.valid, true);
  assert.equal(good.normalizedTotal, 48500);
});

test('server-side order pricing ignores tampered client prices and rejects unknown IDs', () => {
  const dbCatalog = [{ id: 'seed_1', name: 'Sliding Door Wardrobe', price: 48500 }];

  const tampered = resolveVerifiedOrderItems(
    [{ id: '1-WalnutBrown', name: 'Sliding Door Wardrobe (Walnut Brown)', price: 1, qty: 2 }],
    dbCatalog,
  );
  assert.equal(tampered.valid, true);
  assert.equal(tampered.normalizedTotal, 97000);
  assert.equal(tampered.items[0].price, 48500);

  const unknown = resolveVerifiedOrderItems(
    [{ id: 'fake-product-999', name: 'Fake', price: 1, qty: 1 }],
    dbCatalog,
  );
  assert.equal(unknown.valid, false);
});

test('phone validation strictly requires 11-digit BD mobile format (or +8801... 13-digit)', () => {
  assert.equal(isValidBdPhone('01714000349'), true);
  assert.equal(isValidBdPhone('+880 1326-603306'), true);
  assert.equal(isValidBdPhone('0171400034'), false); // 10 digits rejected
  assert.equal(isValidBdPhone('017140003499999'), false); // 15 digits rejected
  assert.equal(isValidBdPhone('02987654321'), false); // invalid prefix rejected
});

test('per-route SEO builder generates distinct titles, noindex on /admin, and Product JSON-LD', () => {
  const sampleProducts = [
    {
      id: '1',
      name: 'Sliding Door Wardrobe',
      cat: 'Wardrobe',
      price: 48500,
      desc: 'Sliding wardrobe with soft-close doors.',
      rating: 4.9,
      reviews: 98,
      image: '/uploads/wardrobe.webp',
    },
  ];

  const homeSeo = buildSeoMetadata({ route: '/', products: sampleProducts, siteText: TEST_SITE_TEXT });
  const shopSeo = buildSeoMetadata({ route: '/shop?cat=Wardrobe', products: sampleProducts, siteText: TEST_SITE_TEXT });
  const prodSeo = buildSeoMetadata({ route: '/product?id=1', products: sampleProducts, siteText: TEST_SITE_TEXT });
  const adminSeo = buildSeoMetadata({ route: '/admin', products: sampleProducts, siteText: TEST_SITE_TEXT });

  assert.notEqual(homeSeo.title, shopSeo.title);
  assert.notEqual(shopSeo.title, prodSeo.title);
  assert.ok(prodSeo.title.includes('Sliding Door Wardrobe'));
  assert.equal(prodSeo.jsonLd['@type'], 'Product');
  assert.equal(adminSeo.robots, 'noindex, nofollow');
});
