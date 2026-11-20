import { MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function Footer() {
  const { navigate, siteText, t, openPaymentModal } = useStore();

  return (
    <>
      <footer className="bg-[#22140d] text-[#cdbfae] text-sm pt-12 pb-6 border-t-[3px] border-[#cf9a3e]">
        <div className="max-w-[1240px] mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1.4fr_2fr_1.6fr] gap-8">
          <div>
            <h4 className="font-display text-[#f6efe2] text-lg mb-3">INAYA&apos;S WARDROBE</h4>
            <p className="leading-relaxed">{siteText.foot_text}</p>
          </div>

          <div>
            <h4 className="font-display text-[#f6efe2] text-lg mb-3">{t.quickLinks}</h4>
            <ul className="space-y-2">
              {[
                { label: t.nav.home, to: '/' },
                { label: t.nav.shop, to: '/shop' },
                { label: t.nav.studio3d, to: '/view3d' },
                { label: t.nav.about, to: '/about' },
                { label: t.nav.contact, to: '/contact' },
                { label: t.nav.admin, to: '/admin' },
              ].map((link) => (
                <li key={link.to}>
                  <a
                    href={link.to}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(link.to);
                    }}
                    className="hover:text-white hover:underline transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-[#f6efe2] text-lg mb-3">{t.contactUs}</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href={`tel:${siteText.phone.replace(/[^\d+]/g, '')}`}
                  className="hover:text-white hover:underline tabular-price"
                >
                  📞 {siteText.phone}
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${siteText.wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white hover:underline"
                >
                  💬 Chat on Messenger / WhatsApp
                </a>
              </li>
              <li>📍 {siteText.address}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-[#f6efe2] text-lg mb-3">{t.weAccept}</h4>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => openPaymentModal('bKash', siteText.pay_bkash_nagad, '#e2136e')}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.07] border border-white/15 hover:border-[#e2136e] hover:-translate-y-0.5 transition-all text-left cursor-pointer"
              >
                <span className="w-8 h-6 rounded-md bg-white grid place-items-center p-0.5 shrink-0" aria-hidden="true">
                  <svg className="w-full h-full" viewBox="0 0 32 24">
                    <path d="M5 4l9.5 11.5L12 19 3 7.5z" fill="#c1105c" />
                    <path d="M14.5 15.5L23.5 3l3.5 4.2-9 10.3z" fill="#e2136e" />
                    <path d="M17.5 11L29 9l-4.5 5.2-5 1.8z" fill="#f03c88" />
                    <path d="M12 19l6-3.2 1.8 4.2z" fill="#9c0b48" />
                  </svg>
                </span>
                <span className="min-w-0 leading-tight">
                  <em className="not-italic block font-bold text-xs text-white">bKash</em>
                  <small className="block text-[10px] text-[#f6efe2]/65">Mobile Pay</small>
                </span>
              </button>

              <button
                type="button"
                onClick={() => openPaymentModal('Nagad', siteText.pay_bkash_nagad, '#f7941d')}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.07] border border-white/15 hover:border-[#f7941d] hover:-translate-y-0.5 transition-all text-left cursor-pointer"
              >
                <span className="w-8 h-6 rounded-md bg-white grid place-items-center p-0.5 shrink-0" aria-hidden="true">
                  <svg className="w-full h-full" viewBox="0 0 32 24">
                    <circle cx="16" cy="12" r="9.5" fill="#fff3e2" />
                    <path
                      d="M16 3.5c3.8 2.8 5.2 6.5 3.6 10.2-1.2 2.8-4 4.8-7.4 5.3 2.3-2 3.2-4.6 2.1-7.4-.9-2.2-.4-5 1.7-8.1z"
                      fill="#f7941d"
                    />
                    <path
                      d="M11.8 6.5c2.4 2.2 3.3 5 2 7.8-.8 1.9-2.5 3.3-4.6 3.9 1.3-1.8 1.6-3.9.6-6-.7-1.7-.2-3.7 2-5.7z"
                      fill="#ed1c24"
                    />
                  </svg>
                </span>
                <span className="min-w-0 leading-tight">
                  <em className="not-italic block font-bold text-xs text-white">Nagad</em>
                  <small className="block text-[10px] text-[#f6efe2]/65">Mobile Pay</small>
                </span>
              </button>

              <button
                type="button"
                onClick={() => openPaymentModal('Rocket', siteText.pay_rocket, '#a64ca6')}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.07] border border-white/15 hover:border-[#a64ca6] hover:-translate-y-0.5 transition-all text-left cursor-pointer"
              >
                <span className="w-8 h-6 rounded-md bg-white grid place-items-center p-0.5 shrink-0" aria-hidden="true">
                  <svg className="w-full h-full" viewBox="0 0 32 24">
                    <circle cx="16" cy="12" r="9.5" fill="#f5eaf8" />
                    <path d="M16 3.8c3.2 2.6 4.4 6.2 4.4 10.4h-8.8c0-4.2 1.2-7.8 4.4-10.4z" fill="#8c3494" />
                    <circle cx="16" cy="10.2" r="2.1" fill="#fff" />
                    <path d="M11.6 12.2l-3 3.3 3 .5zm8.8 0l3 3.3-3 .5z" fill="#a64ca6" />
                    <path d="M14 15h4l-2 5.2z" fill="#cf9a3e" />
                  </svg>
                </span>
                <span className="min-w-0 leading-tight">
                  <em className="not-italic block font-bold text-xs text-white">Rocket</em>
                  <small className="block text-[10px] text-[#f6efe2]/65">DBBL Mobile</small>
                </span>
              </button>

              <button
                type="button"
                onClick={() => openPaymentModal('IBBL', siteText.pay_ibbl, '#2e9e5b')}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.07] border border-white/15 hover:border-[#2e9e5b] hover:-translate-y-0.5 transition-all text-left cursor-pointer"
              >
                <span className="w-8 h-6 rounded-md bg-white grid place-items-center p-0.5 shrink-0" aria-hidden="true">
                  <svg className="w-full h-full" viewBox="0 0 32 24">
                    <rect x="4" y="3" width="24" height="18" rx="3.5" fill="#177a42" />
                    <path d="M16 6l6.5 4.2H9.5z" fill="#cf9a3e" />
                    <path d="M10.5 11.5h2v5.5h-2zm4.5 0h2v5.5h-2zm4.5 0h2v5.5h-2z" fill="#fff" />
                    <rect x="9" y="17.5" width="14" height="1.6" rx=".8" fill="#cf9a3e" />
                  </svg>
                </span>
                <span className="min-w-0 leading-tight">
                  <em className="not-italic block font-bold text-xs text-white">IBBL</em>
                  <small className="block text-[10px] text-[#f6efe2]/65">Islami Bank</small>
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1240px] mx-auto px-6 mt-8 pt-4 border-t border-white/15 text-center text-xs">
          {siteText.copy}
        </div>
      </footer>

      <a
        href={`https://wa.me/${siteText.wa}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed right-4 bottom-4 z-30 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#17803d] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition-all"
      >
        <MessageCircle className="w-4 h-4" />
        <span>WhatsApp</span>
      </a>
    </>
  );
}
