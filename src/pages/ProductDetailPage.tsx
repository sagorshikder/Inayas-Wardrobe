import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { formatTaka, WA_NUMBER } from '../utils/commerce';

const FINISH_COLORS = ['Walnut Brown', 'Natural Oak', 'Matte White', 'Charcoal Grey'];

export function ProductDetailPage() {
  const { products, route, navigate, addToCart, openCheckout, wishlist, toggleWishlist, t } =
    useStore();

  const productId = useMemo(() => {
    const qIdx = route.indexOf('?');
    return new URLSearchParams(qIdx >= 0 ? route.slice(qIdx + 1) : '').get('id') || '1';
  }, [route]);

  const product = useMemo(
    () => products.find((p) => p.id === productId) || products[0],
    [products, productId],
  );

  const gallery = useMemo(() => {
    if (!product) return [];
    const list = product.images?.filter(Boolean) || [];
    return list.length > 0 ? list : [product.image];
  }, [product]);

  const [photoIdx, setPhotoIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState(FINISH_COLORS[0]);

  useEffect(() => {
    setPhotoIdx(0);
  }, [product?.id]);

  if (!product) {
    return (
      <main className="max-w-[1240px] mx-auto px-6 py-16 text-center">
        <p className="mb-4">Product not found.</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-5 py-2.5 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm cursor-pointer"
        >
          Back to Shop
        </button>
      </main>
    );
  }

  const wished = wishlist.includes(product.id);
  const waMessage = `Hello, I am interested in ${product.name} (${selectedColor}), price ${formatTaka(
    product.price,
  )}.`;
  const variantId = `${product.id}-${selectedColor.replace(/\s+/g, '')}`;
  const variantName = `${product.name} (${selectedColor})`;

  const related = products
    .filter((x) => x.cat === product.cat && x.id !== product.id)
    .concat(products.filter((x) => x.cat !== product.cat && x.id !== product.id))
    .slice(0, 4);

  return (
    <main className="max-w-[1240px] mx-auto px-4 md:px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Gallery Column */}
        <div>
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#ece3d6] dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25]">
            <img
              src={gallery[photoIdx] || product.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => setPhotoIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-[#241a14]/90 text-[#22140d] dark:text-[#f1e6d8] grid place-items-center shadow-md cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => setPhotoIdx((i) => (i + 1) % gallery.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-[#241a14]/90 text-[#22140d] dark:text-[#f1e6d8] grid place-items-center shadow-md cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="absolute right-3 bottom-3 px-2.5 py-0.5 rounded-full bg-black/65 text-white text-xs tabular-price">
                  {photoIdx + 1} / {gallery.length}
                </span>
              </>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="flex gap-2.5 mt-3">
              {gallery.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setPhotoIdx(i)}
                  className={`w-18 h-18 rounded-xl overflow-hidden border-2 cursor-pointer ${
                    i === photoIdx
                      ? 'border-[#cf9a3e] opacity-100'
                      : 'border-[#dccfbe] dark:border-[#3d2f25] opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Module */}
        <div className="space-y-5">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6a584b] dark:text-[#b8a898]">
              {product.cat}
            </span>
            <h1 className="font-display text-3xl sm:text-4xl mt-1">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-3 tabular-price">
            <span className="text-3xl font-bold text-[#86570f] dark:text-[#e5a362]">
              {formatTaka(product.price)}
            </span>
            {Number(product.old) > product.price && (
              <span className="text-base text-[#6a584b] dark:text-[#b8a898] line-through">
                {formatTaka(Number(product.old))}
              </span>
            )}
          </div>

          <p className="text-sm sm:text-base text-[#4a3a2e] dark:text-[#d6c6b6] leading-relaxed">
            {product.desc}
          </p>

          <div>
            <label htmlFor="finishSelect" className="block text-sm font-semibold mb-1.5">
              Finish / Color
            </label>
            <select
              id="finishSelect"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-full max-w-xs px-3.5 py-2.5 rounded-xl border border-[#dccfbe] dark:border-[#3d2f25] bg-white dark:bg-[#241a14] text-sm"
            >
              {FINISH_COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() =>
                addToCart({
                  id: variantId,
                  name: variantName,
                  price: product.price,
                  image: product.image,
                })
              }
              className="px-6 py-3 rounded-xl border border-[#dccfbe] dark:border-[#3d2f25] bg-white dark:bg-[#241a14] font-semibold text-sm hover:border-[#cf9a3e] cursor-pointer"
            >
              {t.addToCart}
            </button>

            <button
              type="button"
              onClick={() =>
                openCheckout([
                  {
                    id: variantId,
                    name: variantName,
                    price: product.price,
                    qty: 1,
                    image: product.image,
                  },
                ])
              }
              className="px-6 py-3 rounded-xl bg-[#b87333] text-white font-semibold text-sm hover:bg-[#8a5222] cursor-pointer"
            >
              {t.orderNow}
            </button>

            <a
              href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl border border-[#17803d] text-[#17803d] dark:text-emerald-400 font-semibold text-sm hover:bg-[#17803d]/10"
            >
              Ask on WhatsApp
            </a>

            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label="Toggle wishlist"
              className={`w-11 h-11 rounded-xl border grid place-items-center cursor-pointer ${
                wished
                  ? 'bg-[#b87333] border-[#b87333] text-white'
                  : 'border-[#dccfbe] dark:border-[#3d2f25]'
              }`}
            >
              <Heart className={`w-5 h-5 ${wished ? 'fill-current' : ''}`} />
            </button>
          </div>

          <p className="text-xs text-[#6a584b] dark:text-[#b8a898] pt-2">
            Complimentary room measurement visit for custom sizing. Delivery and professional assembly across Bangladesh.
          </p>
        </div>
      </div>

      {/* Related Products */}
      <section className="mt-16 pt-10 border-t border-[#dccfbe] dark:border-[#3d2f25]">
        <h2 className="font-display text-2xl mb-6">You may also like</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {related.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
