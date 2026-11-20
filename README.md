# Inaya's Wardrobe

Furniture & custom wardrobe website for **Inaya's Wardrobe** (Pangsha, Rajbari, Bangladesh).
Static site (HTML/CSS/JS) with a Firebase (Firestore) back end for products, orders, reviews and site content.

Live: https://inayaswardrobe.com

## Pages

| File | Purpose |
|---|---|
| `index.html` | Homepage (hero, categories, products, reviews, payment info) |
| `shop.html` | Product listing, wishlist view (`?wish=1`), cart (`?cart=1`) |
| `product.html` | Single product with photo gallery and "Order now" |
| `gallery.html`, `view3d.html`, `about.html`, `contact.html` | Other pages |
| `Admin-Panel/admin.html` | Admin dashboard (products, orders, gallery, banner, reviews, site info) |

## Scripts & styles

- `layout.js` – shared header/footer for inner pages
- `main.js` – cart, checkout, wishlist, order-now
- `header-ui.js` – account panel, wishlist and cart buttons in the header
- `theme.js` / `theme.css` – day / dark mode
- `products.js` – product data + Firestore loader
- `style.css`, `pages.css` – styles
- `Admin-Panel/firebase-config.js` – Firebase web config
- `Admin-Panel/site-content.js` – editable site text/photos from the admin panel

## SEO

`robots.txt`, `sitemap.xml`, favicons, `og-image.jpg`, JSON-LD in `index.html`.

## Deploy (cPanel)

Upload the files to `public_html` (keep the `Admin-Panel` folder), then hard refresh (Ctrl+Shift+R).
Asset links carry a version (`?v=5`) – bump it when you change a JS/CSS file so browsers reload it.

## Not stored in this repo

Product photos live in Firestore (uploaded from the admin panel). The `images/` folder and the
`payments/` logo files (`bkash.png`, `nagad.png`, `rocket.png`, `ibbl.png`) are uploaded to the server separately.
