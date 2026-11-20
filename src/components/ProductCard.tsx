import { Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { ProductRecord } from '../data/catalog';
import { formatTaka } from '../utils/commerce';

export function ProductCard({ product }: { product: ProductRecord }) {
  const { navigate, addToCart, openCheckout, wishlist, toggleWishlist, t } = useStore();
  const wished = wishlist.includes(product.id);

  return (
    <article className="group flex flex-col min-w-0 rounded-xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="relative aspect-[4/5] bg-[#ece3d6] dark:bg-[#2d221a] overflow-hidden">
        {product.tag && (
          <span className="absolute left-3 top-3 z-10 px-2.5 py-0.5 rounded bg-[#cf9a3e] text-[#22140d] text-[11px] font-bold">
            {product.tag}
          </span>
        )}
        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={`absolute right-3 top-3 z-10 w-8 h-8 rounded-full grid place-items-center transition-colors cursor-pointer ${
            wished
              ? 'bg-[#b87333] text-white'
              : 'bg-white/90 dark:bg-[#241a14]/90 text-[#22140d] dark:text-[#f1e6d8] hover:bg-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${wished ? 'fill-current' : ''}`} />
        </button>

        <a
          href={`/product?id=${encodeURIComponent(product.id)}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/product?id=${encodeURIComponent(product.id)}`);
          }}
          className="block w-full h-full"
        >
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </a>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <span className="text-[11px] uppercase tracking-wider text-[#6a584b] dark:text-[#b8a898] font-medium">
          {product.cat}
        </span>

        <h3 className="text-base font-bold text-[#22140d] dark:text-[#f1e6d8] mt-1 mb-2 leading-snug flex-1">
          <a
            href={`/product?id=${encodeURIComponent(product.id)}`}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/product?id=${encodeURIComponent(product.id)}`);
            }}
            className="hover:text-[#86570f] dark:hover:text-[#e5a362] transition-colors"
          >
            {product.name}
          </a>
        </h3>

        <div className="flex items-baseline gap-2 mb-1.5 tabular-price">
          <span className="text-lg font-bold text-[#86570f] dark:text-[#e5a362]">
            {formatTaka(product.price)}
          </span>
          {Number(product.old) > product.price && (
            <span className="text-xs text-[#6a584b] dark:text-[#b8a898] line-through">
              {formatTaka(Number(product.old))}
            </span>
          )}
        </div>

        <div className="text-xs text-[#d9a441] mb-3 tabular-price">
          ★ {product.rating.toFixed(1)}{' '}
          <span className="text-[#6a584b] dark:text-[#b8a898]">({product.reviews})</span>
        </div>

        <div className="grid gap-2 mt-auto">
          <button
            type="button"
            onClick={() =>
              addToCart({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
              })
            }
            className="w-full py-2.5 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] text-xs font-semibold hover:bg-[#ece3d6] dark:hover:bg-[#2d221a] transition-colors cursor-pointer"
          >
            {t.addToCart}
          </button>
          <button
            type="button"
            onClick={() =>
              openCheckout([
                {
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  qty: 1,
                  image: product.image,
                },
              ])
            }
            className="w-full py-2.5 rounded-lg bg-[#b87333] text-white text-xs font-semibold hover:bg-[#8a5222] transition-colors cursor-pointer"
          >
            {t.orderNow}
          </button>
        </div>
      </div>
    </article>
  );
}
