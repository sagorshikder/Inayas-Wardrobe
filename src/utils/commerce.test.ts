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
} from './commerce.ts';

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
