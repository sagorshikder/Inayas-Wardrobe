# Inaya's Wardrobe — ExonHost cPanel Node.js + MySQL Deploy Guide

## Important: Why Not Static `public_html` Only?
This project uses **React + Express + MySQL** (`app.cjs` / `dist-server/server.mjs`). Simply uploading files to `public_html` without enabling **Setup Node.js App** will NOT connect to MySQL or run `/api/*`.

---

## Step 1: Fix cPanel MySQL User Permissions (Required!)
From your cPanel screenshot:
- Your database name has a **double underscore**: `inayaswa__wardrobe`
- Currently **Privileged Users** is empty on `inayaswa__wardrobe`.

In **cPanel → MySQL® Databases**:
1. Scroll to **MySQL Users → Add New User** and create user `inayaswa_wardrobe` with your chosen password.
2. Scroll to **Add User To Database**:
   - Select User: `inayaswa_wardrobe`
   - Select Database: `inayaswa__wardrobe`
   - Click **Add**, check **ALL PRIVILEGES**, and click **Make Changes**.
3. Your `database.sql` tables (`gallery`, `inquiries`, `orders`, `products`, `reviews`, `site_settings`, `users`) are already imported in phpMyAdmin!

---

## Step 2: Upload & Extract Deployment ZIP
1. Open **cPanel → File Manager**.
2. Create a folder in your home directory (recommended: `/home/inayaswa/inayaswardrobe`, outside `public_html` so `.env` or server files are never exposed).
3. Upload `inayas-wardrobe-cpanel-deploy.zip` into that folder and click **Extract**.

---

## Step 3: Configure Node.js App (cPanel → Setup Node.js App)
Click **Create Application** with these exact settings:
- **Node.js version:** `20.x` or `22.x` (`app.cjs` runs on 18, 20, and 22)
- **Application mode:** `Production`
- **Application root:** `inayaswardrobe`
- **Application URL:** `inayaswardrobe.com`
- **Application startup file:** `app.cjs`

Under **Environment variables**, add:
- `NODE_ENV` = `production`
- `DB_HOST` = `localhost`
- `DB_PORT` = `3306`
- `DB_NAME` = `inayaswa__wardrobe`  *(note the double underscore `__`!)*
- `DB_USER` = `inayaswa_wardrobe`
- `DB_PASSWORD` = *(the MySQL user password you set in Step 1)*
- `AUTH_SECRET` = *(generate a random 32+ character string)*
- `ADMIN_SETUP_TOKEN` = *(generate a random 16+ character setup secret)*

Then:
1. Click **Save**, then click **Run NPM Install** (frontend `dist/` and server `dist-server/` are already pre-built in the ZIP!).
2. Click **Restart**.

---

## Step 4: Verify Live Connection & Setup Admin
1. Open `https://inayaswardrobe.com/api/health` — you must see:
   `{"ok":true,"service":"inayas-wardrobe-api","database":"mysql"}`
2. Open `https://inayaswardrobe.com/admin`, enter your email, a strong 8+ char password, and your `ADMIN_SETUP_TOKEN`, then click **Import Starter Catalog** inside Admin Studio.
