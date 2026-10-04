"""
Seller Database Schema & Reusable Migration Engine
--------------------------------------------------
Every independent seller database (DB2, DB3, DB4, etc.) provisioned in Neon PostgreSQL
runs on this standardized isolated schema.

Tables defined per seller database:
1. seller_schema_meta       - Version tracking & migration metadata
2. seller_profile           - Artisan credentials, workshop bio, craft lineage, location
3. seller_products          - Artisan handcrafted product catalog
4. seller_product_images    - Product media & gallery assets
5. seller_inventory_history - Stock adjustment & depletion audit trail
6. seller_orders            - Orders assigned to this artisan workshop
7. seller_order_items       - Line items with fulfillment statuses
8. seller_reviews           - Customer feedback received on artisan's products
9. seller_sales_analytics   - Daily/monthly workshop revenue & unit aggregates
"""

from datetime import datetime
from sqlalchemy import text

SELLER_SCHEMA_VERSION = "1.0.0"

SELLER_DATABASE_TABLES = [
    "seller_schema_meta",
    "seller_profile",
    "seller_products",
    "seller_product_images",
    "seller_inventory_history",
    "seller_orders",
    "seller_order_items",
    "seller_reviews",
    "seller_sales_analytics"
]

SELLER_SCHEMA_SQL = """
-- 1. Schema Version Metadata
CREATE TABLE IF NOT EXISTS seller_schema_meta (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- 2. Seller Profile & Workshop Settings
CREATE TABLE IF NOT EXISTS seller_profile (
    id SERIAL PRIMARY KEY,
    seller_id VARCHAR(50) NOT NULL UNIQUE,
    artisan_name VARCHAR(255) NOT NULL,
    craft_type VARCHAR(100),
    workshop_location VARCHAR(255),
    bio TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Isolated Seller Products Catalog
CREATE TABLE IF NOT EXISTS seller_products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    discount NUMERIC(5, 2) DEFAULT 0.00,
    description TEXT,
    stock INTEGER DEFAULT 0,
    category_id INTEGER,
    category_name VARCHAR(100),
    ratings NUMERIC(3, 2) DEFAULT 5.00,
    image_url VARCHAR(512),
    materials VARCHAR(255),
    origin VARCHAR(255),
    artisan_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    show_on_home BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Seller Product Media Images
CREATE TABLE IF NOT EXISTS seller_product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES seller_products(id) ON DELETE CASCADE,
    image_url VARCHAR(512) NOT NULL,
    image_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Stock Inventory Adjustment Ledger
CREATE TABLE IF NOT EXISTS seller_inventory_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES seller_products(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL,
    change_amount INTEGER NOT NULL,
    old_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Workshop Orders
CREATE TABLE IF NOT EXISTS seller_orders (
    id SERIAL PRIMARY KEY,
    master_order_id VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    total_amount NUMERIC(10, 2) NOT NULL,
    order_status VARCHAR(50) DEFAULT 'Pending',
    carrier VARCHAR(100),
    tracking_id VARCHAR(100),
    payment_method VARCHAR(50) DEFAULT 'Cash on Delivery',
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Workshop Order Line Items
CREATE TABLE IF NOT EXISTS seller_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES seller_products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    image_url VARCHAR(512),
    fulfillment_status VARCHAR(50) DEFAULT 'Pending'
);

-- 8. Customer Reviews on Artisan Listings
CREATE TABLE IF NOT EXISTS seller_reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES seller_products(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Daily Sales Analytics & Rollups
CREATE TABLE IF NOT EXISTS seller_sales_analytics (
    id SERIAL PRIMARY KEY,
    record_date DATE NOT NULL UNIQUE,
    revenue NUMERIC(12, 2) DEFAULT 0.00,
    units_sold INTEGER DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Non-destructive Indexes
CREATE INDEX IF NOT EXISTS idx_seller_products_status ON seller_products(status);
CREATE INDEX IF NOT EXISTS idx_seller_orders_status ON seller_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_seller_order_items_order ON seller_order_items(order_id);
"""

# SQLite compatibility DDL (replaces SERIAL with INTEGER PRIMARY KEY AUTOINCREMENT)
SQLITE_SELLER_SCHEMA_SQL = SELLER_SCHEMA_SQL.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")


def apply_seller_schema(engine):
    """
    Non-destructive schema migration runner for seller databases.
    Applies the isolated seller tables, verifies schema version, and records migration.
    """
    dialect_name = engine.dialect.name
    ddl_to_run = SQLITE_SELLER_SCHEMA_SQL if dialect_name == "sqlite" else SELLER_SCHEMA_SQL

    try:
        with engine.connect() as conn:
            # Execute DDL statements
            statements = [stmt.strip() for stmt in ddl_to_run.split(';') if stmt.strip()]
            for stmt in statements:
                conn.execute(text(stmt))
            
            # Record or update schema version
            conn.execute(text(
                "INSERT INTO seller_schema_meta (version, description) VALUES (:ver, :desc)"
            ), {"ver": SELLER_SCHEMA_VERSION, "desc": "Initial isolated seller schema initialization"})
            conn.commit()

        return True, f"Schema v{SELLER_SCHEMA_VERSION} successfully initialized."
    except Exception as e:
        return False, f"Failed to apply seller schema: {str(e)}"
