# CraftNest — Current Implementation Status & Feature Audit

This document provides a verified, code-accurate status report of every module in the CraftNest platform. Evaluations are based strictly on code verification from active source files.

---

## 1. Master Implementation Status Matrix

| Module | Implemented | Partially Implemented | Not Implemented | Remarks & Verification Evidence |
| :--- | :---: | :---: | :---: | :--- |
| **Frontend Framework & Tooling** | ✅ | | | React 19.2, Vite 8, Tailwind CSS v4, manual Rollup chunking in `vite.config.js`. Fully operational. |
| **Backend REST API Framework** | ✅ | | | Flask 3.0.3, 14 blueprints registered in `backend/app.py`, Gzip compression, ProxyFix middleware. |
| **Database Architecture** | ✅ | | | Single unified schema on Neon PostgreSQL (dev SQLite fallback), 36 tables, connection pooling configured in `backend/config.py`. |
| **Tenant / Seller Isolation** | ✅ | | | Relational isolation via `seller_id` on `ProductModel` and `OrderItem`. Cross-seller edits blocked with 403 Forbidden. |
| **Unified Authentication (RBAC)**| ✅ | | | Single entry `/api/auth/login` for all roles (Owner, Sub-Owner, Seller, Customer), bcrypt hashing, 24-hr JWT tokens. |
| **Registration & OTP Engine** | ✅ | | | Direct registration disabled; 6-digit OTP verification via Gmail SMTP in `backend/routes/auth.py`. |
| **Brute-Force Security & Lockout**| ✅ | | | 15-minute account lockout after 5 consecutive failed attempts via `user_attempts` table. |
| **Field-Level Data Encryption** | ✅ | | | AES-256-CBC encryption on patron PII (`EncryptedString`, `EncryptedJSON` with `BB_ENC:` prefix). |
| **Storefront & Catalog Browsing** | ✅ | | | Dynamic hero banners, collections, categories, multilingual (EN/HI) titles/descriptions, price filters, search. |
| **Product Lifecycle Management** | ✅ | | | Product creation, updates, deletes, multi-image galleries, Cloudinary uploads, audit logs, and stock histories. |
| **Cart & Wishlist Engine** | ✅ | | | Full multi-item basket, DB synchronization (`Cart`, `CartItem`, `Wishlist`), and "Save for Later" shelf. |
| **Multi-Step Checkout Flow** | ✅ | | | Delivery address selector, encrypted address capture, terms & conditions check, stock decrement with row locks. |
| **Multi-Seller Order Splitting** | ✅ | | | Orders capture items with individual `seller_id` tags. Artisans query `/api/orders/seller` to see only their items. |
| **Order Tracking & Milestones** | ✅ | | | Milestone updates (`Pending` -> `Confirmed` -> `Packed` -> `Shipped` -> `Out for Delivery` -> `Delivered`), carrier & tracking URLs. |
| **Order Return Workflow** | ✅ | | | Return requests (`POST /api/orders/<id>/return`), administrative approval (`PUT /api/admin/orders/<id>/return`) with refund hooks. |
| **Owner Command Center** | ✅ | | | Master dashboard (`/owner/*`): GMV, orders, inventory alerts, seller management, customer suspensions, audit logs. |
| **Artisan Seller Workspace** | ✅ | | | Seller portal (`/seller/*`): workshop stats, private catalog, assigned fulfillment items, profile, and reviews. |
| **Sub-Owner Workspace** | ✅ | | | Operational dashboard (`/sub-owner/*`) with delegated order review and inventory audit capabilities. |
| **Customer Support Ticketing** | ✅ | | | Support tickets (`/api/support`), replies, FAQ accordion, emergency contact links. |
| **Payment Gateway Integration** | | ✅ | | Gateway abstraction (`payment_gateway.py`) and transaction models exist. Mock/COD modes work. Live Razorpay keys require env injection. |
| **Third-Party OAuth (Google/MS)**| | ✅ | | Routes and token exchange flows exist in `backend/routes/auth.py`, but require valid production Client IDs to authenticate. |
| **Automated Monthly Reporting** | ✅ | | | Python `pandas` and `openpyxl` reporting generating `.xlsx` files in `backend/reports/`. |
| **System Maintenance Gatekeeper**| ✅ | | | Global maintenance switch (`/api/maintenance/toggle`) with friendly overlay and admin bypass. |
| **High-Demand Queue Overlay** | ✅ | | | Concurrency queuing toggle (`/api/high-demand/toggle`) with user overlay modal. |
| **Responsive Mobile Layout** | ✅ | | | Mobile bottom navigation dock (`MobileBottomNav.jsx`), collapsible mobile headers, mobile banner support. |

---

## 2. Confirmed Implementation Highlights

1. **Strict Concurrency Safety**:
   - `backend/routes/orders.py` orders product IDs before executing pessimistic row locks (`with_for_update()`), preventing database deadlocks during flash sales.
2. **Transparent Field Encryption**:
   - Patron physical addresses and emails are encrypted at rest without breaking exact-lookup queries due to deterministic IV derivation.
3. **Verified Multi-Vendor Data Integrity**:
   - Validated through `backend/test_database_driven_marketplace.py`: A single order containing items from multiple artisans accurately routes item attributions to their respective workshops while preventing cross-artisan data leakage.

---

## 3. Known Issues & Future Technical Improvements

### Confirmed Technical Constraints
1. **Third-Party OAuth Dependencies**:
   - Google and Microsoft single sign-on buttons in `frontend/src/pages/Login.jsx` depend on active OAuth client credentials in `backend/.env`. In offline or zero-config dev environments, local email/password login should be used.
2. **Email Domain Allowlist**:
   - `backend/utils/helpers.py` restricts user registration to `@gmail.com` and `@outlook.com` domains. While effective against spam, enterprise or custom domain email addresses are rejected unless whitelisted.
3. **Payment Gateway in Development Mode**:
   - In local development mode (`ENVIRONMENT=DEV`), `RAZORPAY_KEY_ID` defaults to `None`, directing orders through cash-on-delivery or direct confirmation flows unless QA/PROD gateway keys are configured.

### Recommended Architectural Improvements
1. **Server-Side Token Revocation List (Redis / DB)**:
   - Introduce a Redis-backed token revocation list to instantaneously invalidate JWT sessions upon user password changes or administrative suspensions.
2. **CDN Edge Caching for Catalog Queries**:
   - Supplement in-memory Python caching with HTTP cache headers (`Cache-Control: public, s-maxage=300`) to enable edge caching at Cloudflare or Vercel.
3. **Automated Webhook Retry Worker**:
   - Implement Celery or RQ background worker queues for asynchronous payment webhook ingestion with exponential backoff retries.
