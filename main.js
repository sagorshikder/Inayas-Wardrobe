/* ============================================================
   main.js : Cart, Wishlist, Search, Mobile menu, Customizer
   </body> er age: <script src="main.js"></script>
   (Part 1 er choto wishlist <script> ta delete koro, ekhane ache)
   ============================================================ */

const WA_NUMBER = "8801714000349";
const PAY_BN = "01714000350";        // bKash / Nagad
const PAY_ROCKET = "017140003504";   // Rocket (01714000350-4)
const taka = n => "৳ " + Number(n).toLocaleString("en-IN");
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

let cart = load("cart", []);
let wish = load("wish", []);

/* ---------- Toast ---------- */
const toastEl = document.createElement("div");
toastEl.className = "toast";
document.body.appendChild(toastEl);
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1800);
}

/* ---------- Cart drawer (JS diye banano) ---------- */
document.body.insertAdjacentHTML("beforeend", `
  <div class="drawer-bg" id="drawerBg"></div>
  <aside class="drawer" id="drawer" aria-label="Shopping cart">
    <header><h3 style="margin:0">আপনার কার্ট</h3><button id="drawerClose" aria-label="Close cart">×</button></header>
    <div class="cart-items" id="cartItems"></div>
    <footer>
      <div class="tot"><span>মোট</span><span id="cartTotal">৳ 0</span></div>
      <button class="btn" id="cartPlace" style="display:block;width:100%;margin-bottom:8px">অর্ডার করুন</button>
      <a class="btn" style="display:block" id="cartOrder" href="#" target="_blank" rel="noopener">WhatsApp-এ অর্ডার করুন</a>
    </footer>
  </aside>`);

const drawer = document.getElementById("drawer");
const drawerBg = document.getElementById("drawerBg");
const openCart = () => { drawer.classList.add("open"); drawerBg.classList.add("open"); };
const closeCart = () => { drawer.classList.remove("open"); drawerBg.classList.remove("open"); };
document.getElementById("drawerClose").onclick = closeCart;
drawerBg.onclick = closeCart;
const cartBtn = document.getElementById("cartBtn");
if (cartBtn) cartBtn.addEventListener("click", e => { e.preventDefault(); openCart(); });

function renderCart() {
  const box = document.getElementById("cartItems");
  const countEl = document.getElementById("cartCount");
  const qty = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
  if (countEl) countEl.textContent = qty;
  document.getElementById("cartTotal").textContent = taka(total);

  box.innerHTML = cart.length ? cart.map(i => `
    <div class="cart-row">
      <div><strong>${i.name}</strong><br><small>${taka(i.price)}</small></div>
      <div class="qty">
        <button data-act="dec" data-id="${i.id}">−</button>
        <span> ${i.qty} </span>
        <button data-act="inc" data-id="${i.id}">+</button>
      </div>
      <button class="rm" data-act="rm" data-id="${i.id}">মুছে ফেলুন</button>
    </div>`).join("") : "<p>আপনার কার্ট খালি। একটি পণ্য যোগ করুন।</p>";

  const msg = "Hello, I want to order:\n" +
    cart.map(i => `- ${i.name} x ${i.qty} = ${taka(i.price * i.qty)}`).join("\n") +
    `\nTotal: ${taka(total)}`;
  document.getElementById("cartOrder").href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  save("cart", cart);
  window.dispatchEvent(new Event("inaya-cart"));
}

document.getElementById("cartItems").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const item = cart.find(i => i.id === b.dataset.id); if (!item) return;
  if (b.dataset.act === "inc") item.qty++;
  if (b.dataset.act === "dec") item.qty = Math.max(1, item.qty - 1);
  if (b.dataset.act === "rm") cart = cart.filter(i => i.id !== item.id);
  renderCart();
});

document.addEventListener("click", e => {
  const b = e.target.closest(".add-cart"); if (!b) return;
  const { id, name, price } = b.dataset;
  const found = cart.find(i => i.id === id);
  found ? found.qty++ : cart.push({ id, name, price: Number(price), qty: 1 });
  renderCart();
  toast(name + " কার্টে যোগ হয়েছে");
});

/* ---------- Wishlist (localStorage) ---------- */
function initWish() {
document.querySelectorAll(".wish-btn").forEach(btn => {
  if (btn.dataset.wired) return;
  btn.dataset.wired = "1";
  const id = btn.dataset.id;
  const paint = () => {
    const on = wish.includes(id);
    btn.classList.toggle("active", on);
    btn.textContent = on ? "♥" : "♡";
  };
  paint();
  btn.addEventListener("click", () => {
    wish = wish.includes(id) ? wish.filter(x => x !== id) : [...wish, id];
    save("wish", wish);
    window.dispatchEvent(new Event("inaya-wish"));
    paint();
  });
});
}
initWish();

/* ---------- Search (product card filter) ---------- */
const searchInput = document.getElementById("searchInput");
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    document.querySelectorAll(".product-card").forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? "" : "none";
    });
    if (q) document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" });
  });
}

/* ---------- Mobile hamburger menu ---------- */
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");
if (menuBtn && nav) {
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));
}

/* ---------- Customize Wardrobe: price + WhatsApp quote ---------- */
const cz = id => document.getElementById(id);
function updateQuote() {
  if (!cz("czForm")) return;
  const w = +cz("czW").value || 0, h = +cz("czH").value || 0, d = +cz("czD").value || 0;
  const rate = +cz("czMat").value;            // taka per sq ft (front area)
  const doorMul = +cz("czDoor").value;
  const depthMul = 1 + Math.max(0, d - 2) * 0.1;
  const price = Math.round(w * h * rate * doorMul * depthMul / 100) * 100;

  cz("czTotal").textContent = taka(price);
  const msg = `Hello, I want a custom wardrobe.\nSize: ${w} x ${h} x ${d} ft\n` +
    `Door: ${cz("czDoor").selectedOptions[0].text}\nMaterial: ${cz("czMat").selectedOptions[0].text}\n` +
    `Color: ${cz("czColor").value}\nEstimated price: ${taka(price)}`;
  cz("czQuote").href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}
document.getElementById("czForm")?.addEventListener("input", updateQuote);

/* ---------- Newsletter ---------- */
document.getElementById("newsForm")?.addEventListener("submit", e => {
  e.preventDefault();
  e.target.reset();
  toast("Thanks for subscribing!");
});

/* ---------- Checkout: order admin panel-e jay ---------- */
document.head.insertAdjacentHTML("beforeend", `<style>
#ckBg{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;display:none}
#ckBg.open{display:block}
#ckBox{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,92vw);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:26px;z-index:2001;display:none;box-shadow:0 20px 60px rgba(0,0,0,.3)}
#ckBox.open{display:block}
#ckBox h3{margin:0 0 4px;font-family:Georgia,serif;font-size:22px}
#ckBox label{display:block;font-size:13px;font-weight:600;margin:14px 0 5px}
#ckBox input,#ckBox textarea{width:100%;padding:11px 12px;border:1px solid #e2d3c1;border-radius:10px;font:inherit;box-sizing:border-box}
#ckBox .ckerr{color:#b3261e;font-size:13px;min-height:18px;margin-top:10px}
#ckBox .ckrow{display:flex;gap:10px;margin-top:16px}
#ckBox .ckrow .btn{flex:1;text-align:center}
</style>`);
document.body.insertAdjacentHTML("beforeend", `
<div id="ckBg"></div>
<div id="ckBox" role="dialog" aria-label="Place order">
  <div id="ckForm">
    <h3>আপনার অর্ডার দিন</h3>
    <p id="ckSum" style="color:#6f5f55;font-size:14px;margin:0"></p>
    <label for="ckName">আপনার নাম</label><input id="ckName" autocomplete="name">
    <label for="ckPhone">ফোন নম্বর</label><input id="ckPhone" type="tel" autocomplete="tel">
    <label for="ckAddr">ডেলিভারির ঠিকানা</label><textarea id="ckAddr" rows="3" autocomplete="street-address"></textarea>
    <label for="ckNote">নোট (ঐচ্ছিক)</label><textarea id="ckNote" rows="2"></textarea>
    <p class="ckerr" id="ckErr" role="alert"></p>
    <div class="ckrow"><button class="btn" id="ckSend">অর্ডার নিশ্চিত করুন</button><button class="btn" id="ckCancel" style="background:transparent;color:#b87333">বাতিল</button></div>
  </div>
  <div id="ckDone" style="display:none;text-align:center">
    <h3>ধন্যবাদ!</h3><p id="ckMsg" style="margin:10px 0 0;line-height:1.6"></p>
    <div class="ckrow"><button class="btn" data-copy="${PAY_BN}" style="background:transparent;color:inherit;border:1px solid #b8732e;padding-left:6px;padding-right:6px;font-size:13px">bKash/Nagad কপি</button><button class="btn" data-copy="${PAY_ROCKET}" style="background:transparent;color:inherit;border:1px solid #b8732e;padding-left:6px;padding-right:6px;font-size:13px">Rocket কপি</button><button class="btn" id="ckClose">বন্ধ করুন</button></div>
  </div>
</div>`);
const ck = id => document.getElementById(id);
const ckOpen = o => { ck("ckBg").classList.toggle("open", o); ck("ckBox").classList.toggle("open", o); };
ck("ckBg").onclick = ck("ckCancel").onclick = ck("ckClose").onclick = () => { ckOpen(false); ckItems = null; };
/* Checkout e kon kon product jabe: ckItems thakle shudhu seta (Order now), na hole puro cart */
let ckItems = null;
const ckList = () => ckItems || cart;
function openCheckout() {
  const items = ckList();
  if (!items.length) { toast("আপনার কার্ট খালি"); return; }
  const c = load("cust", {});
  ck("ckName").value = c.name || ""; ck("ckPhone").value = c.phone || ""; ck("ckAddr").value = c.address || ""; ck("ckNote").value = "";
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  ck("ckSum").textContent = ckItems
    ? items[0].name + " × " + items[0].qty + " — মোট " + taka(total)
    : items.reduce((s, i) => s + i.qty, 0) + " টি পণ্য, মোট " + taka(total);
  ck("ckErr").textContent = ""; ck("ckForm").style.display = ""; ck("ckDone").style.display = "none"; ckOpen(true);
}
ck("cartPlace").onclick = () => { ckItems = null; openCheckout(); };
ck("ckSend").onclick = async () => {
  const name = ck("ckName").value.trim(), phone = ck("ckPhone").value.trim(), address = ck("ckAddr").value.trim(), note = ck("ckNote").value.trim();
  if (!name || phone.replace(/\D/g, "").length < 10 || !address) { ck("ckErr").textContent = "অনুগ্রহ করে আপনার নাম, সঠিক ফোন নম্বর এবং ঠিকানা দিন।"; return; }
  const btn = ck("ckSend"); btn.disabled = true; ck("ckErr").textContent = "";
  const list = ckList();
  const order = { name, phone, address, note, total: list.reduce((s, i) => s + i.qty * i.price, 0),
    items: list.map(i => ({ id: String(i.id), name: i.name, price: i.price, qty: i.qty })) };
  try {
    const id = await submitOrder(order);
    save("cust", { name, phone, address });
    if (!ckItems) { cart = []; renderCart(); closeCart(); }
    ckItems = null;
    ck("ckMsg").style.whiteSpace = "pre-line";
    ck("ckMsg").textContent = "আপনার অর্ডার পেয়েছি (#" + id.slice(-6).toUpperCase() + ")। কনফার্ম করতে আমরা শীঘ্রই ফোন করব।\n\nপেমেন্ট করতে:\nbKash / Nagad: " + PAY_BN + "\nRocket: " + PAY_ROCKET.slice(0, 11) + "-" + PAY_ROCKET.slice(11);
    ck("ckForm").style.display = "none"; ck("ckDone").style.display = "";
  } catch (e) { ck("ckErr").textContent = "অর্ডার দেওয়া যায়নি। ইন্টারনেট চেক করুন অথবা WhatsApp-এ অর্ডার করুন।"; }
  btn.disabled = false;
};

/* ---------- Product card theke direct order ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest(".order-now"); if (!b) return;
  const { id, name, price } = b.dataset;
  ckItems = [{ id: String(id), name, price: Number(price), qty: 1 }];   // cart e kichu jog hobe na
  openCheckout();
});

/* ---------- Start ---------- */
renderCart();
updateQuote();
if (/[?&]cart=1(&|$)/.test(location.search)) openCart();

/* ---------- Payment number copy button ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-copy]"); if (!b) return;
  const v = b.getAttribute("data-copy"), old = b.textContent;
  const done = () => { b.textContent = "Copied ✓"; setTimeout(() => { b.textContent = old; }, 1500); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, () => prompt("Copy:", v));
  else prompt("Copy:", v);
});
