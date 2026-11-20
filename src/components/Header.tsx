import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Heart, LogIn, LogOut, Menu, Moon, Search, ShieldCheck, ShoppingBag, Sun, User as UserIcon, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { STUDIO_MEDIA } from '../data/catalog';

export function Header() {
  const {
    theme,
    toggleTheme,
    lang,
    toggleLang,
    t,
    route,
    navigate,
    siteText,
    cartSummary,
    setCartOpen,
    wishlist,
    user,
    isAdmin,
    signOutUser,
    showToast,
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountOpen(false);
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const currentPath = route.split('?')[0] || '/';

  const navItems = [
    { label: t.nav.home, to: '/' },
    { label: t.nav.shop, to: '/shop' },
    { label: t.nav.studio3d, to: '/view3d' },
    { label: t.nav.gallery, to: '/gallery' },
    { label: t.nav.about, to: '/about' },
    { label: t.nav.contact, to: '/contact' },
  ];

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  return (
    <>
      {/* Top Contact & Social Bar */}
      <div className="bg-[#22140d] text-[#cdbfae] text-[11px] sm:text-xs border-b border-white/10">
        <div className="max-w-[1240px] mx-auto px-2.5 sm:px-4 md:px-6 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <a
              href={siteText.fb || 'https://www.facebook.com/share/1FZzyT7ius/'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white hover:bg-[#1877f2] hover:border-[#1877f2] transition-colors"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span className="hidden sm:inline font-semibold">Facebook</span>
            </a>
            {siteText.ig && (
              <a
                href={siteText.ig}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white hover:bg-[#dc2743] hover:border-transparent transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span className="hidden sm:inline font-semibold">Instagram</span>
              </a>
            )}
            <a
              href={siteText.tt || 'https://www.tiktok.com/@wardrobe204?_r=1&_t=ZS-9BYwP3OWRLp'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white hover:bg-black hover:border-[#25f4ee] transition-colors"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
              </svg>
              <span className="hidden sm:inline font-semibold">TikTok</span>
            </a>
          </div>

          <span className="hidden lg:inline text-[#cdbfae]">{siteText.tagline || t.tagline}</span>

          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 whitespace-nowrap tabular-price">
            <a
              href={`tel:${siteText.phone.replace(/[^\d+]/g, '')}`}
              className="hover:text-white transition-colors truncate"
            >
              {siteText.phone}
            </a>
            <span className="text-white/30" aria-hidden="true">·</span>
            <a
              href={`https://wa.me/${siteText.wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors shrink-0"
            >
              <span className="sm:hidden">WhatsApp</span>
              <span className="hidden sm:inline">{t.whatsappChat}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Sticky Header (Clean 3-Zone Contract) */}
      <header className="sticky top-0 z-30 bg-[#f7f2ea]/95 dark:bg-[#17110d]/95 border-b border-[#dccfbe] dark:border-[#3d2f25]">
        <div className="max-w-[1440px] mx-auto px-2.5 sm:px-4 md:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 lg:gap-6">
          {/* Zone 1: Brand Mark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="flex items-center gap-1.5 sm:gap-3 whitespace-nowrap min-w-0 shrink group"
          >
            <img
              src={STUDIO_MEDIA.logo}
              alt="Inaya's Wardrobe logo"
              className="h-7 sm:h-11 md:h-12 w-auto block rounded-md shrink-0"
              referrerPolicy="no-referrer"
            />
            <span className="font-display text-[11px] sm:text-lg md:text-xl tracking-[0.02em] sm:tracking-[0.06em] text-[#22140d] dark:text-[#f1e6d8] border-l border-[#dccfbe] dark:border-[#3d2f25] pl-1.5 sm:pl-3 truncate">
              INAYA&apos;S WARDROBE
            </span>
          </a>

          {/* Zone 2: Single-Line Navigation */}
          <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const active = currentPath === item.to;
              return (
                <a
                  key={item.to}
                  href={item.to}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.to);
                  }}
                  className={`px-3 py-2 text-sm whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    active
                      ? 'border-[#cf9a3e] text-[#86570f] dark:text-[#e5a362] font-semibold'
                      : 'border-transparent text-[#22140d]/85 dark:text-[#f1e6d8]/85 hover:border-[#dccfbe] dark:hover:border-[#3d2f25]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action & Utility Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleLang}
              aria-label="Toggle language"
              className="h-7 sm:h-10 px-1.5 sm:px-3.5 rounded-full border border-[#dccfbe] dark:border-[#3d2f25] text-[10px] sm:text-xs font-semibold text-[#22140d] dark:text-[#f1e6d8] hover:border-[#cf9a3e] hover:bg-white dark:hover:bg-[#241a14] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.langToggle}
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search catalog"
              className="w-7 h-7 sm:w-10 sm:h-10 rounded-full border border-[#dccfbe] dark:border-[#3d2f25] grid place-items-center text-[#22140d] dark:text-[#f1e6d8] hover:border-[#cf9a3e] hover:bg-white dark:hover:bg-[#241a14] transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-7 h-7 sm:w-10 sm:h-10 rounded-full border border-[#dccfbe] dark:border-[#3d2f25] grid place-items-center text-[#22140d] dark:text-[#f1e6d8] hover:border-[#cf9a3e] hover:bg-white dark:hover:bg-[#241a14] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/shop?wish=1')}
              aria-label="My Wishlist"
              className="hidden sm:grid relative w-10 h-10 rounded-full border border-[#dccfbe] dark:border-[#3d2f25] place-items-center text-[#22140d] dark:text-[#f1e6d8] hover:border-[#cf9a3e] hover:bg-white dark:hover:bg-[#241a14] transition-colors cursor-pointer"
            >
              <Heart className="w-4 h-4" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#cf9a3e] text-[#22140d] text-[11px] font-bold grid place-items-center tabular-price">
                  {wishlist.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label="Open Cart"
              className="relative w-7 h-7 sm:w-10 sm:h-10 rounded-full border border-[#dccfbe] dark:border-[#3d2f25] grid place-items-center text-[#22140d] dark:text-[#f1e6d8] hover:border-[#cf9a3e] hover:bg-white dark:hover:bg-[#241a14] transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {cartSummary.count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#cf9a3e] text-[#22140d] text-[11px] font-bold grid place-items-center tabular-price">
                  {cartSummary.count}
                </span>
              )}
            </button>

            {/* Account Menu */}
            <div className="relative hidden sm:block" ref={accountRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAccountOpen((v) => !v);
                }}
                aria-label="Account menu"
                aria-expanded={accountOpen}
                className="w-10 h-10 rounded-full border border-[#dccfbe] dark:border-[#3d2f25] grid place-items-center text-[#22140d] dark:text-[#f1e6d8] hover:border-[#cf9a3e] hover:bg-white dark:hover:bg-[#241a14] transition-colors cursor-pointer"
              >
                <UserIcon className="w-4 h-4" />
              </button>

              {accountOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] shadow-2xl p-4 z-50 text-[#22140d] dark:text-[#f1e6d8]">
                  <div className="pb-3 border-b border-[#dccfbe] dark:border-[#3d2f25]">
                    <p className="font-display text-base">
                      {user ? user.displayName || user.email : "Welcome to Inaya's"}
                    </p>
                    <p className="text-xs text-[#6a584b] dark:text-[#b8a898] truncate">
                      {user ? user.email : 'Save orders & manage admin portal'}
                    </p>
                  </div>

                  <div className="mt-3 grid gap-1.5 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        navigate('/shop?wish=1');
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#f7f2ea] dark:hover:bg-[#2d221a] text-left cursor-pointer"
                    >
                      <span>Saved Wishlist</span>
                      <span className="text-xs font-bold tabular-price">{wishlist.length}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        navigate('/admin');
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#f7f2ea] dark:hover:bg-[#2d221a] text-left cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#86570f] dark:text-[#e5a362]" />
                      <span>{isAdmin ? 'Admin Studio Dashboard' : 'Admin Login'}</span>
                    </button>

                    {user ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await signOutUser();
                          setAccountOpen(false);
                          showToast('Signed out');
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#f7f2ea] dark:hover:bg-[#2d221a] text-left text-red-700 dark:text-red-400 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAccountOpen(false);
                          navigate('/admin');
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold hover:brightness-105 cursor-pointer"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Sign in to Portal</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              className="lg:hidden w-7 h-7 sm:w-10 sm:h-10 rounded-full border border-[#dccfbe] dark:border-[#3d2f25] grid place-items-center text-[#22140d] dark:text-[#f1e6d8] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {searchOpen && (
          <div className="border-t border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea] dark:bg-[#17110d] px-4 md:px-6 py-3">
            <form onSubmit={handleSearch} className="max-w-[720px] mx-auto flex gap-2">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.searchPlaceholder}
                autoFocus
                aria-label="Search furniture"
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-white dark:bg-[#241a14] text-sm text-[#22140d] dark:text-[#f1e6d8] focus:outline-none focus:border-[#cf9a3e]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm hover:brightness-105 cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>
        )}

        {/* Mobile Drawer Nav */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="lg:hidden border-t border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea] dark:bg-[#17110d] px-4 py-3 grid gap-1"
          >
            {navItems.map((item) => {
              const active = currentPath === item.to;
              return (
                <a
                  key={item.to}
                  href={item.to}
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    navigate(item.to);
                  }}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium ${
                    active
                      ? 'bg-[#cf9a3e]/20 text-[#86570f] dark:text-[#e5a362] font-semibold'
                      : 'text-[#22140d] dark:text-[#f1e6d8]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            <div className="sm:hidden border-t border-[#dccfbe] dark:border-[#3d2f25] mt-2 pt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] text-xs font-semibold cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/shop?wish=1');
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] text-xs font-semibold cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Wishlist ({wishlist.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/admin');
                }}
                className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#cf9a3e]/20 text-[#86570f] dark:text-[#e5a362] text-xs font-semibold cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isAdmin ? 'Admin Studio Dashboard' : 'Admin Portal'}</span>
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Highlights Ticker */}
      <div
        className="ticker-wrap overflow-hidden bg-[#4b2f1c] text-[#f6efe2] text-sm"
        aria-label="Store highlights"
      >
        <div className="ticker-track">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
              {[
                'Premium Quality',
                'Custom Design',
                'On-Time Delivery',
                'Customer Support',
                'Cash on Delivery available',
                'Pay with bKash, Nagad, Rocket or bank',
              ].map((txt) => (
                <span
                  key={`${dup}-${txt}`}
                  className="px-7 py-2 whitespace-nowrap relative after:content-[''] after:absolute after:right-[-3px] after:top-1/2 after:-mt-[3px] after:w-1.5 after:h-1.5 after:rounded-full after:bg-[#cf9a3e]"
                >
                  {txt}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
