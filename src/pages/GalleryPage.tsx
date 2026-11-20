import { useEffect, useMemo, useState } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { GalleryRecord } from '../data/catalog';

export function GalleryPage() {
  const { gallery, navigate } = useStore();
  const [activeCat, setActiveCat] = useState('All');
  const [lightboxItem, setLightboxItem] = useState<GalleryRecord | null>(null);

  const categories = useMemo(() => {
    const dynamic = Array.from(new Set(gallery.map((g) => g.cat).filter(Boolean)));
    return ['All', ...dynamic];
  }, [gallery]);

  const filtered = useMemo(
    () => (activeCat === 'All' ? gallery : gallery.filter((g) => g.cat === activeCat)),
    [gallery, activeCat],
  );

  useEffect(() => {
    if (!lightboxItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxItem(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxItem]);

  return (
    <main className="min-h-[70vh]">
      <section className="bg-gradient-to-r from-[#22140d] to-[#4b2f1c] text-[#f6efe2] py-10 px-6">
        <div className="max-w-[1240px] mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl">Our Gallery</h1>
          <p className="text-[#cdbfae] text-sm mt-1">
            Completed home interiors and bespoke furniture crafted by our workshop.
          </p>
        </div>
      </section>

      <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-10">
        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter gallery by category">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeCat === cat}
                onClick={() => setActiveCat(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                  activeCat === cat
                    ? 'bg-[#cf9a3e] text-[#22140d] border-[#cf9a3e] font-semibold'
                    : 'bg-white dark:bg-[#241a14] border-[#dccfbe] dark:border-[#3d2f25] hover:border-[#cf9a3e]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <span className="text-sm text-[#6a584b] dark:text-[#b8a898] tabular-price">
            {filtered.length} installations
          </span>
        </div>

        {/* Gallery Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dccfbe] dark:border-[#3d2f25] p-12 text-center">
            <p className="text-base mb-4">No gallery photos in this category yet.</p>
            <button
              type="button"
              onClick={() => setActiveCat('All')}
              className="px-5 py-2.5 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm cursor-pointer"
            >
              Show All Projects
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLightboxItem(item)}
                className="group text-left rounded-2xl overflow-hidden bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] hover:border-[#cf9a3e] hover:-translate-y-0.5 transition-all shadow-xs cursor-pointer"
              >
                <div className="relative aspect-[4/3] bg-[#ece3d6] dark:bg-[#2d221a] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title || item.cat}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute right-3 bottom-3 w-9 h-9 rounded-full bg-[#22140d]/80 text-[#f6efe2] grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-4 h-4" />
                  </span>
                </div>
                <div className="p-4">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-[#86570f] dark:text-[#e5a362]">
                    {item.cat}
                  </span>
                  <h2 className="font-display text-lg mt-0.5 leading-snug">{item.title}</h2>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Custom Design Banner */}
        <section className="mt-14 rounded-2xl bg-gradient-to-br from-[#22140d] to-[#4b2f1c] text-[#f6efe2] p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[#cf9a3e]/40">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl">Want something built for your space?</h2>
            <p className="text-[#cdbfae] text-sm mt-1">
              Customize wardrobe width, finish, and interior shelving or schedule a home measurement.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/view3d')}
              className="px-5 py-3 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm hover:brightness-105 cursor-pointer"
            >
              Try 3D Wardrobe Studio
            </button>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="px-5 py-3 rounded-lg border border-white/35 text-[#f6efe2] font-semibold text-sm hover:border-[#cf9a3e] cursor-pointer"
            >
              Request Free Quote
            </button>
          </div>
        </section>
      </div>

      {/* Lightbox Modal */}
      {lightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxItem.title}
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 bg-black/80 p-4 sm:p-8 flex items-center justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full rounded-2xl overflow-hidden bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close photo preview"
              onClick={() => setLightboxItem(null)}
              className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-[#22140d]/85 text-white grid place-items-center hover:bg-[#cf9a3e] hover:text-[#22140d] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-[#18100c] max-h-[75vh] flex items-center justify-center overflow-hidden">
              <img
                src={lightboxItem.image}
                alt={lightboxItem.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[75vh] object-contain"
              />
            </div>
            <div className="p-4 sm:px-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-[#86570f] dark:text-[#e5a362]">
                  {lightboxItem.cat}
                </p>
                <p className="font-display text-lg">{lightboxItem.title}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const cat = lightboxItem.cat;
                  setLightboxItem(null);
                  navigate(`/shop?cat=${encodeURIComponent(cat)}`);
                }}
                className="px-4 py-2 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-xs sm:text-sm shrink-0 cursor-pointer"
              >
                Shop {lightboxItem.cat}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
