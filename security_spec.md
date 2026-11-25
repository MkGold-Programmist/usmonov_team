# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Global Default Deny**: Any path not explicitly matched in `/databases/{database}/documents` is strictly denied (`allow read, write: if false;`).
2. **ID Poisoning Guard**: Every single-document path variable (`productId`, `orderId`, `userId`, `enrollmentId`, `adminId`) must satisfy `isValidId(id)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
3. **Verified Identity & Admin Gate**:
   - Standard user writes require `isVerifiedUser()` (`request.auth != null && request.auth.token.email_verified == true`).
   - Admin privileges require `isAdmin()`, which checks verified bootstrapped admin email (`tvhisense15112025@gmail.com` with `email_verified == true`) OR existence of `/admins/$(request.auth.uid)`.
4. **Strict Schema & Anti-Update-Gap**:
   - Every `create` and `update` operation must pass `isValid[Entity](incoming())` checking exact key sets (`hasAll` + `hasOnly`), field types, string `.size()` bounds, numeric bounds, and enum sets.
   - Every `update` operation must use the Action-Based Update Pattern with `incoming().diff(existing()).affectedKeys().hasOnly(...)` and preserve immutable fields (`createdAt`, `userId`, `uid`).
5. **Temporal Integrity**:
   - `createdAt == request.time` on `create`.
   - `updatedAt == request.time` on `create` and `update`.
   - `createdAt == existing().createdAt` on `update`.
6. **Terminal State Locking**:
   - Orders and Enrollments in terminal states (`status in ['completed', 'cancelled']`) cannot be updated by non-admin users.
7. **PII Isolation & Query Enforcer**:
   - `/users/{userId}` contains PII (`email`, `shippingAddress`, `phone`) and is strictly readable only by the document owner (`request.auth.uid == userId`) or `isAdmin()`. `allow list` on `/users` is denied for non-admins.
   - `/orders` and `/enrollments` enforce `resource.data.userId == request.auth.uid || isAdmin()` on both `get` and `list` so clients cannot scrape other users' orders or enrollments.

---

## 2. The "Dirty Dozen" Payloads (Adversarial Test Suite)

1. **Payload 1 (Shadow Field Injection on Product)**: Valid `Product` payload + `"isDiscounted": true`. Rejected by `data.keys().hasOnly(...)`.
2. **Payload 2 (Identity Spoofing on Order Creation)**: Authenticated user `user_A` attempts to create an `/orders/ord_1` with `userId: "user_B"`. Rejected by `incoming().userId == request.auth.uid`.
3. **Payload 3 (Unverified Email Admin Spoof)**: Token has `email: "tvhisense15112025@gmail.com"` but `email_verified: false`. Rejected by `request.auth.token.email_verified == true`.
4. **Payload 4 (PII Blanket Read on `/users/{userId}`)**: Authenticated `user_A` attempts `get` on `/users/user_B`. Rejected by `isOwner(userId) || isAdmin()`.
5. **Payload 5 (Cross-Tenant Query Scraping on `/orders`)**: Authenticated `user_A` runs an unconstrained `list` query on `/orders` where `resource.data.userId == "user_B"`. Rejected by `resource.data.userId == request.auth.uid`.
6. **Payload 6 (Terminal State Mutation on `/orders/{orderId}`)**: Owner attempts to update an order whose `existing().status == "completed"`. Rejected by terminal state lock `!(existing().status in ['completed', 'cancelled'])`.
7. **Payload 7 (Immutable Field Tampering on Update)**: Owner updates `/orders/{orderId}` and modifies `createdAt` or `totalAmount`. Rejected by `incoming().createdAt == existing().createdAt` and `affectedKeys().hasOnly(['status', 'updatedAt'])`.
8. **Payload 8 (Denial-of-Wallet Oversized String)**: Attacker sends a 10,000-character string in `Product.description` (limit 600). Rejected by `data.description.size() <= 600`.
9. **Payload 9 (ID Poisoning Attack)**: Attacker attempts to create `/products/invalid$id!with/slashes` or >128 chars. Rejected by `isValidId(productId)`.
10. **Payload 10 (Negative Price / Negative Stock Injection)**: Attacker creates a product with `price: -50` or `Order` with `totalAmount: -100`. Rejected by `data.price >= 0` and `data.totalAmount >= 0`.
11. **Payload 11 (Forged Client Timestamp)**: Client sends a past/future `createdAt` instead of `request.time`. Rejected by `data.createdAt == request.time`.
12. **Payload 12 (Self-Privilege Escalation on `/admins/{adminId}`)**: Non-admin user attempts to write to `/admins/user_A`. Rejected because only `isAdmin()` can write to `/admins`.
