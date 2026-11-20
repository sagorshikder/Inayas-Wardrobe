import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_GALLERY,
  DEFAULT_PRODUCTS,
  DEFAULT_REVIEWS,
  DEFAULT_SITE_TEXT,
  type GalleryRecord,
  type ProductRecord,
  type ReviewRecord,
  type SiteTextConfig,
} from '../data/catalog';
import { TRANSLATIONS, type Lang, type Translations } from '../data/translations';
import {
  computeCartSummary,
  updateCartQuantity,
  upsertCartItem,
  type CartItem,
  type PaymentMethod,
} from '../utils/commerce';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'customer';
}

export interface PaymentModalState {
  open: boolean;
  name: string;
  number: string;
  color: string;
}

interface StoreContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  lang: Lang;
  toggleLang: () => void;
  t: Translations;
  route: string;
  navigate: (to: string) => void;
  products: ProductRecord[];
  productsLoading: boolean;
  reviews: ReviewRecord[];
  gallery: GalleryRecord[];
  siteText: SiteTextConfig;
  siteImages: Record<string, string>;
  cart: CartItem[];
  cartSummary: { count: number; total: number };
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (item: Omit<CartItem, 'qty'>, openDrawer?: boolean) => void;
  setCartItemQty: (id: string, qty: number) => void;
  clearCart: () => void;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  checkoutItems: CartItem[] | null;
  checkoutOpen: boolean;
  openCheckout: (directItems?: CartItem[] | null) => void;
  closeCheckout: () => void;
  paymentModal: PaymentModalState;
  openPaymentModal: (name: string, number: string, color: string) => void;
  closePaymentModal: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  user: AuthUser | null;
  authToken: string | null;
  authReady: boolean;
  isAdmin: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerCustomer: (name: string, email: string, password: string) => Promise<void>;
  setupAdminAccount: (
    email: string,
    password: string,
    name?: string,
    setupToken?: string,
  ) => Promise<void>;
  signOutUser: () => Promise<void>;
  submitCustomerOrder: (input: {
    name: string;
    phone: string;
    address: string;
    note?: string;
    paymentMethod: PaymentMethod;
    items: CartItem[];
  }) => Promise<string>;
  submitContactInquiry: (input: {
    name: string;
    phone: string;
    interest: string;
    message?: string;
  }) => Promise<string>;
  refreshCatalog: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);
const TOKEN_STORAGE_KEY = 'inaya-auth-token';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = readStorage<string | null>('inaya-theme', null);
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [lang, setLang] = useState<Lang>(() => {
    const saved = readStorage<string>('inaya-lang', 'en');
    return saved === 'bn' ? 'bn' : 'en';
  });

  const [route, setRoute] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/',
  );

  const [products, setProducts] = useState<ProductRecord[]>(DEFAULT_PRODUCTS);
  const [productsLoading, setProductsLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewRecord[]>(DEFAULT_REVIEWS);
  const [gallery, setGallery] = useState<GalleryRecord[]>(DEFAULT_GALLERY);
  const [siteText, setSiteText] = useState<SiteTextConfig>(DEFAULT_SITE_TEXT);
  const [siteImages, setSiteImages] = useState<Record<string, string>>({});

  const [cart, setCart] = useState<CartItem[]>(() => readStorage<CartItem[]>('cart', []));
  const [wishlist, setWishlist] = useState<string[]>(() => readStorage<string[]>('wish', []));
  const [cartOpen, setCartOpen] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<CartItem[] | null>(null);

  const [paymentModal, setPaymentModal] = useState<PaymentModalState>({
    open: false,
    name: 'bKash',
    number: DEFAULT_SITE_TEXT.pay_bkash_nagad,
    color: '#e2136e',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2400);
  }, []);

  // Sync light/dark theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('inaya-theme', theme);
    } catch {
      // ignore storage quota errors
    }
    window.dispatchEvent(new Event('inaya-themechange'));
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('inaya-lang', lang);
    } catch {
      // ignore
    }
  }, [lang]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to.startsWith('http://') || to.startsWith('https://') || to.startsWith('tel:') || to.startsWith('mailto:')) {
      window.location.href = to;
      return;
    }
    const [pathAndQuery, hash] = to.split('#');
    const nextUrl = pathAndQuery || '/';
    window.history.pushState({}, '', nextUrl + (hash ? `#${hash}` : ''));
    setRoute(nextUrl);
    if (hash) {
      window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Persist cart & wishlist locally
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('wish', JSON.stringify(wishlist));
    } catch {
      // ignore
    }
  }, [wishlist]);

  // Verify stored session token with Express API
  useEffect(() => {
    let active = true;
    async function restoreSession() {
      if (!authToken) {
        if (active) {
          setUser(null);
          setIsAdmin(false);
          setAuthReady(true);
        }
        return;
      }
      try {
        const res = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) {
          throw new Error('Expired session');
        }
        const data = (await res.json()) as {
          uid: string;
          email: string;
          displayName: string;
          role: 'admin' | 'customer';
          isAdmin: boolean;
        };
        if (active) {
          setUser({
            uid: data.uid,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
          });
          setIsAdmin(Boolean(data.isAdmin));
        }
      } catch {
        try {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch {
          // ignore
        }
        if (active) {
          setAuthToken(null);
          setUser(null);
          setIsAdmin(false);
        }
      } finally {
        if (active) setAuthReady(true);
      }
    }
    restoreSession();
    return () => {
      active = false;
    };
  }, [authToken]);

  const refreshCatalog = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await fetch('/api/storefront');
      if (!res.ok) throw new Error('Failed to load storefront');
      const data = (await res.json()) as {
        products?: ProductRecord[];
        reviews?: ReviewRecord[];
        gallery?: GalleryRecord[];
        siteText?: Partial<SiteTextConfig>;
        siteImages?: Record<string, string>;
      };

      if (Array.isArray(data.products) && data.products.length > 0) {
        setProducts(
          data.products.map((p) => ({
            ...p,
            image: p.thumb || p.image || DEFAULT_PRODUCTS[0].image,
            images: p.images && p.images.length ? p.images : [p.image || DEFAULT_PRODUCTS[0].image],
          })),
        );
      } else {
        setProducts(DEFAULT_PRODUCTS);
      }

      if (Array.isArray(data.reviews) && data.reviews.length > 0) {
        setReviews(data.reviews);
      } else {
        setReviews(DEFAULT_REVIEWS);
      }

      if (Array.isArray(data.gallery) && data.gallery.length > 0) {
        setGallery(data.gallery);
      } else {
        setGallery(DEFAULT_GALLERY);
      }

      const nextText = { ...DEFAULT_SITE_TEXT };
      if (data.siteText && typeof data.siteText === 'object') {
        Object.entries(data.siteText).forEach(([k, v]) => {
          if (typeof v === 'string' && v.trim() && k in nextText) {
            (nextText as Record<string, string>)[k] = v.trim();
          }
        });
      }
      setSiteText(nextText);
      setSiteImages(data.siteImages && typeof data.siteImages === 'object' ? data.siteImages : {});
    } catch {
      setProducts(DEFAULT_PRODUCTS);
      setReviews(DEFAULT_REVIEWS);
      setGallery(DEFAULT_GALLERY);
      setSiteText(DEFAULT_SITE_TEXT);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'en' ? 'bn' : 'en'));
  }, []);

  const addToCart = useCallback(
    (item: Omit<CartItem, 'qty'>, openDrawer = false) => {
      setCart((prev) => upsertCartItem(prev, item, 1));
      showToast(
        lang === 'bn' ? `${item.name} কার্টে যোগ হয়েছে` : `${item.name} added to cart`,
      );
      if (openDrawer) setCartOpen(true);
    },
    [lang, showToast],
  );

  const setCartItemQty = useCallback((id: string, qty: number) => {
    setCart((prev) => updateCartQuantity(prev, id, qty));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleWishlist = useCallback(
    (id: string) => {
      setWishlist((prev) => {
        const exists = prev.includes(id);
        const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
        showToast(exists ? 'Removed from wishlist' : 'Saved to wishlist');
        return next;
      });
    },
    [showToast],
  );

  const openCheckout = useCallback((directItems: CartItem[] | null = null) => {
    setCheckoutItems(directItems);
    setCheckoutOpen(true);
  }, []);

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false);
    setCheckoutItems(null);
  }, []);

  const openPaymentModal = useCallback((name: string, number: string, color: string) => {
    setPaymentModal({ open: true, name, number, color });
  }, []);

  const closePaymentModal = useCallback(() => {
    setPaymentModal((prev) => ({ ...prev, open: false }));
  }, []);

  const persistAuth = useCallback((token: string, nextUser: AuthUser, adminFlag: boolean) => {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // ignore
    }
    setAuthToken(token);
    setUser(nextUser);
    setIsAdmin(adminFlag);
    setAuthReady(true);
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        error?: string;
        token?: string;
        user?: AuthUser;
        isAdmin?: boolean;
      };
      if (!res.ok || !data.token || !data.user) {
        throw new Error(data.error || 'Sign-in failed.');
      }
      persistAuth(data.token, data.user, Boolean(data.isAdmin));
    },
    [persistAuth],
  );

  const registerCustomer = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await res.json()) as {
        error?: string;
        token?: string;
        user?: AuthUser;
        isAdmin?: boolean;
      };
      if (!res.ok || !data.token || !data.user) {
        throw new Error(data.error || 'Registration failed.');
      }
      persistAuth(data.token, data.user, Boolean(data.isAdmin));
    },
    [persistAuth],
  );

  const setupAdminAccount = useCallback(
    async (email: string, password: string, name?: string, setupToken?: string) => {
      const res = await fetch('/api/auth/setup-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, setupToken }),
      });
      const data = (await res.json()) as {
        error?: string;
        token?: string;
        user?: AuthUser;
        isAdmin?: boolean;
      };
      if (!res.ok || !data.token || !data.user) {
        throw new Error(data.error || 'Admin setup failed.');
      }
      persistAuth(data.token, data.user, Boolean(data.isAdmin));
    },
    [persistAuth],
  );

  const signOutUser = useCallback(async () => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
    setAuthToken(null);
    setUser(null);
    setIsAdmin(false);
  }, []);

  const submitCustomerOrder = useCallback(
    async (input: {
      name: string;
      phone: string;
      address: string;
      note?: string;
      paymentMethod: PaymentMethod;
      items: CartItem[];
    }): Promise<string> => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        throw new Error(data.error || 'Order submission failed.');
      }
      return data.id;
    },
    [authToken],
  );

  const submitContactInquiry = useCallback(
    async (input: { name: string; phone: string; interest: string; message?: string }) => {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        throw new Error(data.error || 'Could not submit inquiry.');
      }
      return data.id;
    },
    [],
  );

  const cartSummary = useMemo(() => computeCartSummary(cart), [cart]);
  const t = TRANSLATIONS[lang];

  const value: StoreContextValue = {
    theme,
    toggleTheme,
    lang,
    toggleLang,
    t,
    route,
    navigate,
    products,
    productsLoading,
    reviews,
    gallery,
    siteText,
    siteImages,
    cart,
    cartSummary,
    cartOpen,
    setCartOpen,
    addToCart,
    setCartItemQty,
    clearCart,
    wishlist,
    toggleWishlist,
    checkoutItems,
    checkoutOpen,
    openCheckout,
    closeCheckout,
    paymentModal,
    openPaymentModal,
    closePaymentModal,
    toastMessage,
    showToast,
    user,
    authToken,
    authReady,
    isAdmin,
    signInWithEmail,
    registerCustomer,
    setupAdminAccount,
    signOutUser,
    submitCustomerOrder,
    submitContactInquiry,
    refreshCatalog,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
