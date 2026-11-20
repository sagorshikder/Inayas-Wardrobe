import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Database,
  Image as ImageIcon,
  LogIn,
  LogOut,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Star,
  Trash2,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  DEFAULT_PRODUCTS,
  DEFAULT_SITE_TEXT,
  STORE_CATEGORIES,
  type ProductRecord,
  type SiteTextConfig,
} from '../data/catalog';
import { formatTaka } from '../utils/commerce';

type AdminTab = 'products' | 'orders' | 'inquiries' | 'gallery' | 'reviews' | 'settings';

interface OrderDoc {
  id: string;
  name: string;
  phone: string;
  address: string;
  note?: string;
  paymentMethod: string;
  total: number;
  status: 'New' | 'Confirmed' | 'Delivered' | 'Cancelled';
  items: { id: string; name: string; price: number; qty: number }[];
  createdAt?: string;
}

interface InquiryDoc {
  id: string;
  name: string;
  phone: string;
  interest: string;
  message?: string;
  status: 'New' | 'Contacted' | 'Closed';
  createdAt?: string;
}

function compressImageFile(file: File, maxDim = 960, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Could not decode image'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function AdminPage() {
  const {
    user,
    authToken,
    authReady,
    isAdmin,
    signInWithEmail,
    setupAdminAccount,
    signOutUser,
    gallery,
    reviews,
    siteText,
    siteImages,
    refreshCatalog,
    showToast,
  } = useStore();

  const [tab, setTab] = useState<AdminTab>('products');
  const [dbProducts, setDbProducts] = useState<ProductRecord[]>([]);
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [inquiries, setInquiries] = useState<InquiryDoc[]>([]);

  // Auth form state
  const [hasAdmin, setHasAdmin] = useState(true);
  const [adminEmailHint, setAdminEmailHint] = useState('sagorshikder707@gmail.com');
  const [loginEmail, setLoginEmail] = useState('sagorshikder707@gmail.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginConfirm, setLoginConfirm] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Product editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pName, setPName] = useState('');
  const [pCat, setPCat] = useState('Wardrobe');
  const [pPrice, setPPrice] = useState('');
  const [pOld, setPOld] = useState('');
  const [pTag, setPTag] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pImage, setPImage] = useState('');
  const [pThumb, setPThumb] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);

  // Gallery upload state
  const [gCat, setGCat] = useState('Wardrobe');
  const [gTitle, setGTitle] = useState('');
  const [gImage, setGImage] = useState('');
  const [savingGallery, setSavingGallery] = useState(false);

  // Review state
  const [rName, setRName] = useState('');
  const [rStars, setRStars] = useState(5);
  const [rText, setRText] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Settings form state
  const [sText, setSText] = useState<SiteTextConfig>(siteText);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setSText(siteText);
  }, [siteText]);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { hasAdmin?: boolean; adminEmail?: string } | null) => {
        if (data) {
          setHasAdmin(Boolean(data.hasAdmin));
          if (data.adminEmail) {
            setAdminEmailHint(data.adminEmail);
            setLoginEmail(data.adminEmail);
          }
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const loadAdminOverview = useCallback(async () => {
    if (!isAdmin || !authToken) return;
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        products?: ProductRecord[];
        orders?: OrderDoc[];
        inquiries?: InquiryDoc[];
      };
      setDbProducts(Array.isArray(data.products) ? data.products : []);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setInquiries(Array.isArray(data.inquiries) ? data.inquiries : []);
    } catch {
      showToast('Could not refresh admin data');
    }
  }, [isAdmin, authToken, showToast]);

  useEffect(() => {
    if (!isAdmin || !authToken) {
      setDbProducts([]);
      setOrders([]);
      setInquiries([]);
      return;
    }
    loadAdminOverview();
  }, [isAdmin, authToken, loadAdminOverview]);

  const adminFetch = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {}),
      },
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(body.error || 'Request failed');
    }
    return body;
  };

  const resetProductForm = () => {
    setEditingId(null);
    setPName('');
    setPCat('Wardrobe');
    setPPrice('');
    setPOld('');
    setPTag('');
    setPDesc('');
    setPImage('');
    setPThumb('');
  };

  const handleProductImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const full = await compressImageFile(file, 960, 0.8);
      const thumb = await compressImageFile(file, 420, 0.72);
      setPImage(full);
      setPThumb(thumb);
      showToast('Photo prepared');
    } catch {
      showToast('Could not process image');
    }
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = pName.trim();
    const numericPrice = Math.max(0, Number(pPrice) || 0);
    if (!trimmedName || numericPrice <= 0) {
      showToast('Enter product name and price');
      return;
    }

    setSavingProduct(true);
    try {
      const payload = {
        name: trimmedName,
        cat: pCat.trim() || 'Wardrobe',
        price: numericPrice,
        old: pOld && Number(pOld) > 0 ? Number(pOld) : 0,
        desc: pDesc.trim(),
        tag: pTag.trim() || undefined,
        image: pImage || undefined,
        images: pImage ? [pImage] : undefined,
        thumb: pThumb || undefined,
      };

      if (editingId) {
        await adminFetch(`/api/admin/products/${encodeURIComponent(editingId)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast('Product updated');
      } else {
        await adminFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Product added to catalog');
      }
      resetProductForm();
      await Promise.all([loadAdminOverview(), refreshCatalog()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      await adminFetch('/api/admin/products/seed', {
        method: 'POST',
        body: JSON.stringify({ items: DEFAULT_PRODUCTS }),
      });
      await Promise.all([loadAdminOverview(), refreshCatalog()]);
      showToast('Curated catalog imported to MySQL');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await adminFetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await Promise.all([loadAdminOverview(), refreshCatalog()]);
      showToast('Product deleted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: OrderDoc['status']) => {
    try {
      await adminFetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadAdminOverview();
      showToast(`Order marked ${status}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await adminFetch(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await loadAdminOverview();
      showToast('Order removed');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleUpdateInquiryStatus = async (id: string, status: InquiryDoc['status']) => {
    try {
      await adminFetch(`/api/admin/inquiries/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadAdminOverview();
      showToast(`Inquiry marked ${status}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    try {
      await adminFetch(`/api/admin/inquiries/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await loadAdminOverview();
      showToast('Inquiry deleted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1024, 0.8);
      setGImage(compressed);
      showToast('Gallery photo ready');
    } catch {
      showToast('Could not decode photo');
    }
  };

  const handleSaveGalleryItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!gImage) {
      showToast('Choose a photo first');
      return;
    }
    setSavingGallery(true);
    try {
      await adminFetch('/api/admin/gallery', {
        method: 'POST',
        body: JSON.stringify({
          cat: gCat,
          title: gTitle.trim() || `${gCat} Project`,
          image: gImage,
        }),
      });
      setGTitle('');
      setGImage('');
      await refreshCatalog();
      showToast('Added to gallery');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gallery upload failed');
    } finally {
      setSavingGallery(false);
    }
  };

  const handleDeleteGalleryItem = async (id: string) => {
    try {
      await adminFetch(`/api/admin/gallery/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await refreshCatalog();
      showToast('Gallery photo deleted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleSaveReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!rName.trim() || !rText.trim()) {
      showToast('Enter customer name and review');
      return;
    }
    setSavingReview(true);
    try {
      await adminFetch('/api/admin/reviews', {
        method: 'POST',
        body: JSON.stringify({
          name: rName.trim(),
          text: rText.trim(),
          stars: rStars,
        }),
      });
      setRName('');
      setRText('');
      setRStars(5);
      await refreshCatalog();
      showToast('Review published');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not publish review');
    } finally {
      setSavingReview(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      await adminFetch(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await refreshCatalog();
      showToast('Review deleted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await adminFetch('/api/admin/settings/text', {
        method: 'PUT',
        body: JSON.stringify({ siteText: sText }),
      });
      await refreshCatalog();
      showToast('Storefront content updated');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSlotImageUpload = async (slotKey: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, slotKey === 'hero' ? 1280 : 600, 0.8);
      await adminFetch(`/api/admin/settings/image/${encodeURIComponent(slotKey)}`, {
        method: 'PUT',
        body: JSON.stringify({ data: compressed }),
      });
      await refreshCatalog();
      showToast('Site image updated');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update image');
    }
  };

  const handleAdminAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      showToast('Enter your email and password');
      return;
    }
    if (!hasAdmin && loginPassword !== loginConfirm) {
      showToast('Passwords do not match');
      return;
    }
    setAuthSubmitting(true);
    try {
      if (!hasAdmin) {
        await setupAdminAccount(loginEmail.trim(), loginPassword, 'Store Owner');
        setHasAdmin(true);
        showToast('Admin password configured');
      } else {
        await signInWithEmail(loginEmail.trim(), loginPassword);
        showToast('Signed in to Admin Studio');
      }
      setLoginPassword('');
      setLoginConfirm('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  if (!authReady) {
    return (
      <main className="min-h-[65vh] grid place-items-center px-6">
        <p className="text-sm text-[#6a584b] dark:text-[#b8a898]">Checking session...</p>
      </main>
    );
  }

  if (!user || !isAdmin) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-8 shadow-xl">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#cf9a3e]/20 text-[#86570f] dark:text-[#e5a362] grid place-items-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl mb-2 text-center">Admin Studio Portal</h1>
          {user && !isAdmin ? (
            <div className="text-center">
              <p className="text-sm text-[#6a584b] dark:text-[#b8a898] mb-5">
                Signed in as <strong>{user.email}</strong>. Store management requires the verified
                owner account ({adminEmailHint}).
              </p>
              <button
                type="button"
                onClick={signOutUser}
                className="w-full py-3 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] font-semibold text-sm hover:border-[#cf9a3e] cursor-pointer"
              >
                Sign out and switch account
              </button>
            </div>
          ) : (
            <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
              <p className="text-sm text-[#6a584b] dark:text-[#b8a898] text-center">
                {hasAdmin
                  ? 'Sign in with your administrator email and password to manage products, orders, inquiries, and site content.'
                  : `Create the owner password for ${adminEmailHint} to unlock your MySQL Admin Studio.`}
              </p>

              <div>
                <label className="block text-xs font-semibold mb-1">Admin Email</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                />
              </div>

              {!hasAdmin && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={loginConfirm}
                    onChange={(e) => setLoginConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm inline-flex items-center justify-center gap-2 hover:brightness-105 disabled:opacity-60 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {authSubmitting
                    ? 'Please wait...'
                    : hasAdmin
                      ? 'Sign In to Admin Studio'
                      : 'Create Admin Password'}
                </span>
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[75vh]">
      <section className="bg-gradient-to-r from-[#22140d] to-[#4b2f1c] text-[#f6efe2] py-8 px-6">
        <div className="max-w-[1240px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">Inaya&apos;s Admin Studio</h1>
            <p className="text-xs sm:text-sm text-[#cdbfae] mt-0.5">
              Signed in as {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={signOutUser}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/30 text-sm hover:border-[#cf9a3e] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </section>

      <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 pb-4 mb-8 border-b border-[#dccfbe] dark:border-[#3d2f25]">
          {[
            { id: 'products' as const, label: `Products (${dbProducts.length})`, icon: Package },
            { id: 'orders' as const, label: `Orders (${orders.length})`, icon: ShoppingBag },
            { id: 'inquiries' as const, label: `Inquiries (${inquiries.length})`, icon: MessageSquare },
            { id: 'gallery' as const, label: `Gallery (${gallery.length})`, icon: ImageIcon },
            { id: 'reviews' as const, label: `Reviews (${reviews.length})`, icon: Star },
            { id: 'settings' as const, label: 'Site Content', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#cf9a3e] text-[#22140d]'
                    : 'bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] hover:border-[#cf9a3e]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Products Tab */}
        {tab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
            <form
              onSubmit={handleSaveProduct}
              className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">
                  {editingId ? 'Edit Product' : 'Add New Product'}
                </h2>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="text-xs underline text-[#86570f] dark:text-[#e5a362] cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Category</label>
                  <select
                    value={pCat}
                    onChange={(e) => setPCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                  >
                    {STORE_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.queryCat}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Badge (optional)</label>
                  <input
                    type="text"
                    value={pTag}
                    onChange={(e) => setPTag(e.target.value)}
                    placeholder="Bestseller / New"
                    className="w-full px-3 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Price (BDT) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm tabular-price"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Old Price (optional)</label>
                  <input
                    type="number"
                    min={0}
                    value={pOld}
                    onChange={(e) => setPOld(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm tabular-price"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={pDesc}
                  onChange={(e) => setPDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProductImageUpload}
                  className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#cf9a3e] file:text-[#22140d] file:font-semibold"
                />
                {pImage && (
                  <img
                    src={pImage}
                    alt="Preview"
                    className="mt-2 h-24 w-32 object-cover rounded-lg border border-[#dccfbe] dark:border-[#3d2f25]"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={savingProduct}
                className="w-full py-2.5 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm inline-flex items-center justify-center gap-1.5 hover:brightness-105 disabled:opacity-60 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{savingProduct ? 'Saving...' : editingId ? 'Save Changes' : 'Add Product'}</span>
              </button>
            </form>

            <div className="space-y-4">
              {dbProducts.length === 0 && (
                <div className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg">Database Catalog Is Empty</h3>
                    <p className="text-xs text-[#6a584b] dark:text-[#b8a898]">
                      The storefront is displaying curated fallback products. Import them into MySQL to edit or customize prices.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSeedDefaults}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-xs sm:text-sm cursor-pointer"
                  >
                    <Database className="w-4 h-4" />
                    <span>Import 12 Curated Products</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dbProducts.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-4 flex gap-3.5 items-center"
                  >
                    <img
                      src={item.image || DEFAULT_PRODUCTS[0].image}
                      alt={item.name}
                      className="w-20 h-20 rounded-xl object-cover bg-[#ece3d6] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-[#86570f] dark:text-[#e5a362]">
                        {item.cat}
                      </span>
                      <h3 className="font-display text-base truncate">{item.name}</h3>
                      <p className="text-sm font-bold tabular-price">{formatTaka(item.price)}</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(item.id);
                            setPName(item.name);
                            setPCat(item.cat);
                            setPPrice(String(item.price));
                            setPOld(item.old ? String(item.old) : '');
                            setPTag(item.tag || '');
                            setPDesc(item.desc || '');
                            setPImage(item.image || '');
                            setPThumb(item.thumb || '');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#dccfbe] dark:border-[#3d2f25] text-xs hover:border-[#cf9a3e] cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-red-400/40 text-xs text-red-700 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <p className="text-sm text-[#6a584b] dark:text-[#b8a898]">No customer orders yet.</p>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="font-display text-lg">{order.name}</strong>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#cf9a3e]/20 text-[#86570f] dark:text-[#e5a362] font-bold">
                        {order.paymentMethod}
                      </span>
                      <span className="text-xs text-[#6a584b] dark:text-[#b8a898] tabular-price">
                        {order.phone}
                      </span>
                    </div>
                    <p className="text-xs text-[#6a584b] dark:text-[#b8a898]">{order.address}</p>
                    {order.note && <p className="text-xs italic">Note: {order.note}</p>}
                    <p className="text-xs pt-1">
                      {order.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <strong className="text-lg font-bold tabular-price mr-2">
                      {formatTaka(order.total)}
                    </strong>
                    <select
                      aria-label={`Order status for ${order.name}`}
                      value={order.status}
                      onChange={(e) =>
                        handleUpdateOrderStatus(order.id, e.target.value as OrderDoc['status'])
                      }
                      className="px-3 py-1.5 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea] dark:bg-[#17110d] text-xs font-semibold"
                    >
                      <option value="New">New</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <button
                      type="button"
                      aria-label="Delete order"
                      onClick={() => handleDeleteOrder(order.id)}
                      className="p-2 rounded-lg border border-red-400/40 text-red-700 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Inquiries Tab */}
        {tab === 'inquiries' && (
          <div className="space-y-4">
            {inquiries.length === 0 ? (
              <p className="text-sm text-[#6a584b] dark:text-[#b8a898]">
                No custom quote inquiries yet.
              </p>
            ) : (
              inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="font-display text-lg">{inq.name}</strong>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#cf9a3e]/20 text-[#86570f] dark:text-[#e5a362] font-bold">
                        {inq.interest}
                      </span>
                      <span className="text-xs text-[#6a584b] dark:text-[#b8a898] tabular-price">
                        {inq.phone}
                      </span>
                    </div>
                    {inq.message && (
                      <p className="text-sm text-[#6a584b] dark:text-[#b8a898]">{inq.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <select
                      aria-label={`Inquiry status for ${inq.name}`}
                      value={inq.status}
                      onChange={(e) =>
                        handleUpdateInquiryStatus(inq.id, e.target.value as InquiryDoc['status'])
                      }
                      className="px-3 py-1.5 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea] dark:bg-[#17110d] text-xs font-semibold"
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <button
                      type="button"
                      aria-label="Delete inquiry"
                      onClick={() => handleDeleteInquiry(inq.id)}
                      className="p-2 rounded-lg border border-red-400/40 text-red-700 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Gallery Tab */}
        {tab === 'gallery' && (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 items-start">
            <form
              onSubmit={handleSaveGalleryItem}
              className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-6 space-y-4"
            >
              <h2 className="font-display text-xl">Upload Gallery Photo</h2>
              <div>
                <label className="block text-xs font-semibold mb-1">Category</label>
                <select
                  value={gCat}
                  onChange={(e) => setGCat(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                >
                  {['Wardrobe', 'Bedroom', 'Living Room', 'Dining', 'Storage'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Project Title</label>
                <input
                  type="text"
                  value={gTitle}
                  onChange={(e) => setGTitle(e.target.value)}
                  placeholder="e.g. Walnut Sliding Wardrobe — Uttara"
                  className="w-full px-3 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Photo *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleGalleryUpload}
                  className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#cf9a3e] file:text-[#22140d] file:font-semibold"
                />
                {gImage && (
                  <img
                    src={gImage}
                    alt="Preview"
                    className="mt-2 h-28 w-full object-cover rounded-lg border border-[#dccfbe]"
                  />
                )}
              </div>
              <button
                type="submit"
                disabled={savingGallery}
                className="w-full py-2.5 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm cursor-pointer"
              >
                {savingGallery ? 'Uploading...' : 'Publish to Gallery'}
              </button>
            </form>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {gallery.map((g) => (
                <div
                  key={g.id}
                  className="rounded-xl overflow-hidden bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25]"
                >
                  <img
                    src={g.image}
                    alt={g.title}
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-[#86570f] dark:text-[#e5a362] block">
                        {g.cat}
                      </span>
                      <p className="text-xs font-medium truncate">{g.title}</p>
                    </div>
                    {!g.id.startsWith('g') && (
                      <button
                        type="button"
                        aria-label="Delete gallery item"
                        onClick={() => handleDeleteGalleryItem(g.id)}
                        className="p-1.5 rounded text-red-700 dark:text-red-400 hover:bg-red-500/10 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {tab === 'reviews' && (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 items-start">
            <form
              onSubmit={handleSaveReview}
              className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-6 space-y-4"
            >
              <h2 className="font-display text-xl">Add Customer Review</h2>
              <div>
                <label className="block text-xs font-semibold mb-1">Customer Name &amp; City *</label>
                <input
                  type="text"
                  required
                  value={rName}
                  onChange={(e) => setRName(e.target.value)}
                  placeholder="e.g. Ayesha Siddika · Mirpur"
                  className="w-full px-3 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Stars</label>
                <select
                  value={rStars}
                  onChange={(e) => setRStars(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                >
                  {[5, 4, 3, 2, 1].map((s) => (
                    <option key={s} value={s}>
                      {s} Stars
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Quote *</label>
                <textarea
                  rows={3}
                  required
                  value={rText}
                  onChange={(e) => setRText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={savingReview}
                className="w-full py-2.5 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm cursor-pointer"
              >
                {savingReview ? 'Saving...' : 'Add Review'}
              </button>
            </form>

            <div className="space-y-3">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="text-[#d9a441] text-sm">{'★'.repeat(rev.stars)}</div>
                    <strong className="text-sm">{rev.name}</strong>
                    <p className="text-sm text-[#6a584b] dark:text-[#b8a898] mt-1">{rev.text}</p>
                  </div>
                  {!rev.id.startsWith('r') && (
                    <button
                      type="button"
                      aria-label="Delete review"
                      onClick={() => handleDeleteReview(rev.id)}
                      className="p-2 rounded text-red-700 dark:text-red-400 hover:bg-red-500/10 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <form
              onSubmit={handleSaveSettings}
              className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">Storefront Copy &amp; Contact Info</h2>
                <button
                  type="button"
                  onClick={() => setSText(DEFAULT_SITE_TEXT)}
                  className="text-xs underline text-[#86570f] dark:text-[#e5a362] cursor-pointer"
                >
                  Reset defaults
                </button>
              </div>
              {(
                [
                  ['hero_eyebrow', 'Hero Eyebrow'],
                  ['hero_title', 'Hero Heading'],
                  ['hero_text', 'Hero Subtitle'],
                  ['phone', 'Phone Number'],
                  ['wa', 'WhatsApp Digits (880...)'],
                  ['address', 'Showroom Address'],
                  ['tagline', 'Top Ticker Tagline'],
                  ['foot_text', 'Footer Tagline'],
                ] as [keyof SiteTextConfig, string][]
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold mb-1">{label}</label>
                  <input
                    type="text"
                    value={sText[key]}
                    onChange={(e) => setSText((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-2.5 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm cursor-pointer"
              >
                {savingSettings ? 'Saving...' : 'Save Site Content'}
              </button>
            </form>

            <div className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-6 space-y-4">
              <h2 className="font-display text-xl">Hero &amp; Category Image Overrides</h2>
              <p className="text-xs text-[#6a584b] dark:text-[#b8a898]">
                Upload custom photographs to replace the hero cover or individual category thumbnails. Customer support portrait remains locked read-only.
              </p>

              <div className="p-3 rounded-xl border border-[#dccfbe] dark:border-[#3d2f25] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={siteImages.hero || '/cover-photo.jpg'}
                    alt="Hero Cover"
                    className="w-16 h-12 rounded-lg object-cover bg-[#ece3d6]"
                  />
                  <span className="text-sm font-semibold">Hero Cover Photo</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Upload Hero Cover Photo"
                  onChange={(e) => handleSlotImageUpload('hero', e)}
                  className="text-xs max-w-[180px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STORE_CATEGORIES.slice(0, 6).map((cat) => (
                  <div
                    key={cat.key}
                    className="p-3 rounded-xl border border-[#dccfbe] dark:border-[#3d2f25] space-y-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={siteImages[cat.key] || cat.image}
                        alt={cat.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <span className="text-xs font-semibold">{cat.name}</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      aria-label={`Upload photo for ${cat.name}`}
                      onChange={(e) => handleSlotImageUpload(cat.key, e)}
                      className="text-[11px] w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
