import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  ADMIN_EMAIL,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testConnection,
} from '../lib/firebase';
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
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
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
    number: '01714000350',
    color: '#e2136e',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
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

  // Initial Firestore connectivity probe & Auth listener
  useEffect(() => {
    testConnection();

    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const idToken = await nextUser.getIdToken();
          const res = await fetch('/api/auth/session', {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (res.ok) {
            const session = (await res.json()) as { isAdmin?: boolean };
            setIsAdmin(Boolean(session.isAdmin));
          } else {
            setIsAdmin(
              Boolean(nextUser.emailVerified) &&
                nextUser.email?.toLowerCase() === ADMIN_EMAIL,
            );
          }
          // Sync user profile record to Firestore cleanly
          await setDoc(
            doc(db, 'users', nextUser.uid),
            {
              uid: nextUser.uid,
              email: nextUser.email || '',
              displayName: nextUser.displayName || '',
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        } catch {
          setIsAdmin(
            Boolean(nextUser.emailVerified) &&
              nextUser.email?.toLowerCase() === ADMIN_EMAIL,
          );
        }
      } else {
        setIsAdmin(false);
      }
      setAuthReady(true);
    });

    return () => unsubAuth();
  }, []);

  const refreshCatalog = useCallback(async () => {
    setProductsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc')));
      if (!snap.empty) {
        const list: ProductRecord[] = snap.docs.map((d) => {
          const data = d.data();
          const imgs = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
          return {
            id: d.id,
            name: String(data.name || 'Product'),
            cat: String(data.cat || 'Furniture'),
            price: Number(data.price) || 0,
            old: Number(data.old) || 0,
            desc: String(data.desc || "Crafted furniture from Inaya's Wardrobe."),
            tag: data.tag ? String(data.tag) : undefined,
            rating: Number(data.rating) || 4.8,
            reviews: Number(data.reviews) || 0,
            image: String(data.thumb || data.image || imgs[0] || DEFAULT_PRODUCTS[0].image),
            thumb: data.thumb ? String(data.thumb) : undefined,
            images: imgs.length ? imgs : [String(data.image || DEFAULT_PRODUCTS[0].image)],
          };
        });
        setProducts(list);
      } else {
        setProducts(DEFAULT_PRODUCTS);
      }
    } catch (error) {
      console.warn('Using curated catalog defaults:', error);
      setProducts(DEFAULT_PRODUCTS);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCatalog();

    const unsubReviews = onSnapshot(
      query(collection(db, 'reviews'), orderBy('createdAt', 'desc')),
      (snap) => {
        if (snap.empty) {
          setReviews(DEFAULT_REVIEWS);
          return;
        }
        setReviews(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name || 'Verified Customer'),
              text: String(data.text || ''),
              stars: Math.max(1, Math.min(5, Number(data.stars) || 5)),
            };
          }),
        );
      },
      () => setReviews(DEFAULT_REVIEWS),
    );

    const unsubGallery = onSnapshot(
      query(collection(db, 'gallery'), orderBy('createdAt', 'desc')),
      (snap) => {
        if (snap.empty) {
          setGallery(DEFAULT_GALLERY);
          return;
        }
        const dynamicItems: GalleryRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            cat: String(data.cat || 'Wardrobe'),
            title: String(data.title || 'Completed Home Project'),
            image: String(data.image || ''),
          };
        });
        setGallery(dynamicItems);
      },
      () => setGallery(DEFAULT_GALLERY),
    );

    const unsubSettings = onSnapshot(
      collection(db, 'settings'),
      (snap) => {
        const nextText = { ...DEFAULT_SITE_TEXT };
        const nextImgs: Record<string, string> = {};
        snap.forEach((d) => {
          if (d.id === 'site') {
            const data = d.data();
            if (data.t && typeof data.t === 'object') {
              Object.entries(data.t as Record<string, string>).forEach(([k, v]) => {
                if (typeof v === 'string' && v.trim() && k in nextText) {
                  (nextText as Record<string, string>)[k] = v.trim();
                }
              });
            }
            if (typeof data.hero === 'string' && data.hero) {
              nextImgs.hero = data.hero;
            }
          } else if (d.id.startsWith('img-')) {
            const val = d.data().data;
            if (typeof val === 'string' && val) {
              nextImgs[d.id.slice(4)] = val;
            }
          }
        });
        setSiteText(nextText);
        setSiteImages(nextImgs);
      },
      () => {
        setSiteText(DEFAULT_SITE_TEXT);
      },
    );

    return () => {
      unsubReviews();
      unsubGallery();
      unsubSettings();
    };
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

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
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
      // Server-side validation & total normalization via Node.js Express API
      const valRes = await fetch('/api/orders/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const valData = (await valRes.json()) as {
        valid: boolean;
        error?: string;
        normalizedTotal: number;
      };
      if (!valRes.ok || !valData.valid) {
        throw new Error(valData.error || 'Order validation failed.');
      }

      const payload: Record<string, unknown> = {
        name: input.name.trim(),
        phone: input.phone.trim(),
        address: input.address.trim(),
        paymentMethod: input.paymentMethod,
        total: valData.normalizedTotal,
        status: 'New',
        items: input.items.map((i) => ({
          id: String(i.id),
          name: String(i.name),
          price: Number(i.price),
          qty: Number(i.qty),
        })),
        createdAt: serverTimestamp(),
      };
      if (input.note && input.note.trim()) {
        payload.note = input.note.trim();
      }
      if (auth.currentUser?.uid) {
        payload.uid = auth.currentUser.uid;
      }

      try {
        const ref = await addDoc(collection(db, 'orders'), payload);
        return ref.id;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'orders');
      }
    },
    [],
  );

  const submitContactInquiry = useCallback(
    async (input: { name: string; phone: string; interest: string; message?: string }) => {
      const payload: Record<string, unknown> = {
        name: input.name.trim(),
        phone: input.phone.trim(),
        interest: input.interest.trim(),
        status: 'New',
        createdAt: serverTimestamp(),
      };
      if (input.message && input.message.trim()) {
        payload.message = input.message.trim();
      }
      try {
        const ref = await addDoc(collection(db, 'inquiries'), payload);
        return ref.id;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'inquiries');
      }
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
    authReady,
    isAdmin,
    signInWithGoogle,
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
