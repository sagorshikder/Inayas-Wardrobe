import { useState, type FormEvent } from 'react';
import { Check, Copy, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { isValidBdPhone } from '../utils/commerce';

export function ContactPage() {
  const { siteText, submitContactInquiry, showToast } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('Custom Wardrobe');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setErrorMsg('Please enter your name.');
      return;
    }
    if (!isValidBdPhone(phone)) {
      setErrorMsg('Please enter a valid 11-digit BD mobile number (e.g. 017XXXXXXXX).');
      return;
    }

    setSubmitting(true);
    try {
      const id = await submitContactInquiry({
        name: trimmedName,
        phone: phone.trim(),
        interest,
        message: message.trim(),
      });
      setSentId(id);
      showToast('Inquiry submitted — our team will call you shortly.');
      setName('');
      setPhone('');
      setMessage('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send inquiry right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppDirect = () => {
    const text = [
      "Hello Inaya's Wardrobe,",
      name.trim() ? `Name: ${name.trim()}` : '',
      phone.trim() ? `Phone: ${phone.trim()}` : '',
      `Interested in: ${interest}`,
      message.trim() ? `Details: ${message.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    window.open(
      `https://wa.me/${siteText.wa}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const copyAccount = async (label: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(label);
      showToast(`${label} number copied`);
      window.setTimeout(() => setCopiedKey((k) => (k === label ? null : k)), 1800);
    } catch {
      showToast(`${label}: ${val}`);
    }
  };

  return (
    <main className="min-h-[70vh]">
      <section className="bg-gradient-to-r from-[#22140d] to-[#4b2f1c] text-[#f6efe2] py-10 px-6">
        <div className="max-w-[1240px] mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl">Contact Us</h1>
          <p className="text-[#cdbfae] text-sm mt-1">
            Custom wardrobe measurements, showroom visits, or nationwide delivery inquiries.
          </p>
        </div>
      </section>

      <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Direct Info & Map */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-6 space-y-4">
            <h2 className="font-display text-2xl">Visit &amp; Call</h2>
            <div className="space-y-3 text-sm">
              <p className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#86570f] dark:text-[#e5a362] mt-0.5 shrink-0" />
                <span>
                  <strong>Showroom &amp; Workshop:</strong> {siteText.address}
                </span>
              </p>
              <p className="flex items-center gap-3 tabular-price">
                <Phone className="w-4 h-4 text-[#86570f] dark:text-[#e5a362] shrink-0" />
                <a
                  href={`tel:${siteText.phone.replace(/[^\d+]/g, '')}`}
                  className="hover:underline font-medium"
                >
                  {siteText.phone}
                </a>
              </p>
              <p className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 text-[#17803d] shrink-0" />
                <a
                  href={`https://wa.me/${siteText.wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline font-medium"
                >
                  Chat directly on WhatsApp
                </a>
              </p>
              <p className="text-[#6a584b] dark:text-[#b8a898] pt-1">
                <strong>Hours:</strong> Saturday – Thursday, 10:00 AM – 8:00 PM
              </p>
            </div>
          </div>

          {/* Payment Details */}
          <div className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-6">
            <h2 className="font-display text-xl mb-3">Payment Accounts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
              {[
                { label: 'bKash / Nagad', value: siteText.pay_bkash_nagad },
                { label: 'Rocket (DBBL)', value: siteText.pay_rocket },
                { label: 'Islami Bank (IBBL)', value: siteText.pay_ibbl },
              ].map((acc) => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => copyAccount(acc.label, acc.value)}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl border border-[#dccfbe] dark:border-[#3d2f25] hover:border-[#cf9a3e] text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="text-xs text-[#6a584b] dark:text-[#b8a898] block">
                      {acc.label}
                    </span>
                    <strong className="tabular-price text-sm block truncate">{acc.value}</strong>
                  </div>
                  {copiedKey === acc.label ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#86570f] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-[#dccfbe] dark:border-[#3d2f25] shadow-xs">
            <iframe
              title="Inaya's Wardrobe Location — Pangsha, Rajbari"
              src="https://www.google.com/maps?q=Pangsha,Rajbari,Bangladesh&output=embed"
              width="100%"
              height="260"
              style={{ border: 0 }}
              loading="lazy"
            />
          </div>
        </div>

        {/* Contact & Custom Quote Form */}
        <div className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-6 sm:p-8 shadow-xs">
          <h2 className="font-display text-2xl mb-1.5">Request a Custom Quote</h2>
          <p className="text-sm text-[#6a584b] dark:text-[#b8a898] mb-6">
            Send us your room dimensions or furniture requirement and we will respond promptly.
          </p>

          {sentId && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-500/40 text-sm">
              <strong className="block text-emerald-700 dark:text-emerald-300">
                Inquiry received (#{sentId.slice(0, 6).toUpperCase()})
              </strong>
              <p className="text-xs text-[#6a584b] dark:text-[#b8a898] mt-1">
                We have saved your request and our Pangsha-Rajbari workshop team will call you shortly.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-400/50 text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="cName" className="block text-sm font-medium mb-1">
                Your Name *
              </label>
              <input
                id="cName"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tariqul Islam"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
              />
            </div>

            <div>
              <label htmlFor="cPhone" className="block text-sm font-medium mb-1">
                Phone / WhatsApp Number *
              </label>
              <input
                id="cPhone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm tabular-price"
              />
            </div>

            <div>
              <label htmlFor="cItem" className="block text-sm font-medium mb-1">
                Interested In
              </label>
              <select
                id="cItem"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
              >
                <option value="Custom Wardrobe">Custom Wardrobe</option>
                <option value="Bedroom Set">Bedroom Set</option>
                <option value="Sofa / Living Room">Sofa / Living Room</option>
                <option value="Dining Set">Dining Set</option>
                <option value="Other Furniture">Other Furniture</option>
              </select>
            </div>

            <div>
              <label htmlFor="cMsg" className="block text-sm font-medium mb-1">
                Room Size / Notes
              </label>
              <textarea
                id="cMsg"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Wall width, height, preferred wood finish, or delivery location..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] bg-[#f7f2ea]/40 dark:bg-[#17110d] text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="py-3 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm hover:brightness-105 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Sending...' : 'Send Inquiry'}
              </button>
              <button
                type="button"
                onClick={handleWhatsAppDirect}
                className="py-3 rounded-lg bg-[#17803d] text-white font-semibold text-sm hover:brightness-110 cursor-pointer"
              >
                Send via WhatsApp
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
