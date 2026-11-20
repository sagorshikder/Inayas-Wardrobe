/* products.js : shob product ekhane. Notun product add korte ekta line add koro. */
const PRODUCTS = [
  [1,"Sliding Door Wardrobe","Wardrobe",48500,55000,"Sliding doors with soft-close channels, hanging rail and inner drawers. Made to your room size."],
  [2,"Royal Queen Size Bed","Bedroom",38000,0,"Strong frame with cushioned headboard and under-bed storage."],
  [3,"Modern 3-Seater Sofa","Living Room",32000,36500,"Soft high-density foam seating with a solid wood frame."],
  [4,"6-Seater Dining Set","Dining",42000,0,"Six chairs and a polished dining table. Easy to clean surface."],
  [5,"Hinged 3-Door Wardrobe","Wardrobe",36000,0,"Classic three-door wardrobe with a full-length mirror and shelves."],
  [6,"Storage Cabinet","Storage",18500,0,"Multi-shelf cabinet for books, clothes or kitchen items."],
  [7,"Dressing Table","Bedroom",15500,17000,"Dressing table with mirror and two drawers."],
  [8,"TV Cabinet","Living Room",21000,0,"Wall-friendly TV unit with cable holes and closed storage."],
  [9,"Coffee Table","Living Room",9500,0,"Compact centre table with a durable top."],
  [10,"4-Seater Dining Set","Dining",29000,32000,"Space-saving dining set, good for small flats."],
  [11,"Shoe Rack Cabinet","Storage",8500,0,"Slim shoe cabinet with flip-down doors."],
  [12,"Custom Study Table","Custom Furniture",16000,0,"Built to your size with drawers and a bookshelf."]
].map(([id,name,cat,price,old,desc]) => ({ id:String(id), name, cat, price, old, desc, img:`images/product-${id}.jpg` }));

const fmt = n => "৳ " + Number(n).toLocaleString("en-IN");

function cardHTML(p) {
  return `
  <article class="product-card">
    <div class="product-img">
      ${p.old ? '<span class="badge">Sale</span>' : ''}
      <button class="wish-btn" aria-label="Add to wishlist" data-id="${p.id}">♡</button>
      <a href="product.html?id=${p.id}"><img src="${p.img}" alt="${p.name}" loading="lazy"></a>
    </div>
    <div class="product-info">
      <span class="product-cat">${p.cat}</span>
      <h3><a href="product.html?id=${p.id}" style="color:inherit;text-decoration:none">${p.name}</a></h3>
      <div class="price"><span class="now">${fmt(p.price)}</span>${p.old ? `<span class="old">${fmt(p.old)}</span>` : ''}</div>
      <button class="add-cart" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}">কার্টে যোগ করুন</button>
      <button class="order-now" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" style="margin-top:6px;background:#b87333;color:#fff;border:0;border-radius:10px;padding:10px;width:100%;cursor:pointer;font:inherit">অর্ডার করুন</button>
    </div>
  </article>`;
}

/* ============================================================
   Admin panel (Firebase) theke product ane.
   Admin-e ekta product thakle shudhu admin-er product dekhabe.
   Firebase na paile ba kono product na thakle upore-r sample product thakbe.
   ============================================================ */
const PLACEHOLDER_IMG = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#f1e6d8"/></svg>');
let _adminLoad = null;
function loadAdminProducts() {
  if (_adminLoad) return _adminLoad;
  _adminLoad = (async () => {
    try {
      const cfg = window.FIREBASE_CONFIG;
      if (!cfg || String(cfg.apiKey).startsWith("PASTE")) return;
      const V = "https://www.gstatic.com/firebasejs/10.12.2/";
      const { initializeApp } = await import(V + "firebase-app.js");
      const { getFirestore, collection, getDocs, query, orderBy } = await import(V + "firebase-firestore.js");
      const db = getFirestore(initializeApp(cfg));
      const snap = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc")));
      if (snap.empty) return;
      PRODUCTS.length = 0;
      snap.forEach(d => {
        const p = d.data();
        PRODUCTS.push({
          id: d.id, name: p.name || "Product", cat: p.cat || "Furniture",
          price: Number(p.price) || 0, old: Number(p.old) || 0,
          desc: p.desc || "Quality furniture from Inaya's Wardrobe.",
          imgs: (p.images && p.images.length) ? p.images : [p.image || PLACEHOLDER_IMG],
          img: (p.images && p.images[0]) || p.image || PLACEHOLDER_IMG
        });
      });
    } catch (e) { console.warn("Admin product load hoy ni:", e); }
  })();
  return _adminLoad;
}

/* ============================================================
   Customer order Firebase-e pathay (admin panel-er Orders tab-e dekha jay)
   ============================================================ */
async function submitOrder(order) {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || String(cfg.apiKey).startsWith("PASTE")) throw new Error("Firebase config nei");
  const V = "https://www.gstatic.com/firebasejs/10.12.2/";
  const { initializeApp, getApps } = await import(V + "firebase-app.js");
  const { getFirestore, collection, addDoc, serverTimestamp } = await import(V + "firebase-firestore.js");
  const db = getFirestore(getApps().length ? getApps()[0] : initializeApp(cfg));
  const ref = await addDoc(collection(db, "orders"), Object.assign({}, order, { status: "New", createdAt: serverTimestamp() }));
  return ref.id;
}
