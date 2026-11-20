/* Home page-er edit-joggo lekha ar photo er list. admin.html ar index.html duto-i eta use kore. */
(function () {
  const T = (k, label, sel, def, tab, o) => Object.assign({ k, label, sel, def, tab }, o || {});
  const SITE_TEXT = [
    T("hero_eyebrow", "Small heading", ".hero .eyebrow", "Premium furniture collection", "hero"),
    T("hero_title", "Main title", ".hero h1", "Transform Your Space with Timeless Elegance.", "hero"),
    T("hero_text", "Description", ".hero-text p", "Discover high-quality furniture and custom wardrobe solutions designed to make your home more beautiful, functional and uniquely yours.", "hero", { area: 1 }),
    T("hero_btn1", "Button 1 text", ".hero-btns a:nth-child(1)", "Explore Collection →", "hero"),
    T("hero_btn2", "Button 2 text", ".hero-btns a:nth-child(2)", "Customize Your Wardrobe", "hero"),
    T("hero_chip", "Photo label", ".hero-img .chip", "Custom wardrobe, made to your size", "hero"),

    T("phone", "Phone number", "a[href^='tel:']", "+880 1714-000349", "info", { type: "phone" }),
    T("wa", "WhatsApp number (country code shoho, shudhu number)", "a[href*='wa.me']", "8801714000349", "info", { type: "wa" }),
    T("address", "Address", "footer .wrap > div:nth-child(3) li:nth-child(3)", "Pangsha-Rajbari, Bangladesh", "info", { type: "addr" }),
    T("fb", "Facebook link", ".soc.fb-i, .soc-btn.f, .topbar .wrap > a:first-child, .fb > a.btn", "https://www.facebook.com/share/1FZzyT7ius/", "info", { type: "link" }),
    T("ig", "Instagram link", ".soc.ig-i, .soc-btn.i", "", "info", { type: "link" }),
    T("tt", "TikTok link", ".soc.tt-i, .soc-btn.t", "", "info", { type: "link" }),
    T("tagline", "Top bar line", ".topbar .wrap > span:nth-child(2)", "Quality Furniture | Custom Design | Trusted by Thousands", "info"),
    T("g_title", "Gallery box title", ".gallery h3", "Our Gallery", "info"),
    T("g_text", "Gallery box text", ".gallery p", "See how our furniture looks in real homes.", "info"),
    T("f_title", "3D box title", ".feature h3", "3D View & Customization", "info"),
    T("f_text", "3D box text", ".feature p", "Explore our furniture in 3D, change colors, and customize your perfect design.", "info", { area: 1 }),
    T("c_title", "Custom design box title", ".custom h3", "Need a Custom Design?", "info"),
    T("c_text", "Custom design box text", ".custom p", "Your size. Your style. Your choice.", "info"),
    T("foot_text", "Footer line", "footer .wrap > div:first-child", "Elegance Crafted for Your Home.", "info", { type: "tail" }),
    T("accept", "We accept", "footer .wrap > div:nth-child(4)", "bKash • Nagad • VISA • Mastercard", "info", { type: "tail" }),
    T("copy", "Copyright line", ".copy", "© 2026 INAYA'S WARDROBE. All rights reserved.", "info")
  ];
  const SITE_IMG = [
    { k: "hero", label: "Home banner photo", sel: ".hero-img img", w: 1400, q: .8 },
    ...["Wardrobe", "Bedroom", "Living Room", "Dining", "Storage", "Custom Furniture"].map((n, i) =>
      ({ k: "cat" + (i + 1), label: n, sel: ".cats .cat:nth-child(" + (i + 1) + ") span", w: 320, q: .8 }))
  ];

  function applySite(t, imgs) {
    t = t || {}; imgs = imgs || {};
    const $$ = s => [...document.querySelectorAll(s)];
    /* Menu, footer ar "View All" er href="#" link gulo ashol page-e niye jay */
    const L = { "home": "index.html", "shop": "shop.html", "wardrobe": "shop.html?cat=Wardrobe", "bedroom": "shop.html?cat=Bedroom",
      "living room": "shop.html?cat=Living%20Room", "dining": "shop.html?cat=Dining", "gallery": "gallery.html", "view gallery": "gallery.html",
      "about us": "about.html", "contact": "contact.html", "3d view": "view3d.html", "try 3d view": "view3d.html", "view all": "shop.html" };
    $$("a[href='#']").forEach(a => {
      const k = a.textContent.trim().toLowerCase().replace(/\s*→$/, "");
      if (L[k]) a.href = L[k];
    });
    $$(".cats .cat").forEach(a => {
      const n = a.lastChild && a.lastChild.textContent.trim();
      if (n) a.href = "shop.html?cat=" + encodeURIComponent(n);
    });
    SITE_TEXT.forEach(f => {
      const v = (t[f.k] || "").trim(); if (!v) return;
      $$(f.sel).forEach(e => {
        if (f.type === "phone") { e.textContent = "📞 " + v; e.href = "tel:" + v.replace(/[^\d+]/g, ""); }
        else if (f.type === "wa") e.href = e.href.replace(/wa\.me\/\d+/, "wa.me/" + v.replace(/\D/g, ""));
        else if (f.type === "link") { e.href = v; e.target = "_blank"; e.rel = "noopener"; }
        else if (f.type === "addr") e.textContent = "📍 " + v;
        else if (f.type === "tail") {
          const n = [...e.childNodes].reverse().find(x => x.nodeType === 3 && x.textContent.trim());
          if (n) n.textContent = v;
        } else e.textContent = v;
      });
    });
    SITE_IMG.forEach(f => {
      const d = imgs[f.k]; if (!d) return;
      const e = document.querySelector(f.sel); if (!e) return;
      if (f.k === "hero") { e.removeAttribute("srcset"); e.src = d; return; }
      e.textContent = ""; e.style.filter = "none";
      const i = new Image(); i.src = d; i.alt = f.label;
      i.style.cssText = "width:64px;height:64px;object-fit:cover;border-radius:14px;display:block;margin:0 auto";
      e.appendChild(i);
    });
  }
  Object.assign(window, { SITE_TEXT, SITE_IMG, applySite });
})();
