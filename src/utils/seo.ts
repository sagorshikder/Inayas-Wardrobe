import type { ProductRecord, SiteTextConfig } from '../data/catalog';
import { formatTaka } from './commerce';

export interface SeoPayload {
  title: string;
  description: string;
  canonicalPath: string;
  ogType: 'website' | 'product';
  ogImage: string;
  robots: string;
  jsonLd: Record<string, unknown>;
}

const DEFAULT_ORIGIN = 'https://inayaswardrobe.com';

function buildStoreSchema(siteText: SiteTextConfig, origin: string): Record<string, unknown> {
  const sameAs = [siteText.fb, siteText.ig, siteText.tt].filter((u) => /^https?:\/\//.test(u));
  return {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    name: "Inaya's Wardrobe",
    url: origin,
    logo: `${origin}/Logo.webp`,
    image: `${origin}/og-image.jpg`,
    description:
      'Custom wardrobes, bedroom sets, and luxury home furniture crafted to your exact dimensions in Pangsha-Rajbari with nationwide delivery across Bangladesh.',
    telephone: siteText.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: siteText.address,
      addressLocality: 'Pangsha',
      addressRegion: 'Rajbari',
      addressCountry: 'BD',
    },
    priceRange: '৳8,500 – ৳120,000',
    paymentAccepted: 'Cash, bKash, Nagad, Rocket, Bank Transfer',
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function buildSeoMetadata(params: {
  route: string;
  products: ProductRecord[];
  siteText: SiteTextConfig;
  origin?: string;
}): SeoPayload {
  const origin = (params.origin || DEFAULT_ORIGIN).replace(/\/+$/, '');
  const [rawPath = '/', rawSearch = ''] = params.route.split('?');
  const pathname = rawPath.replace(/\/+$/, '') || '/';
  const search = new URLSearchParams(rawSearch);

  const storeJsonLd = buildStoreSchema(params.siteText, origin);

  if (pathname === '/admin') {
    return {
      title: "Admin Studio Portal | Inaya's Wardrobe",
      description: "Protected store management portal for Inaya's Wardrobe.",
      canonicalPath: '/admin',
      ogType: 'website',
      ogImage: `${origin}/og-image.jpg`,
      robots: 'noindex, nofollow',
      jsonLd: storeJsonLd,
    };
  }

  if (pathname === '/product') {
    const id = search.get('id') || '';
    const product =
      params.products.find((p) => p.id === id) ||
      params.products.find((p) => p.id === `seed_${id}`) ||
      params.products[0];

    if (product) {
      const cleanDesc = (product.desc || '').trim().slice(0, 155);
      const imageUrl = product.image.startsWith('http')
        ? product.image
        : `${origin}${product.image.startsWith('/') ? '' : '/'}${product.image}`;
      return {
        title: `${product.name} (${formatTaka(product.price)}) | Inaya's Wardrobe`,
        description:
          cleanDesc ||
          `Order ${product.name} at ${formatTaka(product.price)} from Inaya's Wardrobe with nationwide Cash on Delivery across Bangladesh.`,
        canonicalPath: `/product?id=${encodeURIComponent(product.id)}`,
        ogType: 'product',
        ogImage: imageUrl,
        robots: 'index, follow',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          category: product.cat,
          description: product.desc,
          sku: product.id,
          image: [imageUrl],
          brand: {
            '@type': 'Brand',
            name: "Inaya's Wardrobe",
          },
          offers: {
            '@type': 'Offer',
            url: `${origin}/product?id=${encodeURIComponent(product.id)}`,
            priceCurrency: 'BDT',
            price: String(product.price),
            availability: 'https://schema.org/InStock',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: String(product.rating || 4.8),
            reviewCount: String(Math.max(1, product.reviews || 1)),
          },
        },
      };
    }
  }

  if (pathname === '/shop') {
    const cat = search.get('cat');
    const q = search.get('q');
    const titlePrefix = q
      ? `Search: ${q}`
      : cat && cat !== 'All'
        ? `${cat} Collection`
        : 'Furniture & Wardrobe Catalog';
    return {
      title: `${titlePrefix} | Inaya's Wardrobe`,
      description:
        'Browse custom sliding wardrobes, hinged wardrobes, beds, sofas, dining sets, and home storage furniture across Bangladesh.',
      canonicalPath: cat ? `/shop?cat=${encodeURIComponent(cat)}` : '/shop',
      ogType: 'website',
      ogImage: `${origin}/og-image.jpg`,
      robots: 'index, follow',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: titlePrefix,
        url: `${origin}/shop`,
        isPartOf: { '@type': 'WebSite', name: "Inaya's Wardrobe", url: origin },
      },
    };
  }

  if (pathname === '/view3d') {
    return {
      title: "3D Wardrobe Studio & Quote | Inaya's Wardrobe",
      description:
        'Design your wardrobe width, height, and wood finish in interactive 3D and get an instant price quote in Taka.',
      canonicalPath: '/view3d',
      ogType: 'website',
      ogImage: `${origin}/og-image.jpg`,
      robots: 'index, follow',
      jsonLd: storeJsonLd,
    };
  }

  if (pathname === '/gallery') {
    return {
      title: "Completed Home Installations | Inaya's Wardrobe",
      description:
        'See real customer installations of custom wardrobes, beds, dining tables, and living room furniture across Bangladesh.',
      canonicalPath: '/gallery',
      ogType: 'website',
      ogImage: `${origin}/og-image.jpg`,
      robots: 'index, follow',
      jsonLd: storeJsonLd,
    };
  }

  if (pathname === '/about') {
    return {
      title: "About Our Workshop & Craft | Inaya's Wardrobe",
      description:
        "Learn how Inaya's Wardrobe crafts made-to-measure wardrobes and durable home furniture in Pangsha-Rajbari with a 1-year warranty.",
      canonicalPath: '/about',
      ogType: 'website',
      ogImage: `${origin}/og-image.jpg`,
      robots: 'index, follow',
      jsonLd: storeJsonLd,
    };
  }

  if (pathname === '/contact') {
    return {
      title: "Contact & Custom Quote | Inaya's Wardrobe",
      description:
        'Visit our Pangsha-Rajbari showroom, chat on WhatsApp, or request a free measurement and custom furniture quote.',
      canonicalPath: '/contact',
      ogType: 'website',
      ogImage: `${origin}/og-image.jpg`,
      robots: 'index, follow',
      jsonLd: storeJsonLd,
    };
  }

  return {
    title: "Inaya's Wardrobe – Custom Wardrobes & Home Furniture",
    description:
      "Architectural custom wardrobes, beds, sofas, and luxury home furniture in Bangladesh with 3D customization and nationwide Cash on Delivery.",
    canonicalPath: '/',
    ogType: 'website',
    ogImage: `${origin}/og-image.jpg`,
    robots: 'index, follow',
    jsonLd: storeJsonLd,
  };
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function applySeoToDocument(seo: SeoPayload, origin: string): void {
  if (typeof document === 'undefined') return;
  const canonicalUrl = `${origin.replace(/\/+$/, '')}${seo.canonicalPath}`;
  document.title = seo.title;

  upsertMeta('name', 'description', seo.description);
  upsertMeta('name', 'robots', seo.robots);
  upsertCanonical(canonicalUrl);

  upsertMeta('property', 'og:type', seo.ogType);
  upsertMeta('property', 'og:title', seo.title);
  upsertMeta('property', 'og:description', seo.description);
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('property', 'og:image', seo.ogImage);

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', seo.title);
  upsertMeta('name', 'twitter:description', seo.description);
  upsertMeta('name', 'twitter:image', seo.ogImage);

  let script = document.getElementById('iw-jsonld') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'iw-jsonld';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(seo.jsonLd);
}
