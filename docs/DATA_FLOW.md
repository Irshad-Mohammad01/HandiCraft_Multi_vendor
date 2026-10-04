# CraftNest — Application Workflows & Complete Data Flow

This document details how data moves through the CraftNest ecosystem across user interactions, API communications, transactional boundaries, and database persistence.

---

## 1. High-Level System Architecture & Component Interactions

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

---

## 2. Authentication & Unified Role Redirection Flow

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

---

## 3. Product Creation Lifecycle (Artisan vs Owner)

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

---

## 4. Customer Purchase & Multi-Seller Order Flow

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

---

## 5. Seller Order Management & Isolation Flow

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

---

## 6. Database Communication & Connection Pool Lifecycle

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
