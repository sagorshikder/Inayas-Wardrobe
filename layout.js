/* layout.js : alada page gulor header + footer. Index.html e lagbe na. */
(function () {
  const here = (location.pathname.split("/").pop() || "index.html") + location.search;
  const links = [["Home","index.html"],["Shop","shop.html"],["Wardrobe","shop.html?cat=Wardrobe"],["Bedroom","shop.html?cat=Bedroom"],
    ["Living Room","shop.html?cat=Living%20Room"],["Dining","shop.html?cat=Dining"],["Gallery","gallery.html"],["3D View","view3d.html"],
    ["About Us","about.html"],["Contact","contact.html"]];
  // Day/Dark mode: page e theme file na thakleo ekhane theke auto load hobe
  if (!document.querySelector('link[href*="theme.css"]')) {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "theme.css?v=5"; document.head.appendChild(l);
  }
  if (!document.querySelector('script[src*="theme.js"]')) {
    const t = document.createElement("script"); t.src = "theme.js?v=5"; document.head.appendChild(t);
  }
  if (!document.querySelector('script[src*="header-ui.js"]')) {
    const u = document.createElement("script"); u.src = "header-ui.js?v=5"; document.head.appendChild(u);
  }
  const h = document.getElementById("site-header");
  if (h) h.innerHTML = `
  <header class="pg-header"><div class="pg-bar">
    <a class="pg-logo" href="index.html"><img src="Logo.png" alt="Inaya's Wardrobe logo"><span>INAYA'S WARDROBE</span></a>
    <nav id="nav">${links.map(([t,u]) => `<a href="${u}" class="${here === u ? "active" : ""}">${t}</a>`).join("")}</nav>
    <div class="pg-tools">
      <input id="searchInput" placeholder="Search for furniture" aria-label="Search">
      <button type="button" class="icon-btn" id="accountBtn" aria-label="Account" aria-expanded="false" title="Account">👤</button>
      <a class="icon-btn" href="shop.html?wish=1" id="wishlistBtn" aria-label="Wishlist" title="Wishlist">♡<span id="wishCount" class="hui-badge" data-zero="1">0</span></a>
      <a class="icon-btn" href="#" id="cartBtn" aria-label="Cart" title="Cart">🛒<span id="cartCount">0</span></a>
      <button id="menuBtn" aria-label="Menu">☰</button>
    </div></div></header>`;
  const f = document.getElementById("site-footer");
  if (f) f.innerHTML = `
  <footer class="site-footer"><div class="wrap"><div class="foot-grid">
    <div><h4>Inaya's Wardrobe</h4><p>Elegance crafted for your home. Quality furniture and custom wardrobes.</p></div>
    <div><h4>Shop</h4><a href="shop.html?cat=Wardrobe">Wardrobe</a><a href="shop.html?cat=Bedroom">Bedroom</a><a href="shop.html?cat=Living%20Room">Living Room</a><a href="shop.html?cat=Dining">Dining</a></div>
    <div><h4>Company</h4><a href="about.html">About Us</a><a href="gallery.html">Gallery</a><a href="contact.html">Contact</a></div>
    <div><h4>Contact</h4><a href="tel:+8801714000349">+880 1714-000349</a><a href="https://wa.me/8801714000349" target="_blank" rel="noopener">Chat on WhatsApp</a><p>Pangsha-Rajbari, Bangladesh</p><p style="margin-top:8px">bKash / Nagad: <b>01714000350</b> <button type="button" data-copy="01714000350" style="background:transparent;border:1px solid currentColor;color:inherit;border-radius:999px;padding:2px 10px;font-size:12px;cursor:pointer;margin-left:6px">Copy</button><br>Rocket: <b>01714000350-4</b> <button type="button" data-copy="017140003504" style="background:transparent;border:1px solid currentColor;color:inherit;border-radius:999px;padding:2px 10px;font-size:12px;cursor:pointer;margin-left:6px">Copy</button></p></div>
  </div><div class="foot-bottom">© 2026 Inaya's Wardrobe. All rights reserved.</div></div></footer>`;
  const s = document.getElementById("searchInput");
  if (s && !location.pathname.endsWith("shop.html")) s.addEventListener("keydown", e => {
    if (e.key === "Enter" && s.value.trim()) location.href = "shop.html?q=" + encodeURIComponent(s.value.trim());
  });
})();
