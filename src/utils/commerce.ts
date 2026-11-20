export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  color?: string;
  image?: string;
}

export interface OrderValidationInput {
  name: string;
  phone: string;
  address: string;
  paymentMethod: string;
  items: CartItem[];
}

export type PaymentMethod = 'COD' | 'bKash' | 'Nagad' | 'Rocket' | 'IBBL';

export const WA_NUMBER = '8801714000349';
export const PAY_BKASH_NAGAD = '01714000350';
export const PAY_ROCKET = '017140003504';
export const PAY_IBBL = '20503900200723012';

export function formatTaka(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return '৳ ' + safe.toLocaleString('en-IN');
}

export function computeCartSummary(items: CartItem[]): { count: number; total: number } {
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

export function upsertCartItem(items: CartItem[], next: Omit<CartItem, 'qty'>, qtyDelta = 1): CartItem[] {
  const idx = items.findIndex((i) => i.id === next.id);
  if (idx === -1) {
    return qtyDelta > 0 ? [...items, { ...next, qty: qtyDelta }] : items;
  }
  const updated = items.map((item, i) =>
    i === idx ? { ...item, qty: Math.max(1, item.qty + qtyDelta) } : item,
  );
  return updated;
}

export function updateCartQuantity(items: CartItem[], id: string, qty: number): CartItem[] {
  if (qty <= 0) {
    return items.filter((i) => i.id !== id);
  }
  return items.map((i) => (i.id === id ? { ...i, qty: Math.floor(qty) } : i));
}

export function computeCustomWardrobeQuote(params: {
  widthFt: number;
  heightFt: number;
  depthFt: number;
  ratePerSqFt: number;
  doorMultiplier: number;
}): number {
  const w = Math.max(2, Math.min(20, Number(params.widthFt) || 0));
  const h = Math.max(4, Math.min(12, Number(params.heightFt) || 0));
  const d = Math.max(1.5, Math.min(4, Number(params.depthFt) || 2));
  const rate = Math.max(500, Number(params.ratePerSqFt) || 1600);
  const doorMul = Math.max(0.8, Number(params.doorMultiplier) || 1);
  const depthMul = 1 + Math.max(0, d - 2) * 0.1;
  return Math.round((w * h * rate * doorMul * depthMul) / 100) * 100;
}

export function buildWardrobeWhatsAppUrl(params: {
  widthFt: number;
  heightFt: number;
  finishName: string;
  estimatedTaka?: number;
}): string {
  const lines = [
    'Hello, I want a custom wardrobe.',
    `Size: ${params.widthFt} ft wide x ${params.heightFt} ft high`,
    `Finish: ${params.finishName}`,
  ];
  if (params.estimatedTaka && params.estimatedTaka > 0) {
    lines.push(`Estimated Quote: ${formatTaka(params.estimatedTaka)}`);
  }
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function buildCartWhatsAppUrl(items: CartItem[]): string {
  const { total } = computeCartSummary(items);
  const lines = [
    'Hello, I want to order from Inaya\'s Wardrobe:',
    ...items.map((i) => `- ${i.name} x ${i.qty} = ${formatTaka(i.price * i.qty)}`),
    `Total: ${formatTaka(total)}`,
  ];
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
}

const VALID_PAYMENTS = new Set<string>(['COD', 'bKash', 'Nagad', 'Rocket', 'IBBL']);

export function validateOrderPayload(input: OrderValidationInput): {
  valid: boolean;
  error?: string;
  normalizedTotal: number;
} {
  const name = (input.name || '').trim();
  const digits = (input.phone || '').replace(/\D/g, '');
  const address = (input.address || '').trim();
  if (name.length < 2) {
    return { valid: false, error: 'Please enter your full name.', normalizedTotal: 0 };
  }
  if (digits.length < 10 || digits.length > 15) {
    return { valid: false, error: 'Please enter a valid 11-digit phone number.', normalizedTotal: 0 };
  }
  if (address.length < 4) {
    return { valid: false, error: 'Please provide a complete delivery address.', normalizedTotal: 0 };
  }
  if (!VALID_PAYMENTS.has(input.paymentMethod)) {
    return { valid: false, error: 'Please select a valid payment method.', normalizedTotal: 0 };
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { valid: false, error: 'Your cart is empty.', normalizedTotal: 0 };
  }
  const { total } = computeCartSummary(input.items);
  if (total <= 0) {
    return { valid: false, error: 'Order total must be greater than zero.', normalizedTotal: 0 };
  }
  return { valid: true, normalizedTotal: total };
}
