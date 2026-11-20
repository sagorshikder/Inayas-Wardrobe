import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { formatTaka } from '../utils/commerce';

export function ShopPage() {
  const { products, wishlist, route, navigate } = useStore();

  const params = useMemo(() => {
    const qIdx = route.indexOf('?');
    return new URLSearchParams(qIdx >= 0 ? route.slice(qIdx + 1) : '');
  }, [route]);

  const wishMode = params.get('wish') === '1';
  const initialCat = params.get('cat') || 'All';
  const initialSearch = params.get('q') || '';

  const [selectedCat, setSelectedCat] = useState(initialCat);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const maxCatalogPrice = useMemo(
    () => Math.max(60000, ...products.map((p) => p.price)),
    [products],
  );
  const [maxPrice, setMaxPrice] = useState(maxCatalogPrice);
  const [sortBy, setSortBy] = useState<'featured' | 'lo' | 'hi'>('featured');

  useEffect(() => {
    setSelectedCat(initialCat);
  }, [initialCat]);

  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setMaxPrice((prev) => (prev < maxCatalogPrice ? maxCatalogPrice : prev));
  }, [maxCatalogPrice]);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.map((p) => p.cat)))],
    [products],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (wishMode && !wishlist.includes(p.id)) return false;
      if (selectedCat !== 'All' && p.cat !== selectedCat) return false;
      if (p.price > maxPrice) return false;
      if (q && !`${p.name} ${p.cat} ${p.desc}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sortBy === 'lo') list.sort((a, b) => a.price - b.price);
    if (sortBy === 'hi') list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, wishlist, wishMode, selectedCat, maxPrice, searchQuery, sortBy]);

  return (
    <main className="min-h-[70vh]">
      <section className="bg-gradient-to-r from-[#22140d] to-[#4b2f1c] text-[#f6efe2] py-10 px-6">
        <div className="max-w-[1240px] mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl">
            {wishMode ? 'My Wishlist' : selectedCat === 'All' ? 'Shop Collection' : selectedCat}
          </h1>
          <p className="text-[#cdbfae] text-sm mt-1">
            {wishMode
              ? 'Your saved custom wardrobes and furniture picks.'
              : 'Handcrafted wardrobes, beds, sofas, and dining suites built to fit your home.'}
          </p>
        </div>
      </section>

      <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-10 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">
        <aside className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-5 space-y-6">
          <div>
            <label htmlFor="shopSearch" className="block text-xs font-bold uppercase tracking-wider text-[#6a584b] dark:text-[#b8a898] mb-2">
              Search
            </label>
            <input
              id="shopSearch"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by keyword..."
              className="w-full px-3.5 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/50 dark:bg-[#17110d] text-sm"
            />
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6a584b] dark:text-[#b8a898] mb-2.5">
              Category
            </h2>
            <div className="flex flex-wrap lg:flex-col gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className={`px-3.5 py-2 rounded-lg text-left text-sm font-medium transition-colors cursor-pointer ${
                    selectedCat === cat
                      ? 'bg-[#cf9a3e] text-[#22140d] font-semibold'
                      : 'hover:bg-[#f7f2ea] dark:hover:bg-[#2d221a]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#6a584b] dark:text-[#b8a898] mb-2">
              <span>Max Price</span>
              <span className="tabular-price text-[#86570f] dark:text-[#e5a362]">
                {formatTaka(maxPrice)}
              </span>
            </div>
            <input
              type="range"
              aria-label="Maximum price"
              min={5000}
              max={maxCatalogPrice}
              step={1000}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-[#cf9a3e]"
            />
          </div>

          {wishMode && (
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="w-full py-2.5 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] text-xs font-semibold hover:border-[#cf9a3e] cursor-pointer"
            >
              Browse Full Catalog
            </button>
          )}
        </aside>

        <section>
          <div className="flex items-center justify-between gap-4 mb-6 pb-3 border-b border-[#dccfbe] dark:border-[#3d2f25]">
            <span className="text-sm text-[#6a584b] dark:text-[#b8a898] tabular-price">
              {filtered.length} products
            </span>
            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'featured' | 'lo' | 'hi')}
              className="px-3.5 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-white dark:bg-[#241a14] text-sm"
            >
              <option value="featured">Sort: Featured</option>
              <option value="lo">Price: Low to High</option>
              <option value="hi">Price: High to Low</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dccfbe] dark:border-[#3d2f25] p-12 text-center">
              <p className="text-base font-medium mb-3">
                {wishMode
                  ? 'Your wishlist is empty. Tap the heart icon on any furniture piece to save it.'
                  : 'No products matched your current filter.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCat('All');
                  setSearchQuery('');
                  setMaxPrice(maxCatalogPrice);
                  if (wishMode) navigate('/shop');
                }}
                className="px-5 py-2.5 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
