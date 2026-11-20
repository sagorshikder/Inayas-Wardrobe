import { computeCartSummary, type CartItem } from './commerce.ts';

export interface AuthoritativeProductPrice {
  id: string;
  name: string;
  price: number;
}

export const DEFAULT_CATALOG_PRICES: Record<string, AuthoritativeProductPrice> = {
  '1': { id: '1', name: 'Sliding Door Wardrobe', price: 48500 },
  '2': { id: '2', name: 'Royal Queen Size Bed', price: 38000 },
  '3': { id: '3', name: 'Modern 3-Seater Sofa', price: 32000 },
  '4': { id: '4', name: '6-Seater Dining Set', price: 42000 },
  '5': { id: '5', name: 'Hinged 3-Door Wardrobe', price: 36000 },
  '6': { id: '6', name: 'Architectural Storage Cabinet', price: 18500 },
  '7': { id: '7', name: 'Dressing Table with Mirror', price: 15500 },
  '8': { id: '8', name: 'Minimalist TV Cabinet', price: 21000 },
  '9': { id: '9', name: 'Sculpted Coffee Table', price: 9500 },
  '10': { id: '10', name: '4-Seater Apartment Dining Set', price: 29000 },
  '11': { id: '11', name: 'Slim Shoe Rack Cabinet', price: 8500 },
  '12': { id: '12', name: 'Custom Study & Work Desk', price: 16000 },
};

export interface VerifiedOrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export function lookupCatalogProduct(
  rawItemId: string,
  dbProducts: AuthoritativeProductPrice[],
): AuthoritativeProductPrice | null {
  const trimmed = String(rawItemId || '').trim();
  if (!trimmed) return null;

  // 1. Exact match in DB products
  const exactDb = dbProducts.find((p) => p.id === trimmed || p.id === `seed_${trimmed}`);
  if (exactDb) return exactDb;

  // 2. Variant ID format from ProductDetailPage: `${productId}-${FinishColor}`
  //    Try matching known DB product prefixes before '-' (supports UUIDs & numeric IDs)
  for (const p of dbProducts) {
    const base = p.id.replace(/^seed_/, '');
    if (trimmed.startsWith(`${p.id}-`) || trimmed.startsWith(`${base}-`)) {
      return p;
    }
  }

  // 3. Fallback to curated starter catalog prices when DB has not seeded defaults yet
  if (DEFAULT_CATALOG_PRICES[trimmed]) {
    return DEFAULT_CATALOG_PRICES[trimmed];
  }
  const strippedSeed = trimmed.replace(/^seed_/, '');
  if (DEFAULT_CATALOG_PRICES[strippedSeed]) {
    return DEFAULT_CATALOG_PRICES[strippedSeed];
  }
  const dashIdx = strippedSeed.indexOf('-');
  if (dashIdx > 0) {
    const baseId = strippedSeed.slice(0, dashIdx);
    if (DEFAULT_CATALOG_PRICES[baseId]) {
      return DEFAULT_CATALOG_PRICES[baseId];
    }
  }

  return null;
}

export function resolveVerifiedOrderItems(
  clientItems: CartItem[],
  dbProducts: AuthoritativeProductPrice[],
): {
  valid: boolean;
  error?: string;
  items: VerifiedOrderItem[];
  normalizedTotal: number;
} {
  if (!Array.isArray(clientItems) || clientItems.length === 0) {
    return { valid: false, error: 'Your cart is empty.', items: [], normalizedTotal: 0 };
  }
  if (clientItems.length > 50) {
    return { valid: false, error: 'Too many line items in a single order.', items: [], normalizedTotal: 0 };
  }

  const verified: VerifiedOrderItem[] = [];
  for (const raw of clientItems) {
    const qty = Math.floor(Number(raw.qty) || 0);
    if (qty < 1 || qty > 50) {
      return {
        valid: false,
        error: 'Each item quantity must be between 1 and 50.',
        items: [],
        normalizedTotal: 0,
      };
    }

    const match = lookupCatalogProduct(raw.id, dbProducts);
    if (!match || match.price <= 0) {
      return {
        valid: false,
        error: `Unknown or unavailable product in order (${String(raw.id || '').slice(0, 40)}).`,
        items: [],
        normalizedTotal: 0,
      };
    }

    // Preserve variant label suffix if provided safely, while enforcing authoritative name & price
    const rawName = String(raw.name || '').trim();
    const variantSuffixMatch = rawName.match(/\(([^()]{1,40})\)$/);
    const displayName = variantSuffixMatch
      ? `${match.name} (${variantSuffixMatch[1]})`
      : match.name;

    verified.push({
      id: String(raw.id).slice(0, 64),
      name: displayName.slice(0, 180),
      price: Math.round(match.price),
      qty,
    });
  }

  const { total } = computeCartSummary(verified);
  if (total <= 0) {
    return { valid: false, error: 'Order total must be greater than zero.', items: [], normalizedTotal: 0 };
  }

  return {
    valid: true,
    items: verified,
    normalizedTotal: total,
  };
}
