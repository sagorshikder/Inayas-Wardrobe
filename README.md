# Inaya's Wardrobe

Full-stack furniture & custom wardrobe storefront for **Inaya's Wardrobe** (Pangsha-Rajbari, Bangladesh), built with a **React + TypeScript + Tailwind CSS** frontend, **Node.js (Express)** backend, and **MySQL** database.

Live: https://inayaswardrobe.com

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Three.js (3D Wardrobe Studio)
- **Backend:** Node.js, Express (`server.ts`)
- **Database:** MySQL / MariaDB via `mysql2` (`database.sql` schema for phpMyAdmin; local JSON fallback is allowed only in dev when `NODE_ENV !== 'production'`, and production requires active MySQL credentials)
- **Authentication:** Email & password authentication with `scrypt` password hashing, HMAC-SHA256 bearer sessions (`AUTH_SECRET` min 32 chars in production), and per-IP rate limiting

## Routes

| Route | Purpose |
|---|---|
| `/` | Homepage (hero, category showcase, bestsellers, gallery preview, testimonials, payment methods) |
| `/shop` | Catalog filtering, search (`?q=`), category filters (`?cat=`), and wishlist (`?wish=1`) |
| `/product` | Product detail view with gallery, specifications, and direct checkout (`?id=`) |
| `/view3d` | Interactive 3D wardrobe customizer with dimension/finish controls & instant quote |
| `/gallery` | Completed customer home installations gallery |
| `/about` | Brand story, craft philosophy, and service highlights |
| `/contact` | Showroom info, direct WhatsApp/call links, and custom quote inquiry form |
| `/admin` | Admin Studio Portal (products, orders, inquiries, gallery, reviews, storefront content) |

## Project Structure

- `server.ts` – Express API server (`/api/storefront`, `/api/orders`, `/api/inquiries`, `/api/auth/*`, `/api/admin/*`) and frontend serving
- `database.sql` – MySQL / MariaDB schema for cPanel phpMyAdmin import (`users`, `products`, `orders`, `inquiries`, `gallery`, `reviews`, `site_settings`)
- `src/db/mysql.ts` – `mysql2/promise` connection pool & schema initializer
- `src/db/repository.ts` – Unified data repository (MySQL required in production; local JSON store only in development when DB env vars are unset)
- `src/middleware/auth.ts` – Password hashing (`scrypt`) and bearer token verification
- `src/middleware/rateLimit.ts` – Sliding-window per-IP rate limiter for auth, orders, and inquiries
- `src/utils/catalogPrices.ts` – Authoritative server-side product pricing lookup for order verification
- `src/context/StoreContext.tsx` – Storefront state, cart, wishlist, theme, language (`en` / `bn`), and API integration
- `src/pages/` – React page modules (`HomePage`, `ShopPage`, `ProductDetailPage`, `View3DPage`, `GalleryPage`, `AboutPage`, `ContactPage`, `AdminPage`)
- `.env.example` – Environment variable template

## Local Development

```bash
npm install
npm run dev       # Starts Express + Vite dev server on http://localhost:3000
npm run build     # Builds production frontend bundle into dist/
npm run start:tsx # Runs server.ts safely with tsx on Node 18/20/22
npm run lint      # Runs TypeScript type checking (tsc --noEmit)
```

## Deploy on cPanel (MySQL + Node.js)

1. **Create MySQL Database:** In cPanel → **MySQL® Databases**, create a database and user, then assign the user with **ALL PRIVILEGES**.
2. **Import Schema:** Open **phpMyAdmin**, select your database, and import `database.sql` from the repository root.
3. **Configure Node.js App:** In cPanel → **Setup Node.js App** (note: uploading to `public_html` alone will not run the Express backend):
   - Set **Node.js version** to `22.x` with startup file `server.ts`, **or** on Node `18.x`/`20.x` use `npm run start:tsx` (`tsx server.ts`) via a small JS wrapper or startup command
   - Set **Application mode** to `Production`
   - Add environment variables:
     - `NODE_ENV=production`
     - `DB_HOST=localhost`
     - `DB_PORT=3306`
     - `DB_NAME=<your_cpanel_db_name>`
     - `DB_USER=<your_cpanel_db_user>`
     - `DB_PASSWORD=<your_cpanel_db_password>`
     - `AUTH_SECRET=<random_string_at_least_32_characters>`
     - `ADMIN_EMAIL=<your_owner_admin_email>`
     - `ADMIN_SETUP_TOKEN=<random_setup_secret_at_least_16_chars>` (or `ADMIN_PASSWORD=<strong_password>` to bootstrap automatically)
4. **Install, Build & Start:** Run **NPM Install**, execute `npm run build` in cPanel Terminal to generate `dist/`, and restart the app.
5. **Verify Health & Setup Admin:** Open `/api/health` and confirm `"database":"mysql"`. Then visit `/admin` immediately to register your owner email and password (using `ADMIN_SETUP_TOKEN` if configured), and import the starter catalog into MySQL.

## SEO

`robots.txt`, `sitemap.xml`, favicons, `og-image.jpg`, and JSON-LD structured data in `index.html`.
