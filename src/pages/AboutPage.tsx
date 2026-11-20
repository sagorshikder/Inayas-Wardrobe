import { useStore } from '../context/StoreContext';

export function AboutPage() {
  const { navigate, siteText } = useStore();

  return (
    <main className="min-h-[70vh]">
      <section className="bg-gradient-to-r from-[#22140d] to-[#4b2f1c] text-[#f6efe2] py-10 px-6">
        <div className="max-w-[1240px] mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl">About Inaya&apos;s Wardrobe</h1>
          <p className="text-[#cdbfae] text-sm mt-1">
            Elegance crafted for your home — Pangsha-Rajbari&apos;s trusted furniture workshop.
          </p>
        </div>
      </section>

      <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-12 space-y-12">
        <div className="max-w-3xl">
          <div className="space-y-4">
            <span className="inline-block px-3 py-1 rounded bg-[#cf9a3e]/20 text-[#86570f] dark:text-[#e5a362] text-xs font-bold uppercase tracking-wider">
              Our Story &amp; Craft
            </span>
            <h2 className="font-display text-3xl leading-tight">Crafted with Care</h2>
            <p className="text-[#6a584b] dark:text-[#b8a898] leading-relaxed">
              Inaya&apos;s Wardrobe began in Pangsha-Rajbari with a simple promise: build solid,
              well-proportioned furniture that fits Bangladeshi homes and families.
            </p>
            <p className="text-[#6a584b] dark:text-[#b8a898] leading-relaxed">
              From sliding wardrobes measured to your exact wall to comfortable sofas, beds, and
              dining tables, every piece is finished by skilled local artisans using seasoned timber,
              fine veneer, and reliable hardware.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="px-6 py-3 rounded-lg bg-[#cf9a3e] text-[#22140d] font-semibold text-sm hover:brightness-105 cursor-pointer"
              >
                Visit or Contact Us
              </button>
              <button
                type="button"
                onClick={() => navigate('/view3d')}
                className="px-6 py-3 rounded-lg border border-[#dccfbe] dark:border-[#3d2f25] font-semibold text-sm hover:border-[#cf9a3e] cursor-pointer"
              >
                Customize in 3D
              </button>
            </div>
          </div>
        </div>

        {/* Milestone Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { value: '500+', label: 'Happy Customers Across Bangladesh' },
            { value: '1 Year', label: 'Fine Woodworking Experience' },
            { value: '100%', label: 'Made to Order & Custom Fitted' },
          ].map((stat) => (
            <div
              key={stat.value}
              className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-7 text-center shadow-xs"
            >
              <strong className="font-display text-4xl text-[#86570f] dark:text-[#e5a362] block tabular-price">
                {stat.value}
              </strong>
              <span className="text-sm text-[#6a584b] dark:text-[#b8a898] mt-1.5 block">
                {stat.label}
              </span>
            </div>
          ))}
        </section>

        {/* Workshop Highlights */}
        <section className="rounded-2xl bg-white dark:bg-[#241a14] border border-[#dccfbe] dark:border-[#3d2f25] p-7 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-display text-lg mb-1.5">Seasoned Timber &amp; Veneer</h3>
            <p className="text-sm text-[#6a584b] dark:text-[#b8a898]">
              Kiln-dried frames, moisture-resistant boards, and soft-close sliding channels built for daily use.
            </p>
          </div>
          <div>
            <h3 className="font-display text-lg mb-1.5">Measured for Your Room</h3>
            <p className="text-sm text-[#6a584b] dark:text-[#b8a898]">
              Customize width, height, door layout, and inner compartments before fabrication begins.
            </p>
          </div>
          <div>
            <h3 className="font-display text-lg mb-1.5">Nationwide Cash-On Delivery</h3>
            <p className="text-sm text-[#6a584b] dark:text-[#b8a898]">
              Delivered from {siteText.address} across Dhaka and nationwide with cash on delivery options.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
