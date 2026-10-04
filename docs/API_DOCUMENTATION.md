# CraftNest — Comprehensive RESTful API Documentation

This reference documents the complete suite of RESTful API endpoints implemented in the CraftNest backend. Every endpoint listed below has been verified against the registered Flask blueprints in `backend/routes/` and `backend/app.py`.

---

## 1. Master API Endpoint Index

| HTTP Method | API Endpoint | Purpose | Authentication | Authorized Roles |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/login` | Unified authentication for all roles | None | Public |
| **POST** | `/api/auth/send-otp` | Dispatch registration verification OTP email | None | Public |
| **POST** | `/api/auth/verify-otp` | Verify 6-digit OTP & create patron account | None | Public |
| **POST** | `/api/auth/resend-otp` | Re-dispatch registration verification OTP | None | Public |
| **POST** | `/api/auth/forgot-password` | Request password reset OTP | None | Public |
| **POST** | `/api/auth/verify-reset-otp`| Verify password reset OTP code | None | Public |
| **POST** | `/api/auth/resend-reset-otp`| Re-dispatch password reset OTP code | None | Public |
| **POST** | `/api/auth/reset-password` | Commit new password using verified OTP | None | Public |
| **POST** | `/api/auth/logout` | Invalidate authenticated session | Bearer JWT | All authenticated |
| **GET** | `/api/auth/profile` | Retrieve profile of authenticated user | Bearer JWT | All authenticated |
| **PUT** | `/api/auth/profile` | Update user name, email, mobile, address | Bearer JWT | All authenticated |
| **GET** | `/api/auth/addresses` | Fetch patron delivery address list | Bearer JWT | Customer |
| **POST** | `/api/auth/addresses` | Add new delivery address | Bearer JWT | Customer |
| **PUT** | `/api/auth/addresses/<id>` | Update specific delivery address | Bearer JWT | Customer |
| **DELETE**| `/api/auth/addresses/<id>` | Delete delivery address | Bearer JWT | Customer |
| **PUT** | `/api/auth/addresses/<id>/default` | Set address as primary default | Bearer JWT | Customer |
| **PUT** | `/api/auth/password` | Change user password | Bearer JWT | All authenticated |
| **POST** | `/api/auth/cart` | Synchronize shopping cart items | Bearer JWT | Customer |
| **POST** | `/api/auth/wishlist` | Synchronize wishlist items | Bearer JWT | Customer |
| **POST** | `/api/auth/saved-for-later`| Synchronize saved-for-later items | Bearer JWT | Customer |
| **GET** | `/api/auth/notifications` | Fetch user notification list | Bearer JWT | All authenticated |
| **PUT** | `/api/auth/notifications/<id>/read` | Mark single notification as read | Bearer JWT | All authenticated |
| **PUT** | `/api/auth/notifications/read-all` | Mark all notifications as read | Bearer JWT | All authenticated |
| **DELETE**| `/api/auth/notifications/clear-read`| Purge all read notifications | Bearer JWT | All authenticated |
| **PUT** | `/api/auth/preferred-language`| Update preferred language (en/hi) | Bearer JWT | All authenticated |
| **POST/DELETE**| `/api/auth/delete-account`| Request permanent account anonymization | Bearer JWT | Customer |
| **GET** | `/api/products` | Paginated product search & catalog | None | Public |
| **GET** | `/api/products/<id>` | Fetch single product detail & reviews | None | Public |
| **POST** | `/api/products` | Create product (Seller/Owner) | Bearer JWT | Seller, Owner, Admin |
| **PUT** | `/api/products/<id>` | Update product details | Bearer JWT | Owner, Owning Seller |
| **DELETE**| `/api/products/<id>` | Delete product listing | Bearer JWT | Owner, Owning Seller |
| **POST** | `/api/products/<id>/review`| Submit rating and review | Bearer JWT | Customer |
| **GET** | `/api/products/categories` | Fetch all active categories | None | Public |
| **GET** | `/api/products/collections`| Fetch all active collections | None | Public |
| **POST** | `/api/products/upload` | Upload product image to Cloudinary/disk| Bearer JWT | Seller, Owner, Admin |
| **POST** | `/api/products/upload-video`| Upload showcase MP4 video | Bearer JWT | Owner, Admin |
| **POST** | `/api/products/<id>/request-buy`| Submit high-demand buy request | Bearer JWT | Customer |
| **POST** | `/api/orders` | Place multi-item order | Bearer JWT | Customer |
| **GET** | `/api/orders` | Fetch customer orders / seller orders | Bearer JWT | All authenticated |
| **GET** | `/api/orders/seller` | Fetch artisan-specific order items | Bearer JWT | Seller, Owner, Admin |
| **GET** | `/api/orders/<id>` | Fetch single order details & tracking | Bearer JWT | Customer, Seller, Owner |
| **GET** | `/api/orders/all` | Fetch all orders across platform | Bearer JWT | Owner, Admin |
| **PUT** | `/api/orders/<id>/status`| Update milestone order status | Bearer JWT | Owner, Admin |
| **PUT** | `/api/orders/<id>/tracking`| Update courier tracking details | Bearer JWT | Owner, Admin |
| **POST** | `/api/orders/<id>/return`| Submit return request for an order | Bearer JWT | Customer |
| **GET** | `/api/admin/stats` | Platform KPIs, GMV & counts | Bearer JWT | Owner, Admin |
| **GET** | `/api/admin/sellers` | List all registered artisan sellers | Bearer JWT | Owner, Admin |
| **GET** | `/api/admin/sellers/<id>`| Deep inspection of artisan store | Bearer JWT | Owner, Admin |
| **PATCH** | `/api/admin/sellers/<id>/status`| Update artisan active/suspended state | Bearer JWT | Owner, Admin |
| **POST** | `/api/admin/sellers` | Create new artisan seller account | Bearer JWT | Owner, Admin |
| **GET** | `/api/admin/users` | Paginated user management table | Bearer JWT | Owner, Admin |
| **PUT** | `/api/admin/users/<id>/block`| Block or unblock patron account | Bearer JWT | Owner, Admin |
| **GET** | `/api/admin/audit-logs` | Retrieve administrator audit trail | Bearer JWT | Owner, Admin |
| **GET** | `/api/admin/buy-requests` | View all customer buy requests | Bearer JWT | Owner, Admin |
| **PUT** | `/api/admin/buy-requests/<id>/status`| Approve/reject buy request | Bearer JWT | Owner, Admin |
| **GET** | `/api/admin/report-settings`| Fetch automated reporting schedule | Bearer JWT | Owner, Admin |
| **POST** | `/api/admin/run-report` | Trigger on-demand Excel report generation| Bearer JWT | Owner, Admin |
| **GET** | `/api/admin/payments` | Ledger of financial transactions | Bearer JWT | Owner, Admin |
| **GET** | `/api/admin/payments/analytics`| Payment gateway volume breakdown | Bearer JWT | Owner, Admin |
| **POST** | `/api/admin/payments/<id>/refund`| Initiate payment refund | Bearer JWT | Owner, Admin |
| **POST** | `/api/coupons/validate` | Validate coupon code against basket | None | Public |
| **GET** | `/api/banners` | Fetch active homepage hero banners | None | Public |
| **POST** | `/api/banners` | Create homepage banner | Bearer JWT | Owner, Admin |
| **GET** | `/api/category-banners` | Fetch category header banners | None | Public |
| **GET** | `/api/collection-banners`| Fetch collection header banners | None | Public |
| **GET** | `/api/collections` | Fetch curated collections | None | Public |
| **GET** | `/api/collections/<slug>/products`| Fetch products in a collection | None | Public |
| **POST** | `/api/support` | Submit customer support ticket | None | Public / Customer |
| **GET** | `/api/support/my-tickets`| Fetch user ticket history | Bearer JWT | Customer |
| **POST** | `/api/support/<id>/reply`| Reply to support ticket | Bearer JWT | Customer, Owner, Admin |
| **GET** | `/api/support/faqs` | Fetch public FAQs | None | Public |
| **GET** | `/api/maintenance/status`| Check system maintenance state | None | Public |
| **POST** | `/api/maintenance/toggle`| Toggle maintenance mode on/off | Bearer JWT | Owner, Admin |
| **GET** | `/api/high-demand/status`| Check high-demand queue state | None | Public |
| **POST** | `/api/high-demand/toggle`| Toggle high-demand queue on/off | Bearer JWT | Owner, Admin |
| **GET** | `/health` | Server health check probe | None | Public |
| **GET** | `/ready` | Database readiness probe | None | Public |

---

## 2. Detailed Module Breakdown

### 2.1 Authentication Endpoints (`/api/auth`)

#### `POST /api/auth/login`
- **Purpose**: Authenticates any user persona (Owner, Sub-Owner, Seller, Customer).
- **Request Body**:
  ```json
  {
    "email": "artisan.ramesh@craftnest.internal",
    "password": "ArtisanPassword2026!"
  }
  ```
- **Response Format (200 OK)**:
  ```json
  {
    "message": "Login successful!",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "14",
      "name": "Ramesh Kumar Jaipur Crafts",
      "email": "artisan.ramesh@craftnest.internal",
      "mobile": "+919811122233",
      "role": "seller",
      "is_admin": false
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Missing identifier or password.
  - `401 Unauthorized`: Password verification failure.
  - `403 Forbidden`: Account suspended or unverified email.
  - `429 Too Many Requests`: Account temporarily locked (15-min lockout after 5 consecutive failures).

#### `POST /api/auth/send-otp`
- **Purpose**: Validates email format, checks for duplicate accounts, generates a cryptographically secure 6-digit OTP, saves temporary user registration state in `otp_verifications`, and transmits the code via Gmail SMTP.
- **Request Body**:
  ```json
  {
    "name": "Priya Sharma",
    "email": "patron.priya@gmail.com",
    "mobile": "+919777888999",
    "password": "SecurePassword2026!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "OTP verification code sent to your email. Valid for 5 minutes."
  }
  ```

---

### 2.2 Product Management Endpoints (`/api/products`)

#### `POST /api/products`
- **Purpose**: Creates an artisanal or owner-owned product listing.
- **Headers**: `Authorization: Bearer <JWT>`
- **Authorization**: Sellers, Main Owners, Sub-Owners.
- **Logic**:
  - If authenticated user has `role == "seller"`, `data["seller_id"]` is forcibly assigned to their authenticated database ID.
  - If authenticated user is the Main Owner, `seller_id` is set to `NULL` (or explicitly assigned to an artisan).
- **Request Body**:
  ```json
  {
    "name": "Handcrafted Jaipur Blue Pottery Floral Vase",
    "price": 2499.00,
    "discount": 10.0,
    "stock": 15,
    "category": "Blue Pottery",
    "description": "Authentic quartz-frit glazed blue pottery vase made in Jaipur, Rajasthan.",
    "images": ["https://res.cloudinary.com/craftnest/image/upload/v1/vase1.jpg"]
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Product created successfully!",
    "product": {
      "id": "108",
      "name": "Handcrafted Jaipur Blue Pottery Floral Vase",
      "price": 2499.00,
      "discount": 10.0,
      "stock": 15,
      "category": "Blue Pottery",
      "seller_id": "14",
      "seller_name": "Ramesh Kumar Jaipur Crafts",
      "status": "active"
    }
  }
  ```

---

### 2.3 Order Management Endpoints (`/api/orders`)

#### `POST /api/orders`
- **Purpose**: Executes atomic order creation, sorts product IDs to prevent deadlocks, decrements inventory, logs `stock_histories`, and injects `seller_id` into each line item.
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**:
  ```json
  {
    "shipping_address": {
      "name": "Priya Sharma",
      "phone": "+919777888999",
      "house_number": "Flat 402",
      "building_name": "Heritage Heights",
      "street": "MG Road",
      "area": "Civil Lines",
      "city": "Jaipur",
      "state": "Rajasthan",
      "pincode": "302001",
      "country": "India",
      "email": "patron.priya@gmail.com"
    },
    "items": [
      {
        "product_id": "108",
        "name": "Handcrafted Jaipur Blue Pottery Floral Vase",
        "price": 2249.10,
        "quantity": 1,
        "image": "https://res.cloudinary.com/.../vase1.jpg"
      }
    ],
    "total_amount": 2249.10,
    "terms_accepted": true
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Order placed successfully!",
    "order": {
      "id": "42",
      "order_id": "SS-718293",
      "total_amount": 2249.10,
      "order_status": "Pending",
      "delivery_date": "06-10-2026",
      "tracking_history": [
        {
          "status": "Pending",
          "message": "Order placed successfully and is awaiting confirmation.",
          "updated_at": "2026-10-01T22:45:00+05:30"
        }
      ]
    }
  }
  ```

#### `GET /api/orders/seller`
- **Purpose**: Allows an artisan seller to retrieve only the orders and line items attributed to their workshop (`order_items.seller_id == authenticated_seller_id`).
- **Headers**: `Authorization: Bearer <JWT>`
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "42",
      "order_id": "SS-718293",
      "order_status": "Pending",
      "seller_total_amount": 2249.10,
      "items": [
        {
          "product_id": "108",
          "seller_id": "14",
          "name": "Handcrafted Jaipur Blue Pottery Floral Vase",
          "price": 2249.10,
          "quantity": 1
        }
      ]
    }
  ]
  ```

---

### 2.4 Administrative Supervision (`/api/admin`)

#### `GET /api/admin/stats`
- **Purpose**: Generates high-level platform statistics for the Main Owner dashboard.
- **Headers**: `Authorization: Bearer <JWT>`
- **Authorized**: Owner, Admin.
- **Response (200 OK)**:
  ```json
  {
    "total_revenue": 458920.00,
    "total_orders": 128,
    "pending_orders": 12,
    "active_products": 240,
    "total_customers": 450,
    "total_sellers": 18,
    "low_stock_products": 4
  }
  ```
