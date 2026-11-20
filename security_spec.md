# Security Specification — Inaya's Wardrobe

## 1. Data Invariants
1. Public catalog collections (`products`, `reviews`, `gallery`, `settings`) are readable by storefront visitors, while mutations are strictly limited to verified administrators (`isAdmin()`).
2. Customer PII (`orders`, `inquiries`, `users`) is never publicly listable or readable. Customers may read only their own `orders` (where `resource.data.uid == request.auth.uid`) and their own `users/{uid}` profile; only verified admins (`isAdmin()`) may list all orders/inquiries or mutate order status.
3. Public `create` on `orders` and `inquiries` enforces strict allowlisted keys (`hasAll` + `hasOnly`), initial status (`'New'`), server-time `createdAt == request.time`, numeric bounds, and non-spoofable optional `uid`.
4. Admin identity requires both `request.auth != null` and `request.auth.token.email_verified == true` (for bootstrapped admin `sagorshikder707@gmail.com`) or existence in `/admins/$(request.auth.uid)`.

## 2. Adversarial Test Payloads ("Dirty Dozen")
1. **Unauthenticated Product Create**: Non-admin attempts `create` on `/products/p1` -> `PERMISSION_DENIED`.
2. **Product Shadow Field Injection**: Admin or user sends `featuredSecret: true` in `/products/p1` -> `PERMISSION_DENIED` (`hasOnly` rejects unknown keys).
3. **PII Order Scraping (`list`)**: Unauthenticated or non-admin user calls `getDocs(collection(db, 'orders'))` without matching `uid` -> `PERMISSION_DENIED`.
4. **PII Order Read (`get`)**: User B reads User A's `/orders/orderA` -> `PERMISSION_DENIED`.
5. **Order Status Shortcutting**: Guest creates `/orders/o1` with `status: 'Delivered'` instead of `'New'` -> `PERMISSION_DENIED`.
6. **Order Identity Spoofing**: Signed-in User B creates `/orders/o1` with `uid: 'userA'` -> `PERMISSION_DENIED`.
7. **Negative / Poisoned Order Total**: Customer creates `/orders/o1` with `total: -500` or `items: []` -> `PERMISSION_DENIED`.
8. **Oversized ID Poisoning**: Client writes `/orders/<200-char-id>` -> `PERMISSION_DENIED` (`isValidId`).
9. **Unverified Email Admin Spoof**: Token with `email: 'sagorshikder707@gmail.com'` and `email_verified: false` attempts admin write -> `PERMISSION_DENIED`.
10. **Inquiries Scraping**: Non-admin reads `/inquiries/inq1` -> `PERMISSION_DENIED`.
11. **Timestamp Forgery**: Client creates `/orders/o1` with backdated `createdAt` (`!= request.time`) -> `PERMISSION_DENIED`.
12. **Self-Role Escalation**: Signed-in user writes `/users/u1` with an extra `role: 'admin'` field -> `PERMISSION_DENIED`.
