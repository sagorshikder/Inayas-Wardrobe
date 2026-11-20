import { useState, type FormEvent } from 'react';
import { Check, Copy, Minus, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  buildCartWhatsAppUrl,
  computeCartSummary,
  formatTaka,
  type PaymentMethod,
} from '../utils/commerce';

export function DrawersAndModals() {
  const {
    cart,
    cartSummary,
    cartOpen,
    setCartOpen,
    setCartItemQty,
    clearCart,
    checkoutOpen,
    checkoutItems,
    openCheckout,
    closeCheckout,
    submitCustomerOrder,
    paymentModal,
    closePaymentModal,
    toastMessage,
    siteText,
    t,
  } = useStore();

  const [ckName, setCkName] = useState('');
  const [ckPhone, setCkPhone] = useState('');
  const [ckAddr, setCkAddr] = useState('');
  const [ckNote, setCkNote] = useState('');
  const [ckPayMethod, setCkPayMethod] = useState<PaymentMethod>('COD');
  const [ckError, setCkError] = useState('');
  const [ckSubmitting, setCkSubmitting] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [copiedNum, setCopiedNum] = useState<string | null>(null);

  const activeOrderItems = checkoutItems || cart;
  const activeSummary = computeCartSummary(activeOrderItems);

  const handleCopy = async (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    try {
      await navigator.clipboard.writeText(clean);
      setCopiedNum(val);
      window.setTimeout(() => setCopiedNum(null), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCkError('');
    setCkSubmitting(true);
    try {
      const orderId = await submitCustomerOrder({
        name: ckName,
        phone: ckPhone,
        address: ckAddr,
        note: ckNote,
        paymentMethod: ckPayMethod,
        items: activeOrderItems,
      });
      setConfirmedOrderId(orderId);
      if (!checkoutItems) {
        clearCart();
        setCartOpen(false);
      }
    } catch (err) {
      setCkError(err instanceof Error ? err.message : 'Unable to submit order. Please try again.');
    } finally {
      setCkSubmitting(false);
    }
  };

  const resetAndCloseCheckout = () => {
    setConfirmedOrderId(null);
    setCkError('');
    closeCheckout();
  };

  return (
    <>
      {/* Shopping Cart Slide-Over Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setCartOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t.cartTitle}
            className="relative z-10 w-full max-w-md bg-white dark:bg-[#241a14] text-[#22140d] dark:text-[#f1e6d8] h-full flex flex-col shadow-2xl border-l border-[#dccfbe] dark:border-[#3d2f25]"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#dccfbe] dark:border-[#3d2f25]">
              <h3 className="font-display text-xl">{t.cartTitle}</h3>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
                className="w-9 h-9 rounded-full grid place-items-center hover:bg-[#f7f2ea] dark:hover:bg-[#2d221a] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <p className="text-sm text-[#6a584b] dark:text-[#b8a898] py-8 text-center">
                  {t.cartEmpty}
                </p>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#f7f2ea] dark:bg-[#2d221a] border border-[#dccfbe] dark:border-[#3d2f25]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-xs text-[#86570f] dark:text-[#e5a362] font-semibold tabular-price mt-0.5">
                        {formatTaka(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        onClick={() => setCartItemQty(item.id, Math.max(1, item.qty - 1))}
                        className="w-7 h-7 rounded-md border border-[#dccfbe] dark:border-[#3d2f25] bg-white dark:bg-[#241a14] grid place-items-center cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-price">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        onClick={() => setCartItemQty(item.id, item.qty + 1)}
                        className="w-7 h-7 rounded-md border border-[#dccfbe] dark:border-[#3d2f25] bg-white dark:bg-[#241a14] grid place-items-center cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => setCartItemQty(item.id, 0)}
                      className="p-1.5 text-[#6a584b] dark:text-[#b8a898] hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-[#dccfbe] dark:border-[#3d2f25] space-y-3 bg-[#f7f2ea]/50 dark:bg-[#17110d]/50">
              <div className="flex items-center justify-between text-base font-bold">
                <span>{t.totalLabel}</span>
                <span className="text-lg text-[#86570f] dark:text-[#e5a362] tabular-price">
                  {formatTaka(cartSummary.total)}
                </span>
              </div>
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => {
                  setConfirmedOrderId(null);
                  openCheckout(null);
                }}
                className="w-full py-3 rounded-xl bg-[#cf9a3e] text-[#22140d] font-semibold text-sm hover:brightness-105 disabled:opacity-45 cursor-pointer"
              >
                {t.placeOrder}
              </button>
              <a
                href={buildCartWhatsAppUrl(cart, siteText.wa)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2.5 rounded-xl border border-[#dccfbe] dark:border-[#3d2f25] text-center text-sm font-semibold hover:border-[#cf9a3e] transition-colors"
              >
                {t.orderOnWhatsApp}
              </a>
            </div>
          </aside>
        </div>
      )}

      {/* Checkout Verification & Persistence Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={resetAndCloseCheckout}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Checkout order"
            className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#241a14] text-[#22140d] dark:text-[#f1e6d8] border border-[#dccfbe] dark:border-[#3d2f25] p-6 shadow-2xl"
          >
            {confirmedOrderId ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 grid place-items-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="font-display text-2xl">Order Confirmed</h3>
                <p className="text-sm text-[#6a584b] dark:text-[#b8a898]">
                  Order <span className="font-bold text-[#22140d] dark:text-white">#{confirmedOrderId.slice(-6).toUpperCase()}</span> received. Our team will call to confirm delivery &amp; sizing.
                </p>
                <div className="rounded-xl bg-[#f7f2ea] dark:bg-[#2d221a] p-4 text-left text-xs space-y-2 border border-[#dccfbe] dark:border-[#3d2f25]">
                  <div className="flex items-center justify-between">
                    <span>bKash / Nagad: <b className="tabular-price">{siteText.pay_bkash_nagad}</b></span>
                    <button
                      type="button"
                      onClick={() => handleCopy(siteText.pay_bkash_nagad)}
                      className="px-2.5 py-1 rounded-md border border-[#cf9a3e] font-semibold cursor-pointer"
                    >
                      {copiedNum === siteText.pay_bkash_nagad ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>
                      Rocket:{' '}
                      <b className="tabular-price">
                        {/^\d{12}$/.test(siteText.pay_rocket)
                          ? `${siteText.pay_rocket.slice(0, 11)}-${siteText.pay_rocket.slice(11)}`
                          : siteText.pay_rocket}
                      </b>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(siteText.pay_rocket)}
                      className="px-2.5 py-1 rounded-md border border-[#cf9a3e] font-semibold cursor-pointer"
                    >
                      {copiedNum === siteText.pay_rocket ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>IBBL: <b className="tabular-price">{siteText.pay_ibbl}</b></span>
                    <button
                      type="button"
                      onClick={() => handleCopy(siteText.pay_ibbl)}
                      className="px-2.5 py-1 rounded-md border border-[#cf9a3e] font-semibold cursor-pointer"
                    >
                      {copiedNum === siteText.pay_ibbl ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetAndCloseCheckout}
                  className="w-full py-3 rounded-xl bg-[#cf9a3e] text-[#22140d] font-semibold text-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-2xl">Complete Your Order</h3>
                    <p className="text-xs text-[#6a584b] dark:text-[#b8a898] tabular-price mt-0.5">
                      {activeSummary.count} item(s) · Total {formatTaka(activeSummary.total)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetAndCloseCheckout}
                    aria-label="Close checkout"
                    className="w-8 h-8 rounded-full grid place-items-center hover:bg-[#f7f2ea] dark:hover:bg-[#2d221a] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label htmlFor="ckName" className="block text-xs font-semibold mb-1">
                    Full Name
                  </label>
                  <input
                    id="ckName"
                    type="text"
                    required
                    value={ckName}
                    onChange={(e) => setCkName(e.target.value)}
                    placeholder="e.g. Farhana Rahman"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="ckPhone" className="block text-xs font-semibold mb-1">
                    Phone Number
                  </label>
                  <input
                    id="ckPhone"
                    type="tel"
                    required
                    value={ckPhone}
                    onChange={(e) => setCkPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm tabular-price"
                  />
                </div>

                <div>
                  <label htmlFor="ckAddr" className="block text-xs font-semibold mb-1">
                    Delivery Address
                  </label>
                  <textarea
                    id="ckAddr"
                    required
                    rows={2}
                    value={ckAddr}
                    onChange={(e) => setCkAddr(e.target.value)}
                    placeholder="House, Road, Area, District"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="ckPayMethod" className="block text-xs font-semibold mb-1">
                    Payment Method
                  </label>
                  <select
                    id="ckPayMethod"
                    value={ckPayMethod}
                    onChange={(e) => setCkPayMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                  >
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="bKash">bKash Mobile Pay</option>
                    <option value="Nagad">Nagad Mobile Pay</option>
                    <option value="Rocket">Rocket DBBL</option>
                    <option value="IBBL">Islami Bank (IBBL)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ckNote" className="block text-xs font-semibold mb-1">
                    Note (Optional)
                  </label>
                  <input
                    id="ckNote"
                    type="text"
                    value={ckNote}
                    onChange={(e) => setCkNote(e.target.value)}
                    placeholder="Preferred finish, floor, or delivery time"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
                  />
                </div>

                {ckError && (
                  <p role="alert" className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {ckError}
                  </p>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={ckSubmitting}
                    className="flex-1 py-3 rounded-xl bg-[#cf9a3e] text-[#22140d] font-semibold text-sm hover:brightness-105 disabled:opacity-60 cursor-pointer"
                  >
                    {ckSubmitting ? 'Submitting...' : 'Confirm Order'}
                  </button>
                  <button
                    type="button"
                    onClick={resetAndCloseCheckout}
                    className="px-4 py-3 rounded-xl border border-[#dccfbe] dark:border-[#3d2f25] text-sm font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Payment Number Modal */}
      {paymentModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={closePaymentModal}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${paymentModal.name} Payment`}
            className="relative z-10 w-full max-w-md rounded-3xl bg-white dark:bg-[#241a14] text-[#22140d] dark:text-[#f1e6d8] border border-[#dccfbe] dark:border-[#3d2f25] p-7 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl grid place-items-center text-white font-bold text-lg"
                  style={{ backgroundColor: paymentModal.color }}
                >
                  ৳
                </div>
                <div>
                  <h3 className="font-display text-2xl">{paymentModal.name} Payment</h3>
                  <p className="text-xs text-[#6a584b] dark:text-[#b8a898]">INAYA&apos;S WARDROBE</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePaymentModal}
                aria-label="Close payment modal"
                className="w-9 h-9 rounded-full bg-[#f7f2ea] dark:bg-[#2d221a] grid place-items-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/60 dark:bg-[#2d221a] p-4 mb-4">
              <div className="text-[11px] uppercase tracking-wider font-bold text-[#6a584b] dark:text-[#b8a898]">
                {/^\d{11,12}$/.test(paymentModal.number) ? 'Payment Number' : 'Account Number'}
              </div>
              <div className="text-2xl font-extrabold tracking-wide my-2 tabular-price break-all">
                {/^\d{12}$/.test(paymentModal.number)
                  ? `${paymentModal.number.slice(0, 11)}-${paymentModal.number.slice(11)}`
                  : paymentModal.number}
              </div>
              <button
                type="button"
                onClick={() => handleCopy(paymentModal.number)}
                className="w-full py-2.5 rounded-xl bg-[#22140d] dark:bg-[#cf9a3e] text-white dark:text-[#22140d] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedNum === paymentModal.number ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied Number</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Number</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl bg-[#f7f2ea] dark:bg-[#2d221a] p-3.5 text-xs text-[#6a584b] dark:text-[#b8a898]">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <b className="text-[#22140d] dark:text-[#f1e6d8] block">Cash on Delivery available</b>
                Place your order and pay conveniently upon delivery and installation.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed left-1/2 bottom-6 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#22140d] dark:bg-[#cf9a3e] text-white dark:text-[#22140d] text-sm font-medium shadow-xl"
        >
          {toastMessage}
        </div>
      )}
    </>
  );
}
