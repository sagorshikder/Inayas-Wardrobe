import { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { STORE_CATEGORIES, STUDIO_MEDIA } from '../data/catalog';
import { ProductCard } from '../components/ProductCard';

export function HomePage() {
  const { navigate, products, reviews, siteText, siteImages, t } = useStore();
  const [reviewIdx, setReviewIdx] = useState(0);

  useEffect(() => {
    if (reviews.length <= 1) return;
    const id = window.setInterval(() => {
      setReviewIdx((i) => (i + 1) % reviews.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [reviews.length]);

  const currentReview = reviews[reviewIdx % Math.max(1, reviews.length)];
  const heroPhoto = siteImages.hero || STUDIO_MEDIA.heroCover;
  const featuredProducts = products.slice(0, 8);

  return (
    <main>
      {/* Architectural Hero */}
      <section className="pt-5 pb-2 px-4">
        <div className="max-w-[1208px] mx-auto grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr] gap-8 items-center rounded-2xl bg-gradient-to-br from-[#22140d] to-[#4b2f1c] text-[#f6efe2] p-6 sm:p-9 lg:p-10 overflow-hidden shadow-xl">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[#cf9a3e]">
              {siteText.hero_eyebrow}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[3rem] leading-[1.08] mt-2.5 mb-4 max-w-[540px] text-balance text-[#f6efe2]">
              {siteText.hero_title}
            </h1>
            <p className="text-[#cdbfae] text-base max-w-[46ch] mb-6 leading-relaxed">
              {siteText.hero_text}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  document.getElementById('best-selling')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm hover:brightness-105 transition-all cursor-pointer"
              >
                {siteText.hero_btn1}
              </button>
              <a
                href={`https://wa.me/${siteText.wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-lg border border-white/40 text-[#f6efe2] font-semibold text-sm hover:border-[#cf9a3e] transition-colors"
              >
                {siteText.hero_btn2}
              </a>
            </div>
          </div>

          <div className="relative">
            <img
              src={heroPhoto}
              alt="Inaya's Wardrobe bespoke wooden furniture showcase"
              width={1240}
              height={930}
              fetchPriority="high"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full aspect-[4/3] object-cover rounded-[26px_8px_26px_8px] border-[1.5px] border-[#cf9a3e]/55 outline outline-1 outline-[#cf9a3e]/25 outline-offset-[5px] shadow-2xl transition-transform duration-500 hover:-translate-y-0.5"
            />
          </div>
        </div>
      </section>

      {/* Main Content + Sticky Sidebar */}
      <div className="max-w-[1240px] mx-auto px-4 md:px-6 pt-11 pb-16 grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-10 items-start">
        <div className="min-w-0">
          {/* Shop by Category (12 studio cards) */}
          <section aria-labelledby="cat-heading" className="mb-14">
            <div className="flex items-baseline justify-between gap-4 mb-5">
              <div>
                <h2 id="cat-heading" className="font-display text-2xl sm:text-[1.65rem]">
                  {t.shopByCategoryTitle}
                </h2>
                <p className="text-sm text-[#6a584b] dark:text-[#b8a898] mt-0.5">
                  {t.shopByCategorySub}
                </p>
              </div>
              <a
                href="/shop"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/shop');
                }}
                className="text-sm font-semibold text-[#86570f] dark:text-[#e5a362] underline underline-offset-4 whitespace-nowrap"
              >
                {t.viewAll}
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
              {STORE_CATEGORIES.map((cat) => {
                const imgSrc = siteImages[cat.key] || cat.image;
                return (
                  <a
                    key={cat.key}
                    href={`/shop?cat=${encodeURIComponent(cat.queryCat)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/shop?cat=${encodeURIComponent(cat.queryCat)}`);
                    }}
                    className="group rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-3 text-center shadow-xs hover:-translate-y-1 hover:border-[#cf9a3e] hover:shadow-md transition-all"
                  >
                    <span className="block w-[72px] h-[72px] mx-auto mb-2.5 rounded-xl overflow-hidden bg-[#ece3d6] dark:bg-[#2d221a] border border-[#cf9a3e]/40 shadow-sm">
                      <img
                        src={imgSrc}
                        alt={cat.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </span>
                    <span className="text-xs sm:text-[13px] font-semibold leading-tight block">
                      {cat.name}
                    </span>
                  </a>
                );
              })}
            </div>
          </section>

          {/* Best Selling Products */}
          <section id="best-selling" aria-labelledby="best-heading" className="mb-14">
            <div className="flex items-baseline justify-between gap-4 mb-5">
              <div>
                <h2 id="best-heading" className="font-display text-2xl sm:text-[1.65rem]">
                  {t.bestSellingTitle}
                </h2>
                <p className="text-sm text-[#6a584b] dark:text-[#b8a898] mt-0.5">
                  {t.bestSellingSub}
                </p>
              </div>
              <a
                href="/shop"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/shop');
                }}
                className="text-sm font-semibold text-[#86570f] dark:text-[#e5a362] underline underline-offset-4 whitespace-nowrap"
              >
                {t.viewAll}
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>

          {/* Bottom Split: Gallery Watermark Card + Customer Reviews */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative overflow-hidden rounded-2xl p-8 text-[#f6efe2] border border-[#cf9a3e]/40 shadow-xl bg-[#1d110b] flex flex-col justify-between min-h-[220px]">
              <img
                src={STUDIO_MEDIA.galleryWatermark}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-[#1c100a]/90 via-[#2a180e]/65 to-[#cf9a3e]/15"
              />
              <div className="relative z-10">
                <h3 className="font-display text-2xl mb-1.5">{siteText.g_title}</h3>
                <p className="text-sm text-[#e2d5c4] max-w-[34ch]">{siteText.g_text}</p>
              </div>
              <div className="relative z-10 mt-6">
                <button
                  type="button"
                  onClick={() => navigate('/gallery')}
                  className="px-5 py-2.5 rounded-lg border border-[#cf9a3e]/70 bg-[#cf9a3e]/15 text-[#f6efe2] text-sm font-semibold hover:bg-[#cf9a3e] hover:text-[#22140d] transition-colors cursor-pointer"
                >
                  {t.viewGallery}
                </button>
              </div>
            </div>

            {currentReview && (
              <div className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-7 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-xl mb-1">{t.reviewsHeading}</h3>
                  <div className="text-[#d9a441] tracking-widest text-sm my-1.5" aria-label={`${currentReview.stars} out of 5 stars`}>
                    {'★'.repeat(currentReview.stars)}
                  </div>
                  <p className="font-semibold text-sm mb-2">{currentReview.name}</p>
                  <p className="text-sm text-[#6a584b] dark:text-[#b8a898] leading-relaxed">
                    &ldquo;{currentReview.text}&rdquo;
                  </p>
                </div>
                {reviews.length > 1 && (
                  <div className="flex gap-1.5 mt-4">
                    {reviews.slice(0, 6).map((r, i) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setReviewIdx(i)}
                        aria-label={`View review by ${r.name}`}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === reviewIdx % reviews.length
                            ? 'w-5 bg-[#cf9a3e]'
                            : 'w-2 bg-[#dccfbe] dark:bg-[#3d2f25]'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Sticky Architectural Sidebar */}
        <aside className="lg:sticky lg:top-24 space-y-4">
          {/* 3D View Feature Card */}
          <div className="relative overflow-hidden rounded-2xl p-6 border border-[#cf9a3e]/45 bg-[#f3ebdf] dark:bg-[#241a14] shadow-md">
            <img
              src={STUDIO_MEDIA.feature3dBg}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-[#f7f0e6]/95 via-[#f2e8d9]/80 to-[#ece3d6]/45 dark:from-[#1d140e]/95 dark:via-[#241912]/80 dark:to-[#1d140e]/50"
            />
            <div className="relative z-10">
              <span className="inline-block px-2.5 py-0.5 rounded bg-[#cf9a3e] text-[#22140d] text-xs font-bold">
                {t.newFeature}
              </span>
              <h3 className="font-display text-xl mt-2.5 mb-2">{siteText.f_title}</h3>
              <p className="text-sm text-[#4b3a2e] dark:text-[#d6c6b6] mb-4">{siteText.f_text}</p>
              <button
                type="button"
                onClick={() => navigate('/view3d')}
                className="px-5 py-2.5 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm hover:brightness-105 transition-all cursor-pointer"
              >
                {t.try3dView}
              </button>
            </div>
          </div>

          {/* Need a Custom Design Card */}
          <div className="relative overflow-hidden rounded-2xl p-6 border border-[#cf9a3e]/45 bg-[#fbf6ee] dark:bg-[#241a14] shadow-md">
            <img
              src={STUDIO_MEDIA.customDesignBg}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-45"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-[#fbf6ee]/95 via-[#f7efe3]/85 to-transparent dark:from-[#1c130e]/95 dark:via-[#221811]/85 dark:to-[#1c130e]/45"
            />
            <div className="relative z-10">
              <h3 className="font-display text-xl mb-1.5">{siteText.c_title}</h3>
              <p className="text-sm text-[#4b3a2e] dark:text-[#d6c6b6] mb-4 max-w-[24ch]">
                {siteText.c_text}
              </p>
              <a
                href={`https://wa.me/${siteText.wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm hover:brightness-105 transition-all"
              >
                {t.requestQuote}
              </a>
            </div>
          </div>

          {/* 2x2 Trust Badges (With static locked customer support portrait) */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl border border-[#cf9a3e]/40 bg-gradient-to-br from-[#fcf8f2] to-[#f1e6d6] dark:from-[#281d15] dark:to-[#1b130e] shadow-sm text-center text-xs font-semibold">
            <div className="rounded-xl bg-white/75 dark:bg-[#2d221a]/80 border border-[#cf9a3e]/25 p-3">
              <span className="block w-14 h-14 mx-auto mb-2 rounded-xl overflow-hidden border border-[#cf9a3e]/45">
                <img
                  src={STUDIO_MEDIA.trustQuality}
                  alt="Premium Quality"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </span>
              {t.trust.quality}
            </div>

            <div className="rounded-xl bg-white/75 dark:bg-[#2d221a]/80 border border-[#cf9a3e]/25 p-3">
              <span className="block w-14 h-14 mx-auto mb-2 rounded-xl overflow-hidden border border-[#cf9a3e]/45">
                <img
                  src={STUDIO_MEDIA.trustPrice}
                  alt="Affordable Price"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </span>
              {t.trust.price}
            </div>

            <div className="rounded-xl bg-white/75 dark:bg-[#2d221a]/80 border border-[#cf9a3e]/25 p-3">
              <span className="block w-14 h-14 mx-auto mb-2 rounded-xl overflow-hidden border border-[#cf9a3e]/45">
                <img
                  src={STUDIO_MEDIA.trustDelivery}
                  alt="On-Time Delivery"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </span>
              {t.trust.delivery}
            </div>

            <div className="rounded-xl bg-white/75 dark:bg-[#2d221a]/80 border border-[#cf9a3e]/25 p-3">
              <span className="block w-14 h-14 mx-auto mb-2 rounded-xl overflow-hidden border border-[#cf9a3e]/45">
                <img
                  src={STUDIO_MEDIA.trustSupportPortrait}
                  alt="Customer Support specialist with headset"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-[50%_22%] scale-[1.2] select-none pointer-events-none"
                />
              </span>
              {t.trust.support}
            </div>
          </div>

          {/* Follow Us Card */}
          <div className="relative overflow-hidden rounded-2xl p-6 text-[#f6efe2] border border-[#cf9a3e]/40 bg-[#1b110b] shadow-lg">
            <img
              src={STUDIO_MEDIA.followUsBg}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-[#180e09]/92 via-[#22140d]/75 to-[#cf9a3e]/15"
            />
            <div className="relative z-10">
              <h3 className="font-display text-xl mb-1.5">{t.followUs}</h3>
              <p className="text-sm text-[#e2d5c4]">{t.followDesc}</p>
              <div className="flex gap-3 mt-4">
                <a
                  href={siteText.fb || 'https://www.facebook.com/share/1FZzyT7ius/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow us on Facebook"
                  className="w-11 h-11 rounded-full grid place-items-center bg-white/10 border border-[#cf9a3e]/35 hover:bg-[#1877f2] hover:border-[#1877f2] transition-colors"
                >
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                {siteText.ig && (
                  <a
                    href={siteText.ig}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Follow us on Instagram"
                    className="w-11 h-11 rounded-full grid place-items-center bg-white/10 border border-[#cf9a3e]/35 hover:bg-[#dc2743] hover:border-transparent transition-colors"
                  >
                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}
                <a
                  href={siteText.tt || 'https://www.tiktok.com/@wardrobe204?_r=1&_t=ZS-9BYwP3OWRLp'}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow us on TikTok"
                  className="w-11 h-11 rounded-full grid place-items-center bg-white/10 border border-[#cf9a3e]/35 hover:bg-black hover:border-[#25f4ee] transition-colors"
                >
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
