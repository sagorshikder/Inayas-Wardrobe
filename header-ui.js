/* header-ui.js : Header er 👤 Account, ♡ Wishlist, 🛒 Cart button shob page e kaj korar jonno.
   index.html e <script src="header-ui.js"></script> dewa ache; baki page e layout.js auto load kore. */
(function () {
  if (window.__huiLoaded) return;
  window.__huiLoaded = true;

  var WA = "8801714000349";
  var $ = function (id) { return document.getElementById(id); };
  var read = function (k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } };

  /* ---------- CSS ---------- */
  var css = '' +
    'button.icon-btn{border:0;cursor:pointer;font:inherit;color:inherit}' +
    '#accountBtn,#wishlistBtn,#cartBtn{position:relative}' +
    '.hui-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#b8732e;color:#fff;font:700 11px/18px Arial,sans-serif;text-align:center;box-sizing:border-box}' +
    '.hui-badge[data-zero="1"]{display:none}' +
    '.hui-panel{position:fixed;top:90px;right:24px;width:min(330px,calc(100vw - 24px));background:#fff;color:#2f2018;border:1px solid #eadfd2;border-radius:20px;padding:18px;box-shadow:0 22px 70px rgba(47,32,24,.22);z-index:2500;opacity:0;visibility:hidden;transform:translateY(-8px) scale(.98);transition:.2s ease;font-family:inherit}' +
    '.hui-panel.open{opacity:1;visibility:visible;transform:none}' +
    '.hui-head{display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1px solid #eadfd2}' +
    '.hui-avatar{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#b8732e,#d69a5c);color:#fff;font-size:22px;box-shadow:0 8px 22px rgba(184,115,46,.25)}' +
    '.hui-head strong{display:block;font-family:Georgia,serif;font-size:17px}' +
    '.hui-head small{display:block;color:#7a6a5d;font-size:12px;margin-top:2px}' +
    '.hui-links{display:grid;gap:8px;margin-top:14px}' +
    '.hui-link{display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:12px;background:#faf6f1;border:1px solid transparent;font-size:13px;font-weight:600;color:inherit;text-decoration:none;cursor:pointer;transition:.2s;width:100%;box-sizing:border-box;font-family:inherit;text-align:left}' +
    '.hui-link:hover{background:#f3e8dc;border-color:#eadfd2;transform:translateX(2px)}' +
    '.hui-link .ic{font-size:17px;width:22px;text-align:center}' +
    '.hui-link .n{margin-left:auto;background:#b8732e;color:#fff;border-radius:999px;font-size:11px;padding:1px 8px}' +
    '.hui-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border-radius:12px;background:#faf6f1;font-size:13px;font-weight:600}' +
    '.hui-row small{display:block;color:#7a6a5d;font-weight:400;font-size:11px;margin-top:2px}' +
    '.hui-sw{position:relative;width:46px;height:26px;flex:0 0 46px}' +
    '.hui-sw input{opacity:0;width:0;height:0;position:absolute}' +
    '.hui-sl{position:absolute;inset:0;background:#cbb9aa;border-radius:30px;cursor:pointer;transition:.2s}' +
    '.hui-sl:before{content:"☀️";position:absolute;width:22px;height:22px;left:2px;top:2px;background:#fff;border-radius:50%;display:grid;place-items:center;font-size:12px;transition:.2s;box-shadow:0 2px 5px rgba(0,0,0,.15)}' +
    '.hui-sw input:checked+.hui-sl{background:#8a5222}' +
    '.hui-sw input:checked+.hui-sl:before{transform:translateX(20px);content:"🌙"}' +
    '.hui-note{font-size:11px;color:#7a6a5d;line-height:1.5;margin:13px 3px 0}' +
    /* dark mode */
    'html[data-theme="dark"] .hui-panel{background:#211914;color:#f1e6d8;border-color:#4b382b}' +
    'html[data-theme="dark"] .hui-head{border-color:#4b382b}' +
    'html[data-theme="dark"] .hui-head small,html[data-theme="dark"] .hui-row small,html[data-theme="dark"] .hui-note{color:#c6b5a8}' +
    'html[data-theme="dark"] .hui-link,html[data-theme="dark"] .hui-row{background:#2a201a;color:#f1e6d8}' +
    'html[data-theme="dark"] .hui-link:hover{background:#362820;border-color:#5a4332}' +
    '@media(max-width:760px){.hui-panel{right:12px}}';
  var st = document.createElement("style");
  st.id = "hui-css";
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- Account panel ---------- */
  function buildPanel() {
    if ($("accountPanel")) return $("accountPanel");
    var p = document.createElement("div");
    p.id = "accountPanel";
    p.className = "hui-panel";
    p.setAttribute("aria-hidden", "true");
    p.innerHTML =
      '<div class="hui-head"><div class="hui-avatar">👤</div><div><strong>Welcome to INAYA\'S</strong><small>Your furniture experience</small></div></div>' +
      '<div class="hui-links">' +
        '<a class="hui-link" href="shop.html"><span class="ic">🛍️</span><span>Browse Collection</span></a>' +
        '<a class="hui-link" href="shop.html?wish=1"><span class="ic">♡</span><span>My Wishlist</span><span class="n" id="huiWishN">0</span></a>' +
        '<a class="hui-link" href="#" id="huiCartLink"><span class="ic">🛒</span><span>My Cart</span><span class="n" id="huiCartN">0</span></a>' +
        '<a class="hui-link" href="https://wa.me/' + WA + '" target="_blank" rel="noopener"><span class="ic">💬</span><span>Chat with us on WhatsApp</span></a>' +
        '<div class="hui-row"><span><span>🎨 Appearance</span><small>Dark Mode</small></span>' +
          '<label class="hui-sw" title="Toggle Dark Mode"><input type="checkbox" id="huiTheme" aria-label="Toggle Dark Mode"><span class="hui-sl"></span></label></div>' +
      '</div>' +
      '<p class="hui-note">Your wishlist and cart are saved on this device. No account is required to shop.</p>';
    document.body.appendChild(p);
    return p;
  }

  function cartQty() { return read("cart").reduce(function (s, i) { return s + (Number(i.qty) || 0); }, 0); }
  function wishQty() { return read("wish").length; }

  function setBadge(btnId, n, existingId) {
    var btn = $(btnId);
    if (!btn) return;
    var b = existingId && $(existingId);
    if (!b) {
      b = btn.querySelector(".hui-badge");
      if (!b) { b = document.createElement("span"); b.className = "hui-badge"; btn.appendChild(b); }
    }
    b.textContent = n;
    if (existingId && b.id === existingId) return;      // inner page er cartCount nijer style e thakbe
    b.setAttribute("data-zero", n ? "0" : "1");
  }

  function refresh() {
    var c = cartQty(), w = wishQty();
    setBadge("cartBtn", c, "cartCount");
    if ($("wishCount")) { $("wishCount").textContent = w; $("wishCount").className = "hui-badge"; $("wishCount").setAttribute("data-zero", w ? "0" : "1"); }
    else setBadge("wishlistBtn", w);
    if ($("huiCartN")) { $("huiCartN").textContent = c; $("huiCartN").style.display = c ? "" : "none"; }
    if ($("huiWishN")) { $("huiWishN").textContent = w; $("huiWishN").style.display = w ? "" : "none"; }
  }

  function openCartAnywhere() {
    // Inner page e main.js er drawer thake; homepage e nei, tai Shop page e niye jay
    if ($("drawer") && $("cartBtn")) { $("cartBtn").click(); return true; }
    location.href = "shop.html?cart=1";
    return false;
  }

  function init() {
    var panel = buildPanel();
    var acc = $("accountBtn"), wish = $("wishlistBtn"), cart = $("cartBtn");

    function close() {
      panel.classList.remove("open");
      panel.setAttribute("aria-hidden", "true");
      if (acc) acc.setAttribute("aria-expanded", "false");
    }
    function open() {
      if (acc) {
        var r = acc.getBoundingClientRect();
        panel.style.top = Math.round(r.bottom + 10) + "px";
        panel.style.right = Math.max(12, Math.round(window.innerWidth - r.right - 12)) + "px";
        acc.setAttribute("aria-expanded", "true");
      }
      panel.classList.add("open");
      panel.setAttribute("aria-hidden", "false");
      refresh();
    }

    if (acc) acc.addEventListener("click", function (e) {
      e.stopPropagation();
      panel.classList.contains("open") ? close() : open();
    });
    panel.addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);

    if (wish) wish.addEventListener("click", function (e) { e.preventDefault(); location.href = "shop.html?wish=1"; });

    // Homepage e cart button: Shop page er cart drawer khole. Inner page e main.js nijei handle kore.
    if (cart && !$("drawer")) {
      cart.addEventListener("click", function (e) {
        if ($("drawer")) return;
        e.preventDefault();
        location.href = "shop.html?cart=1";
      });
    }

    var cl = $("huiCartLink");
    if (cl) cl.addEventListener("click", function (e) { e.preventDefault(); close(); openCartAnywhere(); });

    // Dark mode switch (theme.js er sathe synced)
    var sw = $("huiTheme");
    function syncSwitch() {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      if (sw) sw.checked = dark;
    }
    if (sw) sw.addEventListener("change", function () {
      if (window.inayaTheme) window.inayaTheme.set(sw.checked ? "dark" : "light");
    });
    window.addEventListener("inaya-themechange", syncSwitch);
    syncSwitch();

    window.addEventListener("storage", refresh);
    window.addEventListener("inaya-cart", refresh);
    window.addEventListener("inaya-wish", refresh);
    refresh();
    // main.js ba layout.js pore load hole abar count thik kore dey
    setTimeout(refresh, 600);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
