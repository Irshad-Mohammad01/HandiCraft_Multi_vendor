# CraftNest — Complete Project Structure & File Guide

This document provides a complete directory tree and detailed file-by-file analysis of the CraftNest project repository.

---

## 1. Complete Project Directory Tree

```
HandiCraft/
├── backend/
│   ├── app.py                            # Flask application factory, blueprint registration & entrypoint
│   ├── config.py                         # Environment detection, database URI resolution, SMTP & feature flags
│   ├── cors.py                           # Strict environment-aware CORS origins builder
│   ├── extensions.py                     # Instantiations of db (SQLAlchemy), migrate (Alembic), mail (Flask-Mail)
│   ├── requirements.txt                  # Python dependencies with locked versions
│   ├── setup_owner.py                    # Bootstrap script for creating Main Owner credentials
│   ├── seed_craftnest.py                 # Initial data seeder for categories, products, banners, and users
│   ├── test_database_driven_marketplace.py# 12-step real Neon DB integration & multi-role test suite
│   ├── test_craftnest_e2e.py             # End-to-end API scenario testing
│   ├── dev.db                            # SQLite development database fallback
│   ├── middleware/
│   │   ├── auth.py                       # token_required, admin_required, owner_required, seller_required
│   │   └── maintenance.py                # Global maintenance gatekeeper intercepting customer traffic
│   ├── models/                           # Declarative SQLAlchemy database entities
│   │   ├── __init__.py                   # Model exports index
│   │   ├── admin.py                      # AdminModel, AdminAuditLog, AdminNotification
│   │   ├── banner.py                     # BannerModel (Hero promotional banners)
│   │   ├── category.py                   # Category model (Product classification)
│   │   ├── category_banner.py            # CategoryBanner (Category header visual assets)
│   │   ├── collection.py                 # CollectionModel (Themed artisan collections)
│   │   ├── collection_banner.py          # CollectionBanner (Collection header banners)
│   │   ├── coupon.py                     # CouponModel (Promotional discounts)
│   │   ├── email_log.py                  # EmailLog (Outbound SMTP audit history)
│   │   ├── lookbook.py                   # LookbookModel (Editorial aesthetic showcase)
│   │   ├── notification.py               # NotificationModel (Customer & order notifications)
│   │   ├── order.py                      # OrderModel, OrderItem (Multi-seller order management)
│   │   ├── otp_verification.py           # OTPVerification (Email/SMS OTP verification sessions)
│   │   ├── product.py                    # ProductModel, ProductImageModel, ProductVariantModel, BuyRequestModel, StockHistoryModel
│   │   ├── review.py                     # ReviewModel (Customer reviews and ratings)
│   │   ├── settings.py                   # SiteSettingModel (Key-value site settings)
│   │   ├── support.py                    # SupportModel, SupportReplyModel, FAQModel, SupportLinkModel
│   │   ├── transaction.py                # TransactionModel (Financial transaction ledger)
│   │   ├── user.py                       # UserModel, DeliveryAddress, Cart, CartItem, Wishlist
│   │   └── user_attempt.py               # UserAttempt (Brute-force security & 15-min account locks)
│   ├── routes/                           # REST API blueprints
│   │   ├── admin.py                      # /api/admin: stats, seller CRUD, user management, audit logs
│   │   ├── auth.py                       # /api/auth: login, OTP, registration, OAuth, address management
│   │   ├── banners.py                    # /api/banners: promotional hero banners
│   │   ├── category_banners.py           # /api/category-banners: category banner CRUD
│   │   ├── collection_banners.py         # /api/collection-banners: collection banner CRUD
│   │   ├── collections.py                # /api/collections: curated collection management
│   │   ├── coupons.py                    # /api/coupons: discount coupon validation & management
│   │   ├── high_demand.py                # /api/high-demand: high demand system toggles
│   │   ├── lookbook.py                   # /api/lookbook: lookbook editorial endpoints
│   │   ├── maintenance.py                # /api/maintenance: maintenance mode status & toggles
│   │   ├── orders.py                     # /api/orders: checkout, customer orders, seller orders (/seller)
│   │   ├── payments.py                   # /api/admin/payments: transactions, refunds, gateway audit
│   │   ├── products.py                   # /api/products: catalog exploration, seller creation, stock
│   │   └── support.py                    # /api/support: ticketing, FAQs, live help links
│   ├── static/uploads/                   # Local filesystem image/video upload directory fallback
│   └── utils/
│       ├── audit.py                      # Centralized administrator action logging
│       ├── cache.py                      # In-memory dictionary cache for products and categories
│       ├── email_service.py              # Gmail SMTP transmission routines
│       ├── helpers.py                    # OTP generator, email validator, sanitizer
│       ├── mobile_otp.py                 # Mobile SMS OTP dispatcher (extensible to MSG91/Twilio)
│       ├── pagination.py                 # Query paginator helper (`paginate_query`)
│       ├── payment_gateway.py            # Gateway abstraction interface (Razorpay / COD)
│       ├── report_automation.py          # Automated Excel report compiler (Pandas & OpenPyXL)
│       ├── security.py                   # AES-256-CBC EncryptedString & EncryptedJSON column decorators
│       ├── timezone.py                   # IST (Asia/Kolkata) datetime helpers and ISO formatters
│       └── uploads.py                    # File type validation, Cloudinary streaming & local disk storage
├── frontend/
│   ├── index.html                        # Single Page Application HTML5 template
│   ├── package.json                      # Frontend dependencies, scripts, and project metadata
│   ├── postcss.config.js                 # PostCSS configuration
│   ├── tailwind.config.js                # Tailwind CSS legacy configuration (v3 compatibility)
│   ├── vercel.json                       # Vercel SPA routing rewrite configuration
│   ├── vite.config.js                    # Vite bundler, plugin & vendor chunk splitting configuration
│   ├── public/                           # Static public media assets (logos, fallback images, showcase MP4s)
│   └── src/
│       ├── App.jsx                       # Main client router, layout switch, and route definitions
│       ├── App.css                       # Application-level styling utilities
│       ├── index.css                     # Global design tokens, color palette, custom fonts, scrollbars
│       ├── main.jsx                      # React 19 entrypoint mounting App with Context Providers
│       ├── api/                          # Axios API service clients
│       │   ├── client.js                 # Axios instance, baseURL resolution, request & 401 response interceptors
│       │   ├── admin.js                  # Owner & administrative API calls
│       │   ├── auth.js                   # Authentication, registration, OTP, and profile API calls
│       │   ├── banners.js                # Banner fetch and upload API calls
│       │   ├── cart.js                   # Cart synchronization API calls
│       │   ├── coupons.js                # Coupon validation API calls
│       │   ├── orders.js                 # Order creation, order tracking, and history API calls
│       │   └── products.js               # Product listing, filtering, and detail API calls
│       ├── components/
│       │   ├── common/                   # Shared UI building blocks
│       │   │   ├── Badge.jsx             # Status and count badge indicator
│       │   │   ├── Button.jsx            # Themed primary, secondary, and outline button
│       │   │   ├── EmptyState.jsx        # Illustrated placeholder for zero-data views
│       │   │   ├── ErrorBoundary.jsx     # Global React error trap preventing white-screens
│       │   │   ├── Footer.jsx            # Main storefront footer with navigation and legal links
│       │   │   ├── LoadingSpinner.jsx    # Animated loading spinner with accessible status text
│       │   │   ├── MobileBottomNav.jsx   # Fixed bottom navigation bar for mobile smartphones
│       │   │   ├── Navbar.jsx            # Responsive header with search, language switch, cart badge & profile
│       │   │   ├── ProductCard.jsx       # Artisan product card with image, price, discount, rating
│       │   │   └── ProtectedRoute.jsx    # Route authentication & role-based authorization guard
│       │   ├── admin/                    # Owner dashboard modular tabs & modals
│       │   │   ├── AdminOwnerBar.jsx     # Quick-switch administrative action bar
│       │   │   ├── AnalyticsTab.jsx      # Financial GMV charts and performance metrics
│       │   │   ├── CategoryBannerManagement.jsx # Category banner management tool
│       │   │   ├── CollectionBannerManagement.jsx # Collection banner management tool
│       │   │   ├── OrderItemsModal.jsx   # Order line-item inspection modal
│       │   │   ├── OrderManagementTab.jsx# Order status update and tracking details table
│       │   │   ├── ProductManagementTab.jsx # Product catalog table with stock quick-edits
│       │   │   ├── SupportTicketsTab.jsx # Customer ticket inbox and reply interface
│       │   │   ├── TrackingInfoModal.jsx # Shipment tracking number & URL injector modal
│       │   │   └── UserManagementTab.jsx # Patron and seller status, block/unblock control
│       │   └── dashboard/                # Reusable dashboard widgets
│       │       ├── DashboardLayout.jsx   # Shared sidebar and topbar frame for management portals
│       │       └── MetricCard.jsx        # KPI metric card with icon, percentage change, and count
│       ├── context/                      # React Context providers
│       │   ├── AuthContext.jsx           # Global user identity, token, role, login, logout, and permissions
│       │   ├── CartContext.jsx           # Shopping cart item state, totals, discount calculation
│       │   ├── WishlistContext.jsx       # Saved artisan items state and toggles
│       │   ├── MaintenanceContext.jsx    # Real-time maintenance status subscriber
│       │   └── HighDemandContext.jsx     # High-demand concurrency overlay controller
│       ├── pages/                        # Route page views
│       │   ├── Home.jsx                  # Storefront landing page with hero, categories, collections
│       │   ├── Products.jsx              # Product catalog explorer with category/price filters and search
│       │   ├── ProductDetails.jsx        # Product detail page, image gallery, specifications, reviews
│       │   ├── Cart.jsx                  # Shopping basket review, coupon input, checkout progression
│       │   ├── Checkout.jsx              # Multi-step checkout: address selection, review, order placement
│       │   ├── OrderSuccess.jsx          # Order confirmation screen with tracking ID and delivery estimate
│       │   ├── OrderDetails.jsx          # Deep-dive tracking timeline, item breakdown, and return request
│       │   ├── Orders.jsx                # Customer order history list
│       │   ├── Wishlist.jsx              # Customer wishlist grid
│       │   ├── Account.jsx               # Patron account hub: profile, addresses, orders, settings
│       │   ├── Profile.jsx               # Customer profile editor and password change form
│       │   ├── Login.jsx                 # Single unified login page for all roles
│       │   ├── Register.jsx              # Customer registration form triggering OTP email
│       │   ├── VerifyOtp.jsx             # 6-digit OTP verification interface
│       │   ├── ForgotPassword.jsx        # Password reset initiation interface
│       │   ├── ResetPassword.jsx         # New password submission interface
│       │   ├── Contact.jsx               # Customer care inquiry and ticket submission form
│       │   ├── FAQ.jsx                   # Categorized frequently asked questions and live links
│       │   ├── NotFound.jsx              # Friendly 404 error page with navigation shortcuts
│       │   ├── owner/                    # Main Owner administrative pages
│       │   │   ├── OwnerDashboard.jsx    # Superadmin KPI dashboard, revenue graphs, quick actions
│       │   │   ├── OwnerProducts.jsx     # Full catalog management (Owner-owned & Seller-owned)
│       │   │   ├── OwnerCategories.jsx   # Category creation, editing, and icon assignment
│       │   │   ├── OwnerOrders.jsx       # All marketplace orders with status modification
│       │   │   ├── OwnerCustomers.jsx    # Patron list, purchase frequency, block/unblock control
│       │   │   ├── OwnerSellers.jsx      # Artisan management, onboarding, performance review
│       │   │   ├── OwnerSubOwners.jsx    # Sub-owner operator provisioning and role assignments
│       │   │   ├── OwnerPayments.jsx     # Payment transactions, gateway audits, refund triggers
│       │   │   ├── OwnerInventory.jsx    # Global stock replenishment and low-inventory warnings
│       │   │   ├── OwnerReports.jsx      # Monthly financial reports and Excel export triggers
│       │   │   ├── OwnerSettings.jsx     # System configuration, SMTP verification, feature flags
│       │   │   ├── OwnerControl.jsx      # Emergency toggles: maintenance mode, high-demand queues
│       │   │   └── SellerDetails.jsx     # Deep-dive inspection into specific seller inventory & sales
│       │   ├── sub-owner/
│       │   │   └── SubOwnerDashboard.jsx # Delegated operations portal for orders and inventory audits
│       │   └── seller/
│       │       ├── SellerDashboard.jsx   # Artisan portal: workshop statistics, active listings, order items
│       │       ├── SellerProfile.jsx     # Artisan public profile, craft bio, workshop location
│       │       ├── SellerReviews.jsx     # Reviews received specifically on artisan's products
│       │       └── SellerSettings.jsx    # Artisan operational preferences and notifications
└── docs/                                 # Complete Technical Documentation Suite
```

---

## 2. Key File Analysis & Interconnectivity Matrix

### Backend Core

#### 1. `backend/app.py`
- **Location**: `/home/irshad-mohammad/Music/HandiCraft/backend/app.py`
- **Purpose**: Central application factory that configures Flask, initializes extensions, registers all 14 blueprint routes, registers global error handlers, applies Gzip compression, and attaches startup verification.
- **Key Functions**: `create_app()`, `compress_response()`, `print_registered_routes()`, `health()`, `ready()`.
- **Connections**:
  - Imports `db`, `migrate`, `mail` from `backend/extensions.py`.
  - Imports `Config`, `validate_environment` from `backend/config.py`.
  - Imports all blueprints from `backend/routes/*.py`.
  - Serves static uploads via `/static/uploads/<filename>`.

#### 2. `backend/config.py`
- **Location**: `/home/irshad-mohammad/Music/HandiCraft/backend/config.py`
- **Purpose**: Dynamically detects the active runtime tier (`DEV`, `QA`, `PROD`), resolves the appropriate database connection string, enforces strict production SSL and secret checks, and defines feature flags.
- **Key Functions**: `get_allowed_origins()`, `validate_environment()`, `validate_smtp_configuration()`.
- **Connections**:
  - Referenced by `backend/app.py`, `backend/cors.py`, `backend/middleware/auth.py`, `backend/utils/security.py`.

#### 3. `backend/middleware/auth.py`
- **Location**: `/home/irshad-mohammad/Music/HandiCraft/backend/middleware/auth.py`
- **Purpose**: Provides bulletproof authentication and role authorization decorators. Inspects Bearer tokens, cookies, or custom headers, decodes JWT payloads, and verifies user authorization against database records.
- **Key Functions**: `token_required()`, `admin_required()`, `owner_required()`, `seller_required()`, `extract_bearer_token()`, `decode_jwt_token()`.
- **Connections**:
  - Leveraged across all protected routes in `backend/routes/*.py`.
  - Queries `UserModel` and `AdminModel` from `backend/models/`.

#### 4. `backend/models/product.py`
- **Location**: `/home/irshad-mohammad/Music/HandiCraft/backend/models/product.py`
- **Purpose**: Defines the product catalog entities, inventory records, audit logs, variants, and buy requests.
- **Key Classes**: `ProductModel`, `ProductImageModel`, `ProductVariantModel`, `StockHistoryModel`, `ProductAuditLogModel`, `BuyRequestModel`.
- **Connections**:
  - Foreign key to `Category` (`category_id`) and `UserModel` (`seller_id`).
  - Related to `OrderItem` (`backend/models/order.py`) and `ReviewModel` (`backend/models/review.py`).

#### 5. `backend/models/order.py`
- **Location**: `/home/irshad-mohammad/Music/HandiCraft/backend/models/order.py`
- **Purpose**: Manages customer orders and line items with multi-seller attribution.
- **Key Classes**: `OrderModel`, `OrderItem`.
- **Connections**:
  - `OrderItem.seller_id` links directly to `UserModel.id`, allowing artisan order filtering in `OrderModel.find_by_seller_id()`.
  - Encrypts `shipping_address` using `EncryptedJSON` (`backend/utils/security.py`).

---

### Frontend Core

#### 1. `frontend/src/App.jsx`
- **Location**: `/home/irshad-mohammad/Music/HandiCraft/frontend/src/App.jsx`
- **Purpose**: Master client-side routing orchestrator. Controls page access using `ProtectedRoute`, manages viewport scroll-to-top behaviors, and conditionally toggles the global storefront `Navbar` and `Footer` on dashboard routes.
- **Connections**:
  - Imports all page views from `frontend/src/pages/`.
  - Wraps routes inside `ProtectedRoute` (`frontend/src/components/common/ProtectedRoute.jsx`).

#### 2. `frontend/src/context/AuthContext.jsx`
- **Location**: `/home/irshad-mohammad/Music/HandiCraft/frontend/src/context/AuthContext.jsx`
- **Purpose**: Single source of truth for client authentication. Maintains `user`, `token`, and `role` states in memory and synchronizes with `localStorage`. Provides `login()`, `logout()`, and role helper booleans (`isOwner`, `isSeller`, `isCustomer`).
- **Connections**:
  - Calls `authApi` (`frontend/src/api/auth.js`).
  - Injects Bearer token into `apiClient.defaults.headers.common` (`frontend/src/api/client.js`).
  - Consumed by `ProtectedRoute.jsx`, `Navbar.jsx`, `Login.jsx`.

#### 3. `frontend/src/pages/Login.jsx`
- **Location**: `/home/irshad-mohammad/Music/HandiCraft/frontend/src/pages/Login.jsx`
- **Purpose**: Unified authentication page where any user persona (Superadmin, Sub-Owner, Artisan Seller, or Patron) enters their identifier and password. Upon successful verification, automatically routes them to `/owner/dashboard`, `/sub-owner/dashboard`, `/seller/dashboard`, or `/account`.
- **Connections**:
  - Uses `useAuth()` from `frontend/src/context/AuthContext.jsx`.
  - Dispatches navigation via `useNavigate()` from `react-router-dom`.
