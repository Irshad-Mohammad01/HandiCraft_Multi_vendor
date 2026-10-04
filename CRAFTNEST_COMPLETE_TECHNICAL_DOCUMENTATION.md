# CRAFTNEST — COMPLETE TECHNICAL DOCUMENTATION

> **Comprehensive Architecture, Database Schema, API Reference, Security, and Setup Guide**  
> *Project Version: 1.0.0 (Production Verified)*  
> *Operating System Target: Linux / Cross-Platform*  
> *Database Backend: Neon Serverless PostgreSQL / Embedded SQLite Fallback*  
> *Application Stack: React 19 + Vite 8 + Tailwind CSS v4 | Python 3 + Flask 3.0 + SQLAlchemy 3.1*  

---

# TABLE OF CONTENTS
1. [Project Overview & Objectives](#1-project-overview--objectives)
2. [Complete Technology Stack & Dependencies](#2-complete-technology-stack--dependencies)
3. [Full Project Directory Structure & File Map](#3-full-project-directory-structure--file-map)
4. [User Roles, RBAC & Authentication Architecture](#4-user-roles-rbac--authentication-architecture)
5. [Database Architecture, Schema & ER Diagram](#5-database-architecture-schema--er-diagram)
6. [Product Management System](#6-product-management-system)
7. [Order Management & Multi-Seller Fulfillment System](#7-order-management--multi-seller-fulfillment-system)
8. [Frontend Architecture, Pages & UI Components](#8-frontend-architecture-pages--ui-components)
9. [Backend Server Architecture, Middlewares & Concurrency](#9-backend-server-architecture-middlewares--concurrency)
10. [Complete Application Data Flow & Mermaid Workflows](#10-complete-application-data-flow--mermaid-workflows)
11. [Security Architecture & Field-Level Data Encryption](#11-security-architecture--field-level-data-encryption)
12. [Environment Variables Reference](#12-environment-variables-reference)
13. [Current Implementation Status & Feature Audit](#13-current-implementation-status--feature-audit)
14. [Known Issues & Future Engineering Roadmap](#14-known-issues--future-engineering-roadmap)
15. [Local Development & Production Setup Guide](#15-local-development--production-setup-guide)

---

# 1. PROJECT OVERVIEW & OBJECTIVES

## 1.1 What is CraftNest?
**CraftNest** is an enterprise-grade multi-role digital marketplace dedicated to authentic regional handicrafts, artisan-crafted cultural creations, and heritage goods across India (including Jaipur Blue Pottery, Tanjore 24K Gold Foil Paintings, Brasswares, Teakwood Sculptures, and Fine Jewelry).

The platform bridges the commercial and technical gap between independent regional artisans and discerning global craft patrons by providing a unified digital storefront backed by robust seller management, order tracking, real-time inventory synchronization, multilingual presentation (English/Hindi), and enterprise-grade data protection.

## 1.2 Problems Solved by CraftNest
1. **Middleman Exploitation**: Traditional master craftspeople often sell to layers of wholesalers at fractional margins. CraftNest gives artisans direct access to end-customers with transparent order and revenue tracking.
2. **Technical Complexity for Artisans**: Craft workshops often lack tech literacy. CraftNest gives them a clean, focused portal (`/seller/dashboard`) to manage inventory and fulfillment without complex multi-vendor bloat.
3. **Customer PII Exposure**: Many craft sites store patron phone numbers and addresses in plaintext. CraftNest implements deterministic AES-256-CBC field-level database encryption for sensitive PII.
4. **Disjointed Multi-Vendor Orders**: When a customer buys items originating from multiple distinct artisan workshops in a single checkout, CraftNest atomically splits line items, tagging each item with the artisan's `seller_id`, enabling isolated workshop fulfillment.
5. **Lack of Governance for Marketplace Owners**: CraftNest gives super-administrators (Main Owners) complete supervisory visibility over all products, sellers, transactions, stock adjustments, and audit logs.

## 1.3 Core Objectives
- **Artisan Empowerment**: Provide verified craftspeople with tools to list goods, track inventory depletion, and monitor workshop earnings.
- **Patron Trust**: Deliver a high-aesthetic buying experience with verified artisan provenance, milestone tracking, and responsive support.
- **Relational Tenant Isolation**: Enforce strict workshop data isolation through relational foreign keys without the operational cost of running dozens of separate database clusters.
- **Single-Door Authentication**: Unified `/login` gateway where backend credentials determine role hierarchy and redirect users directly to their designated workspace.
- **Concurrency & Deadlock Prevention**: Deterministic lock acquisition order ensures flash-sales never deadlock database connections.

## 1.4 Target Personas
- **Main Owner (Super Administrator)**: Full catalog, artisan onboarding, global financials, system maintenance toggles, and audit log inspection.
- **Sub-Owner (Operations Manager)**: Delegated order fulfillment monitoring, stock replenishment audits, and artisan communication.
- **Artisan Seller (Craftsperson / Guild Master)**: Creation and editing of own workshop listings, stock adjustment, and packing of assigned order items.
- **Customer (Patron / Buyer)**: Browsing in English or Hindi, cart and wishlist management, checkout, milestone order tracking, and support ticketing.

---

# 2. COMPLETE TECHNOLOGY STACK & DEPENDENCIES

## 2.1 Frontend Technology Stack
- **Core Framework**: React `19.2.6` (React 19 Concurrent Root).
- **DOM Engine**: React DOM `19.2.6`.
- **Build System**: Vite `8.0.12` (ESM build runner with custom vendor chunking).
- **Language**: JavaScript (ES2023+ / JSX modules).
- **Styling Framework**: Tailwind CSS `^4.3.0` (`@tailwindcss/vite` v4 plugin) + Autoprefixer `^10.5.0` + PostCSS `^8.5.15`.
- **Custom Design System**: Bespoke Vanilla CSS tokens in `index.css` & `App.css` (warm cream backgrounds `#FFF9F3`, terracotta `#A63D40`, deep charcoal `#2B2523`, and serif headings).
- **Icon Library**: `lucide-react` `^1.16.0`.
- **Client Routing**: `react-router-dom` `^7.15.1`.
- **Motion & Transitions**: `framer-motion` `^12.40.0` and `gsap` `^3.15.0`.
- **HTTP Client**: `axios` `^1.16.1` with centralized interceptors.
- **State Management**: React Context API (`AuthContext`, `CartContext`, `WishlistContext`, `MaintenanceContext`, `HighDemandContext`).
- **Code Splitting (Rollup)**: Vendor-split manual chunks: `vendor-react`, `vendor-lucide`, `vendor-framer-motion`, `vendor-axios`, `vendor-libs`.

## 2.2 Backend Technology Stack
- **Language Runtime**: Python `3.10+`.
- **Web Framework**: Flask `3.0.3`.
- **WSGI Middleware**: Werkzeug `ProxyFix` for cloud reverse proxies.
- **API Architecture**: RESTful Flask Blueprints (14 modular blueprints).
- **ORM**: `Flask-SQLAlchemy` `3.1.1` (SQLAlchemy 2.x engine).
- **Migrations Engine**: `Flask-Migrate` `4.1.0` (Alembic integration).
- **Database Drivers**: `psycopg2-binary` (PostgreSQL) + `PyMySQL` `1.2.0` (MySQL fallback) + `sqlite3` (built-in).
- **Tokens & Session**: `PyJWT` `2.8.0` (HS256 24-hour bearer tokens).
- **Password Security**: `bcrypt` `4.1.3` (salted hashing).
- **Field-Level Encryption**: `cryptography` `48.0.0` (AES-256-CBC cipher with deterministic IV).
- **CORS Handling**: `Flask-Cors` `4.0.1` (strict origin checking with credentials).
- **Media CDN**: `cloudinary` `1.40.0` REST SDK + local fallback storage.
- **Email Gateway**: `flask_mail` & `smtplib` (Gmail SMTP `smtp.gmail.com:587` with TLS).
- **Data Analytics & Reporting**: `pandas`, `openpyxl` (Excel `.xlsx` generation), `matplotlib`, `pytz` (IST Asia/Kolkata).
- **Production Server**: `gunicorn` `22.0.0`.
- **Environment Management**: `python-dotenv` `1.0.1`.

## 2.3 Database & Hosting
- **Production Database**: Neon Serverless PostgreSQL (`neon.tech`) with mandatory SSL (`sslmode=require`).
- **Local Dev Database**: Embedded SQLite 3 (`backend/dev.db`).
- **Frontend Hosting**: Vercel SPA (configured via `vercel.json` rewrites) or Render Static.
- **Backend Hosting**: Render Web Service, Oracle Cloud, or Linux VPS running Gunicorn.

---

# 3. FULL PROJECT DIRECTORY STRUCTURE & FILE MAP

```
HandiCraft/
├── backend/
│   ├── app.py                            # Flask app factory, blueprint registration & error handlers
│   ├── config.py                         # Environment detection, Neon URI, SMTP & feature flags
│   ├── cors.py                           # Dynamic exact-origin CORS validator
│   ├── extensions.py                     # Initialized db, migrate, and mail extensions
│   ├── requirements.txt                  # Locked Python packages
│   ├── setup_owner.py                    # Bootstrap utility to seed Main Owner superadmin
│   ├── seed_craftnest.py                 # Initial catalog, category & banner seeder
│   ├── test_database_driven_marketplace.py# 12-step multi-role integrity verification suite
│   ├── test_craftnest_e2e.py             # Full API regression suite
│   ├── dev.db                            # SQLite development fallback database
│   ├── middleware/
│   │   ├── auth.py                       # token_required, admin_required, owner_required, seller_required
│   │   └── maintenance.py                # Maintenance mode gatekeeper middleware
│   ├── models/                           # Declarative SQLAlchemy models (36 tables)
│   │   ├── __init__.py                   # Model registry index
│   │   ├── admin.py                      # AdminModel, AdminAuditLog, AdminNotification
│   │   ├── banner.py                     # BannerModel (Homepage promotional carousels)
│   │   ├── category.py                   # Category model
│   │   ├── category_banner.py            # CategoryBanner (Category header graphics)
│   │   ├── collection.py                 # CollectionModel (Curated groupings)
│   │   ├── collection_banner.py          # CollectionBanner (Themed collection headers)
│   │   ├── coupon.py                     # CouponModel (Percentage and flat discount codes)
│   │   ├── email_log.py                  # EmailLog (SMTP outbound dispatch records)
│   │   ├── lookbook.py                   # LookbookModel (Editorial visual showcase)
│   │   ├── notification.py               # NotificationModel (In-app notifications)
│   │   ├── order.py                      # OrderModel, OrderItem (Multi-seller orders)
│   │   ├── otp_verification.py           # OTPVerification (Transient 6-digit OTP codes)
│   │   ├── product.py                    # ProductModel, ProductImageModel, Variants, BuyRequests, StockHistory
│   │   ├── review.py                     # ReviewModel (Customer product reviews)
│   │   ├── settings.py                   # SiteSettingModel (Persistent key-value config)
│   │   ├── support.py                    # SupportModel, SupportReplyModel, FAQModel, SupportLinkModel
│   │   ├── transaction.py                # TransactionModel (Financial transaction ledger)
│   │   ├── user.py                       # UserModel, DeliveryAddress, Cart, CartItem, Wishlist
│   │   └── user_attempt.py               # UserAttempt (Brute-force security & 15-minute lockouts)
│   ├── routes/                           # 14 REST API Blueprints
│   │   ├── admin.py                      # /api/admin: statistics, seller management, audit logs
│   │   ├── auth.py                       # /api/auth: login, OTP, registration, address management
│   │   ├── banners.py                    # /api/banners: hero banner management
│   │   ├── category_banners.py           # /api/category-banners: category banner CRUD
│   │   ├── collection_banners.py         # /api/collection-banners: collection banner CRUD
│   │   ├── collections.py                # /api/collections: curated collection management
│   │   ├── coupons.py                    # /api/coupons: discount coupon validation
│   │   ├── high_demand.py                # /api/high-demand: high demand queue toggles
│   │   ├── lookbook.py                   # /api/lookbook: editorial lookbook CRUD
│   │   ├── maintenance.py                # /api/maintenance: maintenance mode switches
│   │   ├── orders.py                     # /api/orders: checkout, customer orders, seller orders
│   │   ├── payments.py                   # /api/admin/payments: transactions, refunds, gateway audit
│   │   ├── products.py                   # /api/products: catalog exploration, seller creation, stock
│   │   └── support.py                    # /api/support: ticketing, FAQs, live contact links
│   ├── static/uploads/                   # Local media storage fallback
│   └── utils/
│       ├── audit.py                      # Centralized administrator action logging
│       ├── cache.py                      # In-memory dictionary cache with TTL
│       ├── email_service.py              # Gmail SMTP transmission routines
│       ├── helpers.py                    # OTP generation, email sanitization
│       ├── mobile_otp.py                 # Mobile SMS dispatcher interface
│       ├── pagination.py                 # Paginator query helper
│       ├── payment_gateway.py            # Gateway abstraction interface (Razorpay / COD)
│       ├── report_automation.py          # Automated Excel report compiler (Pandas & OpenPyXL)
│       ├── security.py                   # AES-256-CBC EncryptedString & EncryptedJSON decorators
│       ├── timezone.py                   # India Standard Time (IST / UTC+05:30) helpers
│       └── uploads.py                    # Cloudinary media streaming & local disk storage
├── frontend/
│   ├── index.html                        # SPA HTML5 template
│   ├── package.json                      # Frontend dependencies & scripts
│   ├── vercel.json                       # Vercel SPA routing rewrite rules
│   ├── vite.config.js                    # Vite configuration & Rollup chunking
│   ├── public/                           # Logos, static PNGs, MP4 showcase videos
│   └── src/
│       ├── App.jsx                       # Main client router, layout switch & route declarations
│       ├── App.css / index.css           # Global design tokens, typography, custom scrollbars
│       ├── main.jsx                      # React 19 entrypoint mounting App with Contexts
│       ├── api/                          # Axios API clients
│       │   ├── client.js                 # Axios instance with auth token & 401 interceptors
│       │   ├── admin.js                  # Administrative API service calls
│       │   ├── auth.js                   # Authentication & profile API calls
│       │   ├── banners.js                # Banner management API calls
│       │   ├── cart.js                   # Shopping cart synchronization
│       │   ├── coupons.js                # Coupon validation
│       │   ├── orders.js                 # Orders, tracking, and returns
│       │   └── products.js               # Products, categories, and reviews
│       ├── components/
│       │   ├── common/                   # Shared UI building blocks
│       │   │   ├── Badge.jsx             # Status and count badge indicator
│       │   │   ├── Button.jsx            # Themed button (primary, secondary, outline, danger)
│       │   │   ├── EmptyState.jsx        # Illustrated zero-data view
│       │   │   ├── ErrorBoundary.jsx     # Global React error trap preventing white-screens
│       │   │   ├── Footer.jsx            # Main storefront footer
│       │   │   ├── LoadingSpinner.jsx    # Accessible animated spinner
│       │   │   ├── MobileBottomNav.jsx   # Fixed smartphone bottom dock
│       │   │   ├── Navbar.jsx            # Responsive header with search, language & cart badge
│       │   │   ├── ProductCard.jsx       # Artisan listing card with pricing & discount
│       │   │   └── ProtectedRoute.jsx    # Client-side RBAC authorization guard
│       │   ├── admin/                    # Owner dashboard modular tabs & modals
│       │   │   ├── AnalyticsTab.jsx      # Financial GMV charts and performance metrics
│       │   │   ├── OrderManagementTab.jsx# Order status update and tracking details table
│       │   │   ├── ProductManagementTab.jsx # Product catalog table with stock quick-edits
│       │   │   ├── SupportTicketsTab.jsx # Customer ticket inbox and reply interface
│       │   │   ├── TrackingInfoModal.jsx # Shipment tracking number & URL injector modal
│       │   │   └── UserManagementTab.jsx # Patron and seller status, block/unblock control
│       │   └── dashboard/                # Reusable dashboard widgets
│       │       ├── DashboardLayout.jsx   # Sidebar and topbar layout frame
│       │       └── MetricCard.jsx        # KPI stat card with icon & trends
│       ├── context/                      # React Context providers
│       │   ├── AuthContext.jsx           # Master auth state, user identity, login, logout, roles
│       │   ├── CartContext.jsx           # Basket items, totals, discount calculations
│       │   ├── WishlistContext.jsx       # Saved artisan listings state
│       │   ├── MaintenanceContext.jsx    # Real-time maintenance status subscriber
│       │   └── HighDemandContext.jsx     # High-demand traffic overlay controller
│       └── pages/                        # View pages
│           ├── Home.jsx                  # Storefront landing page
│           ├── Products.jsx              # Filterable catalog & search page
│           ├── ProductDetails.jsx        # Product detail page, specs, reviews
│           ├── Cart.jsx                  # Basket review, coupon input, save for later
│           ├── Checkout.jsx              # Multi-step checkout with address selection
│           ├── OrderSuccess.jsx          # Order confirmation screen with tracking ID
│           ├── OrderDetails.jsx          # Vertical milestone timeline & return submission
│           ├── Orders.jsx                # Customer order history list
│           ├── Wishlist.jsx              # Customer wishlist grid
│           ├── Account.jsx               # Patron account hub (profile, addresses, settings)
│           ├── Login.jsx                 # Single unified login page for all roles
│           ├── Register.jsx              # Registration page triggering OTP email
│           ├── VerifyOtp.jsx             # 6-digit OTP verification interface
│           ├── ForgotPassword.jsx        # Password reset initiation interface
│           ├── ResetPassword.jsx         # New password submission interface
│           ├── Contact.jsx               # Customer support ticket submission
│           ├── FAQ.jsx                   # Categorized FAQs
│           ├── NotFound.jsx              # Friendly 404 page
│           ├── owner/                    # Main Owner administrative pages
│           │   ├── OwnerDashboard.jsx    # Superadmin KPI dashboard & revenue metrics
│           │   ├── OwnerProducts.jsx     # Full catalog management (Owner & Seller items)
│           │   ├── OwnerCategories.jsx   # Category creation & visual icon assignment
│           │   ├── OwnerOrders.jsx       # Marketplace-wide order management
│           │   ├── OwnerCustomers.jsx    # Patron list & suspension (block/unblock) controls
│           │   ├── OwnerSellers.jsx      # Artisan management, onboarding, performance
│           │   ├── OwnerPayments.jsx     # Payment transactions & refund triggers
│           │   ├── OwnerInventory.jsx    # Global stock replenishment & low-stock alerts
│           │   ├── OwnerReports.jsx      # Monthly financial reports & Excel exports
│           │   ├── OwnerControl.jsx      # Emergency toggles: maintenance & high demand
│           │   ├── OwnerSettings.jsx     # System configuration & SMTP testing
│           │   └── SellerDetails.jsx     # Deep audit of a specific artisan's inventory & sales
│           ├── sub-owner/
│           │   └── SubOwnerDashboard.jsx # Delegated operations portal
│           └── seller/
│               ├── SellerDashboard.jsx   # Artisan portal: workshop stats & private listings
│               ├── SellerProfile.jsx     # Artisan public profile & craft lineage
│               ├── SellerReviews.jsx     # Direct reviews received on artisan's products
│               └── SellerSettings.jsx    # Artisan workshop preferences
└── docs/                                 # Technical documentation suite
```

---

# 4. USER ROLES, RBAC & AUTHENTICATION ARCHITECTURE

## 4.1 Roles & Permission Matrix

| Operation | Main Owner (`owner`/`admin`) | Sub-Owner (`sub_owner`) | Artisan Seller (`seller`) | Customer (`customer`) |
| :--- | :--- | :--- | :--- | :--- |
| **System Entry Point** | `/login` (Unified) | `/login` (Unified) | `/login` (Unified) | `/login` (Unified) |
| **Primary Dashboard** | `/owner/dashboard` | `/sub-owner/dashboard` | `/seller/dashboard` | `/account` |
| **Product Creation** | Can create Owner goods or assign to any Seller | View-only review | Can only create items for own workshop | No product creation rights |
| **Product Mutation** | Can edit/delete any product on platform | View-only review | Can only edit/delete items where `seller_id == user.id` | None |
| **Order Item Access** | Can inspect all marketplace items (`/api/orders/all`)| Can inspect all marketplace items | Can only inspect items where `order_items.seller_id == user.id` | Can only inspect orders placed by self |
| **Order Status Update**| Full milestone updates & tracking injection | Operational viewing & packing assist | View assigned items; packing coordination | Cannot update order statuses |
| **Artisan Management** | Full onboarding, editing, blocking | Supervised viewing | Cannot access other artisans | None |
| **Financial Ledgers** | Full access to transactions, GMV, and refunds | View operational metrics | Views own sales totals & payouts | Views personal payment receipts |
| **Emergency Switches** | Can toggle Maintenance Mode & High-Demand | Cannot toggle | Cannot toggle | Affected by maintenance mode |

## 4.2 Unified Login & Redirection Flow
All users authenticate at the common login page (`frontend/src/pages/Login.jsx`). The client issues a single request: `POST /api/auth/login`.

1. **Identity Resolution**: The backend tests the identifier against `AdminModel.username` and `UserModel.email`/`UserModel.phone`.
2. **Account Lockout Check**: The backend verifies `user_attempts.blocked_until`. If locked, it immediately rejects with `429 Too Many Requests`.
3. **Bcrypt Verification**: Evaluates password hash using `bcrypt.checkpw()`.
   - On failure: Increments `user_attempts.failed_login_attempts`. Upon 5 failures, locks account for 15 minutes.
   - On success: Resets failures to 0, updates `last_login`, and signs a 24-hour JWT token containing `user_id`, `role`, and `is_admin`.
4. **Client Routing**:
   - `role === 'owner' || role === 'admin'` -> Navigates to `/owner/dashboard`.
   - `role === 'sub_owner'` -> Navigates to `/sub-owner/dashboard`.
   - `role === 'seller'` -> Navigates to `/seller/dashboard`.
   - `role === 'customer'` -> Navigates to `/account` (or original checkout target).

## 4.3 Backend Authorization Middleware (`backend/middleware/auth.py`)
- `@token_required`: Validates token signature, expiration, and extracts active user.
- `@admin_required`: Restricts endpoint to Main Owners or Admins.
- `@owner_required`: Strictly requires Super Owner privileges.
- `@seller_required`: Restricts endpoint to Artisan Sellers or supervising Owners.

## 4.4 Client Route Guard (`frontend/src/components/common/ProtectedRoute.jsx`)
Inspects `AuthContext`:
- If `loading == true`: Displays `<LoadingSpinner label="Authenticating session..." />`.
- If `isAuthenticated == false`: Redirects to `/login` with `state: { from: location }`.
- If `allowedRoles` specified and user's role is not in the list: Redirects user to their authorized home portal.

---

# 5. DATABASE ARCHITECTURE, SCHEMA & ER DIAGRAM

## 5.1 Single Unified Database Architecture
> [!IMPORTANT]
> **Definitive Finding**: CraftNest uses a **single unified database** on Neon PostgreSQL. There are **no separate databases** for Owner vs. Sellers. Relational isolation is enforced through `seller_id` foreign keys on `products` and `order_items` combined with query filters in controllers.

## 5.2 Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    users ||--o{ delivery_addresses : "has many"
    users ||--o| carts : "has one"
    users ||--o{ wishlists : "has many"
    users ||--o{ orders : "places many"
    users ||--o{ reviews : "writes many"
    users ||--o{ products : "sells many (seller_id)"
    users ||--o{ order_items : "fulfills many (seller_id)"
    users ||--o{ support_messages : "submits many"
    users ||--o{ user_attempts : "has one lock record"
    users ||--o{ user_status_audit_logs : "audited by"
    users ||--o{ buy_requests : "requests"

    categories ||--o{ products : "contains many"
    categories ||--o| category_banners : "has one banner"

    collections ||--o{ products : "groups many"
    collections ||--o| collection_banners : "has one banner"

    carts ||--o{ cart_items : "contains"
    products ||--o{ cart_items : "referenced in"
    products ||--o{ wishlists : "referenced in"
    products ||--o{ product_images : "has ordered media"
    products ||--o{ product_variants : "has variants"
    products ||--o{ stock_histories : "logs adjustments"
    products ||--o{ product_audit_logs : "logs audits"
    products ||--o{ reviews : "receives"
    products ||--o{ order_items : "ordered as"

    orders ||--o{ order_items : "consists of"
    orders ||--o{ transactions : "paid via"
    users ||--o{ transactions : "initiated by"

    support_messages ||--o{ support_replies : "contains conversation"

    admins ||--o{ admin_audit_logs : "records actions"
    admins ||--o{ admin_notifications : "receives"
```

## 5.3 Core Database Tables (36 Total Tables)

### Table 1: `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PK, Auto Increment | Unique internal user ID. |
| `full_name` | `EncryptedString(255)` | NOT NULL | User name (AES-256 encrypted at rest). |
| `email` | `EncryptedString(255)` | UNIQUE, NOT NULL, Index | Email address (AES-256 with deterministic IV). |
| `password_hash` | `VARCHAR(255)` | NOT NULL | Salted bcrypt hash. |
| `phone` | `EncryptedString(255)` | NULL | Mobile phone (AES-256 encrypted at rest). |
| `notifications` | `JSON` | Default `[]` | In-app user notifications array. |
| `is_blocked` | `BOOLEAN` | Default `FALSE` | Administrative account block flag. |
| `is_admin` | `BOOLEAN` | Default `FALSE` | Administrator boolean flag. |
| `role` | `VARCHAR(50)` | Default `'customer'` | Role: `'customer'`, `'seller'`, `'owner'`, `'sub_owner'`, `'admin'`. |
| `email_verified` | `BOOLEAN` | Default `FALSE` | Email OTP verification status. |
| `created_at` | `DATETIME` | Default `IST Now` | Registration timestamp. |
| `updated_at` | `DATETIME` | Auto-update `IST Now` | Profile update timestamp. |
| `microsoft_id` | `VARCHAR(100)` | UNIQUE, NULL | External Microsoft OAuth subject ID. |
| `provider` | `VARCHAR(50)` | Default `'local'` | Account provider (`'local'`, `'google'`, `'microsoft'`). |
| `provider_id` | `VARCHAR(255)` | UNIQUE, NULL | External OAuth identifier. |
| `last_login` | `DATETIME` | NULL | Timestamp of last successful login. |
| `preferred_language`| `VARCHAR(10)` | NULL | Language preference (`'en'`, `'hi'`). |
| `first_login` | `BOOLEAN` | Default `TRUE` | Triggers welcome/language setup modals. |

### Table 2: `delivery_addresses`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PK, Auto Increment | Address identifier. |
| `user_id` | `INTEGER` | FK `users.id` (CASCADE), NOT NULL | Owning patron ID. |
| `house_number` | `EncryptedString(255)` | Default `""` | House/flat number (AES-256 encrypted). |
| `building_name`| `EncryptedString(255)` | Default `""` | Building/tower name (AES-256 encrypted). |
| `street` | `EncryptedString(500)` | Default `""` | Street or road (AES-256 encrypted). |
| `area` | `EncryptedString(500)` | Default `""` | Locality or sector (AES-256 encrypted). |
| `landmark` | `EncryptedString(500)` | Default `""` | Landmark (AES-256 encrypted). |
| `city` | `EncryptedString(255)` | Default `""` | City (AES-256 encrypted). |
| `state` | `EncryptedString(255)` | Default `""` | State/province (AES-256 encrypted). |
| `pincode` | `EncryptedString(255)` | Default `""` | Postal PIN code (AES-256 encrypted). |
| `address_type` | `VARCHAR(50)` | Default `'Home'` | Label (`'Home'`, `'Work'`, `'Other'`). |
| `alternate_mobile_number`| `VARCHAR(15)` | NULL | Backup contact number. |
| `country` | `EncryptedString(255)` | Default `'India'` | Country name. |
| `is_default` | `BOOLEAN` | Default `FALSE` | Primary checkout address flag. |
| `created_at` | `DATETIME` | Default `IST Now` | Creation timestamp. |

### Table 3: `products`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PK, Auto Increment | Product primary key. |
| `name` | `VARCHAR(255)` | NOT NULL | Default product title. |
| `price` | `NUMERIC(10, 2)` | NOT NULL | Base listing price in INR. |
| `discount` | `NUMERIC(5, 2)` | Default `0.00` | Percentage discount (0.00 to 100.00). |
| `description` | `TEXT` | NULL | Product narrative description. |
| `images` | `JSON` | NULL | Array of image URLs. |
| `stock` | `INTEGER` | Default `0` | Available stock inventory. |
| `category_id` | `INTEGER` | FK `categories.id` (SET NULL) | Associated category ID. |
| **`seller_id`** | `INTEGER` | FK `users.id` (SET NULL), Index | **Owning Artisan ID (`NULL` if Main Owner)**. |
| `collection_id`| `INTEGER` | FK `collections.id` (SET NULL)| Associated collection grouping. |
| `ratings` | `NUMERIC(3, 2)` | Default `5.00` | Aggregate rating score (1.00 - 5.00). |
| `created_at` | `DATETIME` | Default `IST Now` | Creation timestamp. |
| `updated_at` | `DATETIME` | Auto-update `IST Now` | Last modification timestamp. |
| `created_by` | `VARCHAR(255)` | Default `'admin'` | Creator name/username for auditing. |
| `modified_by` | `VARCHAR(255)` | Default `'admin'` | Last modifier name/username. |
| `status` | `VARCHAR(50)` | Default `'active'` | Status (`'active'`, `'inactive'`). |
| `show_on_homepage`| `BOOLEAN` | Default `FALSE` | Featured on homepage highlight grid. |
| `name_en` / `name_hi`| `VARCHAR(255)`| NULL | English and Hindi titles. |
| `description_en` / `description_hi`| `TEXT`| NULL | English and Hindi descriptions. |
| `features_en` / `features_hi`| `TEXT`| NULL | Bulleted highlights (multilingual). |
| `specifications_en` / `specifications_hi`| `TEXT`| NULL | Material/weight specifications. |

### Table 4: `orders`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PK, Auto Increment | Internal order ID. |
| `order_id` | `VARCHAR(50)` | UNIQUE, NOT NULL, Index | Public order identifier (e.g. `SS-849201`). |
| `user_id` | `INTEGER` | FK `users.id` (SET NULL) | Purchasing customer ID. |
| `total_amount` | `NUMERIC(10, 2)`| NOT NULL | Total payable order sum in INR. |
| `order_status` | `VARCHAR(50)` | Default `'Pending'` | Status (`Pending`, `Confirmed`, `Packed`, `Shipped`, `Out for Delivery`, `Delivered`, `Cancelled`). |
| `delivery_date`| `VARCHAR(50)` | NULL | Estimated or actual delivery date. |
| `tracking_history`| `JSON` | NULL | Append-only tracking status history array. |
| `return_request`| `JSON` | NULL | Return request details object. |
| `shipping_address`| `EncryptedJSON`| NULL | Full shipping address encrypted with AES-256. |
| `carrier` | `VARCHAR(100)`| NULL | Courier partner name (e.g. Blue Dart). |
| `tracking_id` | `VARCHAR(100)`| NULL | Consignment tracking number. |
| `tracking_url` | `VARCHAR(500)`| NULL | Web URL for external courier live tracking. |
| `terms_accepted`| `BOOLEAN` | Default `FALSE` | Compliance acknowledgment flag. |
| `terms_accepted_at`| `DATETIME` | NULL | Timestamp of legal terms acceptance. |
| `created_at` | `DATETIME` | Default `IST Now` | Order placement timestamp. |

### Table 5: `order_items`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PK, Auto Increment | Order line item ID. |
| `order_id` | `INTEGER` | FK `orders.id` (CASCADE), NOT NULL | Parent order reference. |
| `product_id` | `INTEGER` | FK `products.id` (SET NULL) | Purchased product ID. |
| **`seller_id`** | `INTEGER` | FK `users.id` (SET NULL), Index | **Attributed Artisan Seller ID (`NULL` if Owner)**. |
| `quantity` | `INTEGER` | Default `1`, NOT NULL | Units purchased. |
| `price` | `NUMERIC(10, 2)`| NOT NULL | Unit price at time of purchase. |
| `name` | `VARCHAR(255)` | NOT NULL | Product name snapshot. |
| `image` | `VARCHAR(500)` | NULL | Product image URL snapshot. |

### Table 6: `transactions`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | PK, Auto Increment | Transaction ID. |
| `transaction_id`| `VARCHAR(100)`| UNIQUE, NOT NULL, Index | Platform transaction reference. |
| `order_id` | `INTEGER` | FK `orders.id` (SET NULL), Index | Associated order reference. |
| `customer_id` | `INTEGER` | FK `users.id` (SET NULL), Index | Customer reference. |
| `payment_gateway`| `VARCHAR(50)` | Default `'razorpay'` | Gateway engine (`'razorpay'`, `'cod'`). |
| `gateway_order_id`| `VARCHAR(100)`| NULL | Gateway-issued order reference. |
| `gateway_payment_id`| `VARCHAR(100)`| NULL | Gateway-issued payment capture reference. |
| `payment_method`| `VARCHAR(50)` | NULL | Payment instrument (`'card'`, `'upi'`, `'cod'`). |
| `amount` | `NUMERIC(10, 2)`| NOT NULL | Transacted monetary sum. |
| `currency` | `VARCHAR(10)` | Default `'INR'` | Currency denomination. |
| `payment_status`| `VARCHAR(50)` | Index, Default `'pending'`| Status (`'pending'`, `'captured'`, `'failed'`, `'refunded'`). |
| `transaction_status`| `VARCHAR(50)`| Default `'created'` | Pipeline state (`'created'`, `'completed'`, `'failed'`). |
| `gateway_response`| `JSON` | NULL | Full gateway webhook JSON response. |
| `failure_reason`| `TEXT` | NULL | Gateway decline message. |
| `refunded_amount`| `NUMERIC(10, 2)`| Default `0.00` | Refunded amount. |
| `environment` | `VARCHAR(20)` | Default `'DEV'` | Environment badge (`'DEV'`, `'QA'`, `'PROD'`). |
| `webhook_verified`| `BOOLEAN` | Default `FALSE` | Webhook cryptographic signature check. |
| `payment_time` | `DATETIME` | Index, NULL | Gateway capture timestamp. |
| `created_at` / `updated_at`| `DATETIME`| Default `UTC Now` | Auditing timestamps. |

### Other Active Tables
- `carts` & `cart_items`: Shopping basket and line items with `saved_for_later` flag.
- `wishlists`: Customer saved items.
- `categories`: Product categories.
- `product_images`: Ordered media gallery (image_order 0 is thumbnail).
- `product_variants`: Optional size/color/material overrides.
- `stock_histories`: Audit log of all stock increases and decreases.
- `product_audit_logs`: Audit log of price/field changes on products.
- `buy_requests`: Customer requests for high-demand custom craft pieces.
- `reviews`: Customer ratings and reviews with auto-recalculation of product average rating.
- `coupons`: Percentage or flat discount coupons with minimum basket limits.
- `collections`: Curated collections with banners, rules, and styling tips.
- `banners`, `category_banners`, `collection_banners`: Promotional visual assets.
- `lookbooks`: Editorial craft showcases with item tag links.
- `support_messages`, `support_replies`, `faqs`, `support_links`: Ticketing and customer care.
- `notifications`: In-app customer and order notifications.
- `admins`, `admin_audit_logs`, `admin_notifications`: Superadmin credentials, actions, and alerts.
- `user_attempts`: Consecutive login/OTP failure tracking with 15-minute lock.
- `user_status_audit_logs`: Audit history of administrative customer blocks/unblocks.
- `otp_verifications`: Temporary 6-digit registration & reset codes (5-minute expiry).
- `site_settings`: Global key-value operational configuration table.
- `email_logs`: Outbound SMTP message dispatch audit trail.

---

# 6. PRODUCT MANAGEMENT SYSTEM

## 6.1 Product Creation & Identity Lifecycle
1. **Creation Endpoint**: `POST /api/products` (Guarded by `@token_required`).
2. **Seller Identity Injection**:
   - If `current_user.role == "seller"`, `data["seller_id"]` is forcibly assigned to `current_user.id`. Artisans cannot impersonate other sellers.
   - If `current_user.role == "owner"`, `data["seller_id"]` defaults to `NULL` (indicating Main Owner craftsmanship) or can optionally be assigned to a specific seller ID.
3. **Database Insertion**: Product is committed with generated `id`, initialized `stock`, `status = 'active'`, and category foreign keys.
4. **Cache Invalidation**: Automatically flushes `products_cache` and `categories_cache` in `backend/utils/cache.py`.
5. **Audit Logging**: Inserts a descriptive record into `admin_audit_logs`.

## 6.2 Product Editing & Deletion Permissions
- Handled via `PUT /api/products/<id>` and `DELETE /api/products/<id>`.
- **Ownership Verification**:
  ```python
  if role == "seller" and not is_admin:
      if str(product.get("seller_id")) != str(current_user["_id"]):
          return jsonify({"message": "You are not authorized to modify this product."}), 403
  ```
- Artisans attempting to modify another seller's listing receive an immediate `403 Forbidden`. The Main Owner retains global override rights.

## 6.3 Media & Image Handling
- Handled via `POST /api/products/upload` and `POST /api/products/upload-video`.
- High-res images are streamed to **Cloudinary** (`backend/utils/uploads.py`) or persisted to `backend/static/uploads/` with immutable browser caching headers (`max-age=31536000`).
- Individual images are persisted in `product_images` with explicit `image_order`.

---

# 7. ORDER MANAGEMENT & MULTI-SELLER FULFILLMENT SYSTEM

## 7.1 Complete Order Workflow

```
Customer Basket (Items from Seller A & Seller B)
       │
       ▼
Checkout Progression (/checkout)
       │
       ▼
Atomic Backend Processing (POST /api/orders)
  ├── 1. Sort Product IDs to Enforce Deterministic Lock Order
  ├── 2. Acquire Pessimistic Row Locks (SELECT ... FOR UPDATE)
  ├── 3. Validate Stock & Decrement (Insert into stock_histories)
  ├── 4. Encrypt Shipping Address (AES-256-CBC)
  ├── 5. Generate Order (e.g. SS-849201)
  └── 6. Split Order Lines into order_items tagged with seller_id
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
Artisan Seller A                   Artisan Seller B
GET /api/orders/seller             GET /api/orders/seller
Sees ONLY Seller A items           Sees ONLY Seller B items
Fulfills workshop craft            Fulfills workshop craft
       │                                 │
       └─────────────────────────────────┘
                         │
                         ▼
             Main Owner Control (/owner/orders)
             Inspects overall order, enters Tracking ID & URL
             Updates milestone status: Packed -> Shipped -> Delivered
```

## 7.2 Multi-Seller Order Splitting & Relational Isolation
- In `backend/routes/orders.py`, when an order is created, the system looks up each product's `seller_id`:
  ```python
  product = product_map[product_id]
  item["seller_id"] = product.seller_id
  ```
- Line items in `order_items` record the explicit `seller_id`.
- When Artisan Seller A calls `GET /api/orders/seller`:
  - `OrderModel.find_by_seller_id(seller_id)` queries only `order_items` matching Seller A's ID.
  - The response filters items and returns `seller_total_amount` specific to Seller A.
  - Orders containing items exclusively from Seller B are completely invisible to Seller A.

## 7.3 Milestone Order Status Tracking
The order tracking engine in `OrderModel.update_status()` enforces sequential fulfillment milestones:
1. `Pending`: Order placed, awaiting artisan review.
2. `Confirmed`: Artisan or Owner verified workshop availability.
3. `Packed`: Order packaged securely for transit.
4. `Shipped`: Handed over to logistics carrier.
5. `Out for Delivery`: Out on delivery vehicle. Requires mandatory `tracking_id` and `tracking_url`.
6. `Delivered`: Completed delivery.
7. `Cancelled`: Order cancelled or return approved.

Every milestone status change appends a timestamped history entry to `orders.tracking_history`:
```json
{
  "status": "Shipped",
  "message": "Order handed over to Blue Dart.",
  "updated_at": "2026-10-01T22:45:00+05:30"
}
```

---

# 8. FRONTEND ARCHITECTURE, PAGES & UI COMPONENTS

## 8.1 Storefront Pages
- **`Home.jsx` (`/`)**: Hero carousel, category cards, featured collections, luxury gallery, customer testimonials, showcase video.
- **`Products.jsx` (`/products`, `/search`)**: Filterable catalog by category, price slider, discount, sorting, and live search.
- **`ProductDetails.jsx` (`/products/:id`)**: High-res multi-image gallery, artisan bio badge, multilingual description/features/specs, stock availability, review submission modal, and buy-request button.
- **`Cart.jsx` (`/cart`)**: Shopping cart review, coupon application, saved-for-later shelf, subtotal and shipping calculations.
- **`Checkout.jsx` (`/checkout`)**: Multi-step checkout: saved address selection, new address form, terms compliance check, order placement.
- **`OrderSuccess.jsx` (`/order-success/:orderId`)**: Order confirmation card, order ID, estimated delivery date.
- **`OrderDetails.jsx` (`/orders/:orderId`)**: Milestone tracking timeline, consignment code, external tracking link, item breakdown, and return request submission.
- **`Account.jsx` (`/account/*`)**: Patron hub: profile editing, address book management, order history cards, wishlist grid, language switch.

## 8.2 Main Owner Administration Area (`/owner/*`)
- **`OwnerDashboard.jsx`**: Superadmin overview: platform GMV, total orders, active artisans, patron counts, low-stock warnings.
- **`OwnerProducts.jsx`**: Master catalog manager. Create new products, edit pricing, toggle homepage highlights, restock items.
- **`OwnerOrders.jsx`**: Global orders list. Inspect line items, update milestone status, inject carrier name, tracking ID, and tracking URL.
- **`OwnerCategories.jsx`**: Category creation, editing, visual icon assignment.
- **`OwnerSellers.jsx` & `SellerDetails.jsx`**: Artisan directory, onboarding, store audits, sales metrics.
- **`OwnerCustomers.jsx`**: Customer directory, order frequencies, administrative block/unblock toggles.
- **`OwnerPayments.jsx`**: Financial transaction ledger (`/api/admin/payments`), gateway audit, refund triggers.
- **`OwnerInventory.jsx`**: Stock replenishment console with low-inventory alerts.
- **`OwnerReports.jsx`**: Monthly financial reporting and Excel `.xlsx` report export triggers.
- **`OwnerControl.jsx`**: Emergency switches: toggle Maintenance Mode or High-Demand queue overlays.
- **`OwnerSettings.jsx`**: SMTP configuration validator, feature flags, password update.

## 8.3 Artisan Seller Portal (`/seller/*`)
- **`SellerDashboard.jsx`**: Artisan overview: workshop earnings, pending fulfillments, private product listings.
- **`SellerDashboard.jsx` (`/seller/products`)**: Create and manage own workshop craft listings.
- **`SubOwnerDashboard.jsx` (`/seller/orders`)**: Workshop-specific orders and items assigned for packing.
- **`SellerProfile.jsx`**: Workshop biography, craft lineage, location.
- **`SellerReviews.jsx`**: Customer ratings received on artisan's products.

## 8.4 Common & Shared UI Components
- **`Navbar.jsx`**: Responsive header with search, language switch (EN/HI), cart count badge, profile shortcuts.
- **`Footer.jsx`**: Platform provenance, category shortcuts, customer care links.
- **`MobileBottomNav.jsx`**: Fixed thumb navigation dock for smartphones (`< 768px`).
- **`ProductCard.jsx`**: Artisan product card with image lazy loading, discounted price, star rating summary.
- **`Button.jsx`**: Polymorphic button supporting primary, secondary, outline, and danger variants with loading states.
- **`Badge.jsx`**: Color-coded status pills.
- **`EmptyState.jsx`**: Zero-data illustration with action button.
- **`ErrorBoundary.jsx`**: Top-level React error boundary preventing white screens.
- **`LoadingSpinner.jsx`**: Accessible SVG spinner.
- **`ProtectedRoute.jsx`**: Declarative RBAC route guard.

---

# 9. BACKEND SERVER ARCHITECTURE, MIDDLEWARES & CONCURRENCY

## 9.1 Request & Response Lifecycle
1. **Proxy Header Normalization**: Werkzeug `ProxyFix` correctly extracts client IP, protocol scheme, and port behind cloud reverse proxies.
2. **Maintenance Mode Gatekeeper**: `backend/middleware/maintenance.py` intercepts non-admin requests with `503 Service Unavailable` when maintenance mode is active.
3. **CORS Validation**: Exact-origin CORS verification (`backend/cors.py`) ensures trusted origins only.
4. **Blueprint Routing**: Dispatches request to the appropriate route handler across 14 blueprints.
5. **Gzip Response Compression**: Responses exceeding 500 bytes are dynamically compressed using `gzip` if `Accept-Encoding: gzip` is present.
6. **Error Sanitization**: Production 500 error handlers sanitize internal tracebacks to prevent sensitive server data exposure.

## 9.2 Concurrency & Deadlock Elimination
In `backend/routes/orders.py`:
- **Deterministic Lock Order**: Product IDs are sorted numerically before database row lock acquisition:
  ```python
  sorted_product_ids = sorted(list(set(product_ids)))
  products_db = ProductModel.query.filter(
      ProductModel.id.in_(sorted_product_ids)
  ).with_for_update().all()
  ```
- **Pessimistic Row Locking (`with_for_update()`)**: Locks the specific product rows, preventing overselling race conditions.
- **Deterministic Acquisition Order**: Completely prevents database deadlocks when concurrent users purchase overlapping items in opposite orders.

## 9.3 In-Memory Caching Architecture (`backend/utils/cache.py`)
- `products_cache` (120s TTL) & `categories_cache` (300s TTL).
- Automatically invalidated upon any product creation, update, restock, or deletion.

## 9.4 Background Reporting Scheduler (`backend/utils/report_automation.py`)
- Compiles monthly Gross Merchandise Value (GMV), net revenue, and individual artisan breakdowns.
- Generates formatted Excel `.xlsx` spreadsheets in `backend/reports/` using `pandas` and `openpyxl`.
- Can be run as a standalone worker via `flask run-report-scheduler` or triggered via `POST /api/admin/run-report`.

---

# 10. COMPLETE APPLICATION DATA FLOW & MERMAID WORKFLOWS

## 10.1 System Data Flow Diagram

```mermaid
graph TB
    subgraph ClientLayer ["Client Devices (Browser / Mobile)"]
        PatronUI["Customer Storefront (/products, /cart, /checkout)"]
        SellerUI["Artisan Workspace (/seller/dashboard)"]
        OwnerUI["Main Owner Command Center (/owner/dashboard)"]
    end

    subgraph APILayer ["Flask API Gateway (Port 5005)"]
        CORS["CORS Policy Engine (cors.py)"]
        AuthMW["Auth Middleware (token_required, admin_required)"]
        
        AuthRouter["/api/auth (Login, OTP, Profile)"]
        ProductRouter["/api/products (Catalog, Inventory)"]
        OrderRouter["/api/orders (Checkout, Fulfillment)"]
        AdminRouter["/api/admin (Stats, Sellers, Governance)"]
    end

    subgraph ServiceLayer ["Utilities & Business Services"]
        SecurityEngine["AES-256-CBC Field Encryption (security.py)"]
        EmailGateway["Gmail SMTP Service (email_service.py)"]
        CacheStore["In-Memory Catalog Cache (cache.py)"]
        PaymentGW["Gateway Abstraction (payment_gateway.py)"]
    end

    subgraph DataLayer ["Neon Serverless PostgreSQL Database"]
        UserTable[("users & delivery_addresses")]
        ProductTable[("products & product_images")]
        OrderTable[("orders & order_items")]
        TxTable[("transactions & audit_logs")]
    end

    PatronUI & SellerUI & OwnerUI -->|HTTPS / Bearer JWT| CORS
    CORS --> AuthMW
    AuthMW --> AuthRouter & ProductRouter & OrderRouter & AdminRouter

    AuthRouter --> SecurityEngine --> UserTable
    AuthRouter --> EmailGateway

    ProductRouter --> CacheStore
    ProductRouter --> ProductTable

    OrderRouter --> SecurityEngine --> OrderTable
    OrderRouter --> PaymentGW --> TxTable
    AdminRouter --> UserTable & ProductTable & OrderTable
```

## 10.2 Authentication Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Customer / Seller / Owner)
    participant LoginUI as Login.jsx
    participant AuthCtx as AuthContext.jsx
    participant API as /api/auth/login
    participant DB as Neon PostgreSQL (users / admins)

    User->>LoginUI: Enter email/username & password
    LoginUI->>AuthCtx: login(identifier, password)
    AuthCtx->>API: POST /api/auth/login
    
    API->>DB: Query AdminModel for username match
    alt Is Administrator
        DB-->>API: Admin record found
        API->>API: Verify password with bcrypt
        API-->>AuthCtx: Return JWT token & role="owner"
    else Check UserModel
        API->>DB: Query UserModel where email or phone matches
        DB-->>API: User record found
        API->>DB: Check UserAttempt for 15-min lockout
        API->>API: Verify password with bcrypt.checkpw()
        API-->>AuthCtx: Return JWT token & role=user.role ("seller" / "customer")
    end

    AuthCtx->>AuthCtx: Store token & role in localStorage
    AuthCtx-->>LoginUI: Return { success: true, role }
    
    alt role == "owner"
        LoginUI->>User: Navigate to /owner/dashboard
    else role == "seller"
        LoginUI->>User: Navigate to /seller/dashboard
    else role == "customer"
        LoginUI->>User: Navigate to /account or return URL
    end
```

## 10.3 Product Creation Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Creator as Artisan Seller or Main Owner
    participant Form as Product Form Modal
    participant API as POST /api/products
    participant AuthMW as @token_required
    participant Cache as In-Memory Cache
    participant DB as Neon PostgreSQL (products)

    Creator->>Form: Input title, price, category, stock, images
    Form->>API: POST /api/products (Bearer JWT in header)
    API->>AuthMW: Validate JWT token signature
    AuthMW-->>API: Extracted current_user (role, user_id)

    alt Creator is Artisan Seller (role == 'seller')
        API->>API: Force data['seller_id'] = current_user.id
    else Creator is Main Owner (role == 'owner')
        API->>API: Set data['seller_id'] = requested_seller_id OR None
    end

    API->>DB: INSERT INTO products (name, price, stock, seller_id, ...)
    DB-->>API: Product created with generated ID
    API->>Cache: Invalidate products_cache & categories_cache
    API-->>Form: Return 201 Created { product }
    Form->>Creator: Display success alert & refresh catalog
```

## 10.4 Customer Purchase Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Patron)
    participant CartUI as Cart.jsx / Checkout.jsx
    participant OrderAPI as POST /api/orders
    participant DB as Neon PostgreSQL
    participant Sec as AES-256 Encryption

    Customer->>CartUI: Proceed to checkout with Cart items
    Customer->>CartUI: Select shipping address & accept Terms
    CartUI->>OrderAPI: POST /api/orders (shipping_address, items, total_amount)
    
    OrderAPI->>DB: Lock user record (with_for_update)
    OrderAPI->>OrderAPI: Sort product IDs to prevent deadlocks
    OrderAPI->>DB: SELECT * FROM products WHERE id IN (sorted_ids) FOR UPDATE
    
    OrderAPI->>OrderAPI: Validate stock availability
    loop For each item
        OrderAPI->>DB: Decrement product.stock
        OrderAPI->>DB: INSERT INTO stock_histories (-quantity)
        OrderAPI->>OrderAPI: Attach product.seller_id to OrderItem
    end

    OrderAPI->>Sec: Encrypt shipping_address JSON
    Sec-->>OrderAPI: Ciphertext BB_ENC:...
    OrderAPI->>DB: INSERT INTO orders (order_id="SS-XXXXXX", total_amount, shipping_address)
    OrderAPI->>DB: INSERT INTO order_items (order_id, product_id, seller_id, price, quantity)
    OrderAPI->>DB: Empty user's Cart & CartItems in DB
    OrderAPI->>DB: COMMIT TRANSACTION
    
    OrderAPI-->>CartUI: Return 201 Created { order_id: "SS-849201" }
    CartUI->>Customer: Navigate to /order-success/SS-849201
```

## 10.5 Seller Order Management Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Artisan as Artisan Seller A
    participant SellerUI as SellerDashboard.jsx
    participant OrderAPI as GET /api/orders
    participant DB as Neon PostgreSQL (order_items, orders)

    Artisan->>SellerUI: Open "Orders & Fulfillments" view
    SellerUI->>OrderAPI: GET /api/orders (Authorization: Bearer <ArtisanJWT>)
    OrderAPI->>OrderAPI: Verify role == "seller" & extract current_user.id
    
    OrderAPI->>DB: Query OrderItem WHERE seller_id == current_user.id
    Note over OrderAPI,DB: Relational Isolation: Orders containing items from Seller B are filtered out!
    DB-->>OrderAPI: Return matched orders & line items
    OrderAPI->>OrderAPI: Filter items to only Seller A's products
    OrderAPI->>OrderAPI: Compute seller_total_amount for Seller A
    OrderAPI-->>SellerUI: Return JSON array of orders
    SellerUI->>Artisan: Display only items Artisan A needs to pack and ship
```

## 10.6 Database Communication Flow Diagram

```mermaid
flowchart TD
    subgraph Pool ["SQLAlchemy Engine Connection Pool"]
        PrePing{"Engine Pre-Ping Check"}
        ActiveConn["Active Pooled Connection (Max 10)"]
        RecycleCheck{"Is Connection Older than 280s?"}
        ReEstablish["Establish Fresh SSL Connection to Neon"]
    end

    subgraph Trans ["Transactional Execution"]
        BeginTX["BEGIN TRANSACTION"]
        ReadWrite["Execute Queries / with_for_update() Locks"]
        EncDec["Transparent PII Encrypt/Decrypt (security.py)"]
        CommitTX["COMMIT (Releases Row Locks)"]
        RollbackTX["ROLLBACK (On Exception)"]
    end

    subgraph Storage ["Neon Cloud PostgreSQL"]
        PostgresCore[("PostgreSQL 15 Core Engine")]
    end

    PrePing -->|Connection Alive| RecycleCheck
    PrePing -->|Stale Connection| ReEstablish
    RecycleCheck -->|No| ActiveConn
    RecycleCheck -->|Yes| ReEstablish
    ReEstablish --> ActiveConn

    ActiveConn --> BeginTX
    BeginTX --> ReadWrite
    ReadWrite <--> EncDec
    ReadWrite --> PostgresCore
    ReadWrite -->|Success| CommitTX
    ReadWrite -->|Error| RollbackTX
```

---

# 11. SECURITY ARCHITECTURE & FIELD-LEVEL DATA ENCRYPTION

## 11.1 Transparent Field-Level Encryption (AES-256-CBC)
Implemented in `backend/utils/security.py`:
- Sensitive patron PII is encrypted before persistence in Neon PostgreSQL using AES-256-CBC with PKCS#7 padding.
- **Deterministic IV**: A 16-byte IV is derived from `hashlib.sha256(plain_text).digest()[:16]`. This allows exact-match database queries (`UserModel.query.filter_by(email=...)`) without decrypting entire tables.
- **Encrypted Columns**:
  - `users.full_name`, `users.email`, `users.phone`
  - `delivery_addresses.house_number`, `building_name`, `street`, `area`, `landmark`, `city`, `state`, `pincode`
  - `orders.shipping_address` (via custom `EncryptedJSON` type decorator)
  - `support_messages.name`, `support_messages.email`
  - `admins.username`

## 11.2 Password Security
- Passwords are salted and hashed using `bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())`.
- Verified in constant time via `bcrypt.checkpw()`.
- Plaintext passwords are never stored in memory or written to logs.

## 11.3 Brute-Force Throttling & Lockout Rules
- Tracked in `user_attempts`.
- 5 consecutive failed login attempts trigger an automatic **15-minute temporary lockout** (`blocked_until = now + 15 minutes`).
- Lockouts short-circuit login requests with `429 Too Many Requests`, protecting backend CPU resources from bcrypt computation fatigue.

## 11.4 Network & Transport Security
- **Strict CORS**: No wildcard origins (`*`) permitted with credentials. Exact whitelist verification via `cors.py`.
- **SQL Injection Prevention**: All queries use SQLAlchemy ORM parameterized statements.
- **Upload Restrictions**: Max upload limit enforced at 100MB (`MAX_CONTENT_LENGTH`), with strict extension whitelisting and Werkzeug `secure_filename()` sanitization.

---

# 12. ENVIRONMENT VARIABLES REFERENCE

> [!CAUTION]
> The examples below are non-secret safe placeholders. Never commit actual production secrets to version control.

| Variable Name | Required? | Component | Purpose & Safe Placeholder |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | Optional (Def: `DEV`) | Backend Config | Active tier: `DEV`, `QA`, `PROD`. |
| `PORT` | Optional (Def: `5005`) | Backend Core | Server listening port. |
| `FRONTEND_URL` | **Required in PROD** | CORS / Redirects| Frontend origin (e.g. `https://craftnest.vercel.app`). Cannot be localhost in PROD. |
| `ALLOWED_ORIGINS` | Optional | CORS | Comma-separated list of additional allowed origins. |
| `DATABASE_URL` / `PROD_DATABASE_URL` | **Required in PROD** | SQLAlchemy | Neon PostgreSQL connection URI (`postgresql://user:pass@host.neon.tech/db?sslmode=require`). |
| `DEV_DATABASE_URL` | Optional (Def: SQLite)| SQLAlchemy | Local connection URI (`sqlite:///<path>/dev.db`). |
| `JWT_SECRET` | **Required in PROD** | Auth / Tokens | 64-character random hex string for signing JWT tokens. |
| `SECRET_KEY` | **Required in PROD** | Flask Core | Session signing secret key. |
| `ENCRYPTION_KEY` | **Required in PROD** | Field Encryption| 32-byte base64-encoded key for AES-256 PII encryption. |
| `ENCRYPTION_KEY_FINGERPRINT`| Optional | Startup Guard | First 16 chars of SHA-256 hash of `ENCRYPTION_KEY` to catch key mismatches. |
| `SMTP_HOST` | Optional (Def: Gmail) | Email Service | SMTP server (`smtp.gmail.com`). |
| `SMTP_PORT` | Optional (Def: 587) | Email Service | SMTP port (587 for TLS). |
| `SMTP_EMAIL` | Optional (Needed for OTP)| Email Service | Gmail sender account (e.g. `system@craftnest.com`). |
| `SMTP_PASSWORD` | Optional (Needed for OTP)| Email Service | Google App Password (16 characters). |
| `CLOUDINARY_CLOUD_NAME` | Optional | Media Storage | Cloudinary account cloud identifier. |
| `CLOUDINARY_API_KEY` | Optional | Media Storage | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Optional | Media Storage | Cloudinary API secret. |
| `RAZORPAY_KEY_ID` | Optional | Payments | Razorpay gateway public key (`rzp_test_...` or `rzp_live_...`). |
| `RAZORPAY_KEY_SECRET` | Optional | Payments | Razorpay gateway private secret. |
| `ENABLE_PAYMENT` | Optional (Def: true/false)| Feature Flags | Toggle gateway payments. |
| `ENABLE_EMAIL` | Optional (Def: true) | Feature Flags | Toggle email delivery. |
| `LOG_LEVEL` | Optional | Logging | Logging verbosity: `DEBUG`, `INFO`, `WARNING`. |

---

# 13. CURRENT IMPLEMENTATION STATUS & FEATURE AUDIT

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

# 14. KNOWN ISSUES & FUTURE ENGINEERING ROADMAP

## 14.1 Confirmed Technical Constraints
1. **Third-Party OAuth Credentials**: Google & Microsoft single sign-on buttons in `Login.jsx` require active OAuth application client IDs configured in `backend/.env`. In zero-config local development, standard email/password authentication is used.
2. **Email Domain Filtering**: `backend/utils/helpers.py` restricts user registration to `@gmail.com` and `@outlook.com` domains to mitigate bot spam. Custom corporate domain emails are rejected unless allowlisted.
3. **Payment Gateway in Development Mode**: In local development (`ENVIRONMENT=DEV`), `RAZORPAY_KEY_ID` defaults to `None`, directing orders through direct confirmation or cash-on-delivery flows unless test API keys are supplied.

## 14.2 Engineering Roadmap & Recommended Improvements
1. **Server-Side Token Revocation List (Redis / DB)**: Implement a token blacklist table (`revoked_tokens`) to instantly invalidate active JWT sessions upon password resets or administrative account suspensions.
2. **CDN Edge Caching for Catalog Queries**: Attach `Cache-Control: public, s-maxage=300` headers to `/api/products` and `/api/categories` to leverage edge caching at Cloudflare or Vercel.
3. **Asynchronous Webhook Queue (Celery / RQ)**: Decouple payment webhook processing from the main HTTP worker thread using Redis queues with exponential backoff retries.

---

# 15. LOCAL DEVELOPMENT & PRODUCTION SETUP GUIDE

## 15.1 Backend Local Setup
```bash
# 1. Navigate to backend and create virtual environment
cd backend
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create .env file with minimal development variables
cat << 'EOF' > .env
ENVIRONMENT=DEV
PORT=5005
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
JWT_SECRET=development-only-change-me-64-character-jwt-secret-string-here
SECRET_KEY=development-only-change-me-flask-secret-key-string-here
ENCRYPTION_KEY=ZGV2ZWxvcG1lbnQtb25seS1lbmNyeXB0aW9uLWtleQ==
EXPOSE_OTP_IN_RESPONSE=true
ENABLE_EMAIL=false
ENABLE_PAYMENT=false
EOF

# 4. Bootstrap local SQLite database schema & seed initial craft data
flask --app app.py bootstrap-dev
python setup_owner.py

# 5. Run the 12-step database verification test
python test_database_driven_marketplace.py

# 6. Start the Flask backend server
python app.py
```
*Backend runs at `http://127.0.0.1:5005`.*

## 15.2 Frontend Local Setup
```bash
# 1. Open a new terminal and navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
*Frontend runs at `http://localhost:5173`.*

## 15.3 Production Deployment Instructions
- **Frontend Build**: Run `npm run build` in `frontend/`. Deploy the `dist/` directory to Vercel or Render. Ensure `vercel.json` rewrites all requests to `/index.html`.
- **Backend Build**: Deploy the `backend/` directory to Render or a Linux VPS executing:
  ```bash
  gunicorn --bind 0.0.0.0:5005 --workers 4 --threads 2 backend.app:app
  ```
- **Mandatory Production Checks**: When `ENVIRONMENT=PROD`, the server aborts startup unless:
  - `FRONTEND_URL` is set and does not point to `localhost`.
  - `PROD_DATABASE_URL` connects to PostgreSQL with `?sslmode=require`.
  - `JWT_SECRET`, `SECRET_KEY`, and `ENCRYPTION_KEY` are configured with strong production-grade keys.
