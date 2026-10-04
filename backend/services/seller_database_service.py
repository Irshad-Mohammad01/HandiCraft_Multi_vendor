"""
Seller Database Service
-----------------------
Provides complete data isolation and routing for sellers mapped to dedicated
independent Neon PostgreSQL databases (e.g. DB2, DB3...).

Ensures:
1. All seller catalog queries, additions, edits, deletions, and inventory adjustments
   are executed directly against their dedicated database.
2. Orders and fulfillment analytics for this seller reside in their isolated database.
3. Strict ownership checks: A seller can never access or modify records belonging to
   the platform Owner or other artisans.
4. Seamless integration with the public customer storefront without compromising data isolation.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy import text
from backend.services.multi_db_manager import multi_db
from backend.utils.timezone import get_ist_time, format_iso_datetime

logger = logging.getLogger(__name__)


class SellerDatabaseService:

    @staticmethod
    def get_seller_database_id(seller_id: int) -> Optional[str]:
        """Returns the database ID (e.g. 'DB2') assigned to seller, or None if central."""
        if not seller_id:
            return None
        try:
            return multi_db.get_seller_database_id(int(seller_id))
        except Exception as e:
            logger.error(f"Error checking seller database mapping: {e}")
            return None

    @staticmethod
    def is_isolated_seller(seller_id: int) -> bool:
        """Returns True if the seller has a dedicated isolated database."""
        db_id = SellerDatabaseService.get_seller_database_id(seller_id)
        return bool(db_id and db_id not in ("DB1", "MAIN", "OWNER"))

    # =========================================================================
    # PRODUCTS ROUTING (DB2)
    # =========================================================================

    @staticmethod
    def get_products(seller_id: int, search: str = None) -> List[Dict[str, Any]]:
        """
        Fetches products directly from the seller's dedicated database (DB2).
        Strictly isolated: returns ONLY this seller's handcrafted products.
        """
        db_id = SellerDatabaseService.get_seller_database_id(seller_id)
        if not db_id:
            return []

        engine = multi_db.get_engine(db_id)
        query = """
            SELECT id, name, price, original_price, discount, description, stock, 
                   category_name, category_id, ratings, status, image_url, materials, 
                   origin, artisan_name, show_on_home, created_at, updated_at
            FROM seller_products
            WHERE status != 'deleted'
        """
        params = {}
        if search:
            query += " AND (LOWER(name) LIKE :search OR LOWER(description) LIKE :search)"
            params["search"] = f"%{search.lower()}%"
        query += " ORDER BY id DESC"

        results = []
        with engine.connect() as conn:
            rows = conn.execute(text(query), params).mappings().all()
            for r in rows:
                p_id = r["id"]
                image_val = r.get("image_url") or ""
                cat_id = r.get("category_id") or 1
                cat_name = r.get("category_name") or "Handicrafts"

                composite_id = f"seller_{seller_id}_{p_id}"
                results.append({
                    "id": composite_id,
                    "_id": composite_id,
                    "composite_id": composite_id,
                    "local_id": p_id,
                    "name": r["name"],
                    "description": r.get("description") or "",
                    "price": float(r["price"]),
                    "original_price": float(r["original_price"] or r["price"]),
                    "discount": float(r.get("discount") or 0.0),
                    "stock": int(r["stock"]),
                    "category_id": cat_id,
                    "category_name": cat_name,
                    "category": {"id": cat_id, "name": cat_name},
                    "images": [image_val] if image_val else [],
                    "image_url": image_val,
                    "materials": r.get("materials") or "",
                    "origin": r.get("origin") or "",
                    "artisan_name": r.get("artisan_name") or "seller",
                    "ratings": float(r.get("ratings") or 5.0),
                    "status": r.get("status") or "active",
                    "show_on_home": bool(r.get("show_on_home")),
                    "show_on_homepage": bool(r.get("show_on_home")),
                    "seller_id": str(seller_id),
                    "created_at": format_iso_datetime(r.get("created_at")),
                    "updated_at": format_iso_datetime(r.get("updated_at"))
                })
        return results

    @staticmethod
    def get_product_by_id(seller_id: int, product_id: Any) -> Optional[Dict[str, Any]]:
        """Fetches a single product from seller's isolated database."""
        db_id = SellerDatabaseService.get_seller_database_id(seller_id)
        if not db_id:
            return None

        # Clean/parse product ID if composite format passed
        clean_pid = product_id
        if isinstance(clean_pid, str):
            if "seller_" in clean_pid or "seller-" in clean_pid:
                parts = clean_pid.replace("seller-", "seller_").split("_")
                if len(parts) >= 3 and parts[2].isdigit():
                    clean_pid = int(parts[2])
            elif clean_pid.isdigit():
                clean_pid = int(clean_pid)

        engine = multi_db.get_engine(db_id)
        query = """
            SELECT id, name, price, original_price, discount, description, stock, 
                   category_name, category_id, ratings, status, image_url, materials, 
                   origin, artisan_name, show_on_home, created_at, updated_at
            FROM seller_products
            WHERE id = :prod_id AND status != 'deleted'
        """
        with engine.connect() as conn:
            r = conn.execute(text(query), {"prod_id": int(clean_pid)}).mappings().first()
            if not r:
                return None
            image_val = r.get("image_url") or ""
            cat_id = r.get("category_id") or 1
            cat_name = r.get("category_name") or "Handicrafts"
            p_id = r["id"]
            composite_id = f"seller_{seller_id}_{p_id}"
            return {
                "id": composite_id,
                "_id": composite_id,
                "composite_id": composite_id,
                "local_id": p_id,
                "name": r["name"],
                "description": r.get("description") or "",
                "price": float(r["price"]),
                "original_price": float(r["original_price"] or r["price"]),
                "discount": float(r.get("discount") or 0.0),
                "stock": int(r["stock"]),
                "category_id": cat_id,
                "category_name": cat_name,
                "category": {"id": cat_id, "name": cat_name},
                "images": [image_val] if image_val else [],
                "image_url": image_val,
                "materials": r.get("materials") or "",
                "origin": r.get("origin") or "",
                "artisan_name": r.get("artisan_name") or "seller",
                "ratings": float(r.get("ratings") or 5.0),
                "status": r.get("status") or "active",
                "show_on_home": bool(r.get("show_on_home")),
                "show_on_homepage": bool(r.get("show_on_home")),
                "seller_id": str(seller_id),
                "created_at": format_iso_datetime(r.get("created_at")),
                "updated_at": format_iso_datetime(r.get("updated_at"))
            }

    @staticmethod
    def create_product(seller_id: int, data: dict) -> Dict[str, Any]:
        """
        Creates a product in the seller's dedicated database (DB2).
        Records initial stock change in seller_inventory_history.
        Also mirrors the product into DB1 catalog so customers can view it on the storefront.
        """
        db_id = SellerDatabaseService.get_seller_database_id(seller_id)
        if not db_id:
            raise ValueError("Seller does not have an isolated database configured.")

        name = str(data.get("name") or data.get("title") or "").strip()
        price = float(data.get("price") if data.get("price") is not None else (data.get("selling_price") or 0.0))
        original_price = float(data.get("original_mrp") if data.get("original_mrp") is not None else (data.get("original_price") or price))
        stock = int(data.get("stock") if data.get("stock") is not None else (data.get("available_stock") or 0))
        description = str(data.get("description") or "")
        category_id = int(data.get("category_id") or 1)
        artisan_name = str(data.get("artisan_name") or "seller")
        image_url = str(data.get("image_url") or "")
        materials = str(data.get("materials") or "")
        origin = str(data.get("craft_origin") or data.get("origin") or "")

        # Lookup category name from DB1
        cat_name = "Handicrafts"
        try:
            from backend.models.category import Category
            cat = Category.query.get(category_id)
            if cat:
                cat_name = cat.name
        except Exception:
            pass

        show_on_home = bool(data.get("show_on_home") if "show_on_home" in data else data.get("show_on_homepage", False))

        engine = multi_db.get_engine(db_id)
        with engine.connect() as conn:
            insert_sql = """
                INSERT INTO seller_products (
                    name, price, original_price, stock, description, 
                    category_name, category_id, artisan_name, image_url, 
                    materials, origin, status, ratings, show_on_home, created_at, updated_at
                ) VALUES (
                    :name, :price, :original_price, :stock, :description,
                    :cat_name, :cat_id, :artisan, :image_url,
                    :materials, :origin, 'active', 5.00, :show_on_home, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                ) RETURNING id;
            """
            res_ins = conn.execute(text(insert_sql), {
                "name": name,
                "price": price,
                "original_price": original_price,
                "stock": stock,
                "description": description,
                "cat_name": cat_name,
                "cat_id": category_id,
                "artisan": artisan_name,
                "image_url": image_url,
                "materials": materials,
                "origin": origin,
                "show_on_home": show_on_home
            })
            new_id = res_ins.scalar() if res_ins.returns_rows else getattr(res_ins, "lastrowid", None)
            if not new_id:
                try:
                    new_id = conn.execute(text("SELECT last_insert_rowid()")).scalar()
                except Exception:
                    pass

            # Record in DB2 inventory ledger
            conn.execute(text("""
                INSERT INTO seller_inventory_history (
                    product_id, change_type, change_amount, old_stock, new_stock, created_at
                ) VALUES (
                    :pid, 'initial', :stock, 0, :stock, CURRENT_TIMESTAMP
                );
            """), {"pid": new_id, "stock": stock})

            # Also add to DB2 product images table if image provided
            if image_url:
                conn.execute(text("""
                    INSERT INTO seller_product_images (product_id, image_url, image_order)
                    VALUES (:pid, :img, 0);
                """), {"pid": new_id, "img": image_url})

            conn.commit()

        # Invalidate catalog caches
        try:
            from backend.utils.cache import products_cache, categories_cache
            products_cache.clear()
            categories_cache.clear()
        except Exception:
            pass

        return SellerDatabaseService.get_product_by_id(seller_id, new_id)

    @staticmethod
    def update_product(seller_id: int, product_id: int, data: dict) -> Dict[str, Any]:
        """
        Updates product in seller's isolated database (DB2).
        Strictly verifies ownership: product MUST exist in this seller's DB2.
        """
        db_id = SellerDatabaseService.get_seller_database_id(seller_id)
        if not db_id:
            raise PermissionError("Access denied.")

        existing = SellerDatabaseService.get_product_by_id(seller_id, product_id)
        if not existing:
            raise LookupError("Product not found in your workshop database.")

        old_stock = int(existing["stock"])
        new_stock = int(data.get("stock", old_stock))

        cat_name = existing["category_name"]
        cat_id = int(data.get("category_id") or existing["category_id"])
        if cat_id != existing["category_id"]:
            try:
                from backend.models.category import Category
                cat = Category.query.get(cat_id)
                if cat:
                    cat_name = cat.name
            except Exception:
                pass

        name = data.get("name", existing["name"])
        price = float(data.get("price", existing["price"]))
        original_price = float(data.get("original_price") or price)
        description = data.get("description", existing["description"])
        image_url = data.get("image_url", existing["image_url"])
        materials = data.get("materials", existing.get("materials", ""))
        origin = data.get("origin", existing.get("origin", ""))
        artisan_name = data.get("artisan_name", existing.get("artisan_name", "seller"))
        existing_show = bool(existing.get("show_on_home") or existing.get("show_on_homepage", False))
        show_on_home = bool(data.get("show_on_home") if "show_on_home" in data else (data.get("show_on_homepage") if "show_on_homepage" in data else existing_show))

        engine = multi_db.get_engine(db_id)
        with engine.connect() as conn:
            conn.execute(text("""
                UPDATE seller_products
                SET name = :name,
                    price = :price,
                    original_price = :original_price,
                    stock = :stock,
                    description = :description,
                    category_id = :cat_id,
                    category_name = :cat_name,
                    image_url = :image_url,
                    materials = :materials,
                    origin = :origin,
                    artisan_name = :artisan_name,
                    show_on_home = :show_on_home,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :pid;
            """), {
                "name": name,
                "price": price,
                "original_price": original_price,
                "stock": new_stock,
                "description": description,
                "cat_id": cat_id,
                "cat_name": cat_name,
                "image_url": image_url,
                "materials": materials,
                "origin": origin,
                "artisan_name": artisan_name,
                "show_on_home": show_on_home,
                "pid": int(product_id)
            })

            # Record stock change if modified
            if new_stock != old_stock:
                conn.execute(text("""
                    INSERT INTO seller_inventory_history (
                        product_id, change_type, change_amount, old_stock, new_stock, created_at
                    ) VALUES (
                        :pid, 'update', :diff, :old_s, :new_s, CURRENT_TIMESTAMP
                    );
                """), {
                    "pid": int(product_id),
                    "diff": new_stock - old_stock,
                    "old_s": old_stock,
                    "new_s": new_stock
                })

            conn.commit()

        # Invalidate catalog caches
        try:
            from backend.utils.cache import products_cache, categories_cache
            products_cache.clear()
            categories_cache.clear()
        except Exception:
            pass

        return SellerDatabaseService.get_product_by_id(seller_id, product_id)

    @staticmethod
    def delete_product(seller_id: int, product_id: Any) -> bool:
        """Soft-deletes/removes product from seller's isolated database."""
        db_id = SellerDatabaseService.get_seller_database_id(seller_id)
        if not db_id:
            raise PermissionError("Access denied.")

        clean_pid = product_id
        if isinstance(clean_pid, str):
            if "seller_" in clean_pid or "seller-" in clean_pid:
                parts = clean_pid.replace("seller-", "seller_").split("_")
                if len(parts) >= 3 and parts[2].isdigit():
                    clean_pid = int(parts[2])
            elif clean_pid.isdigit():
                clean_pid = int(clean_pid)

        existing = SellerDatabaseService.get_product_by_id(seller_id, clean_pid)
        if not existing:
            raise LookupError("Product not found in your workshop database.")

        engine = multi_db.get_engine(db_id)
        with engine.connect() as conn:
            conn.execute(text("""
                UPDATE seller_products SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = :pid;
            """), {"pid": int(clean_pid)})
            conn.commit()

        # Invalidate catalog caches
        try:
            from backend.utils.cache import products_cache, categories_cache
            products_cache.clear()
            categories_cache.clear()
        except Exception:
            pass

        return True

    @staticmethod
    def adjust_stock(seller_id: int, product_id: Any, action: str, val: int, reason: str = None) -> Tuple[bool, dict]:
        """Adjusts inventory level and audits change in seller_inventory_history in DB2."""
        db_id = SellerDatabaseService.get_seller_database_id(seller_id)
        if not db_id:
            return False, {"message": "Access denied."}

        clean_pid = product_id
        if isinstance(clean_pid, str):
            if "seller_" in clean_pid or "seller-" in clean_pid:
                parts = clean_pid.replace("seller-", "seller_").split("_")
                if len(parts) >= 3 and parts[2].isdigit():
                    clean_pid = int(parts[2])
            elif clean_pid.isdigit():
                clean_pid = int(clean_pid)

        existing = SellerDatabaseService.get_product_by_id(seller_id, clean_pid)
        if not existing:
            return False, {"message": "Product not found in your workshop database."}

        old_stock = int(existing["stock"])
        if action == "increase":
            new_stock = old_stock + int(val)
        elif action == "decrease":
            new_stock = max(0, old_stock - int(val))
        elif action in ("set", "update"):
            new_stock = max(0, int(val))
        else:
            return False, {"message": f"Unsupported action: {action}"}

        engine = multi_db.get_engine(db_id)
        with engine.connect() as conn:
            conn.execute(text("""
                UPDATE seller_products SET stock = :stk, updated_at = CURRENT_TIMESTAMP WHERE id = :pid;
            """), {"stk": new_stock, "pid": int(clean_pid)})

            conn.execute(text("""
                INSERT INTO seller_inventory_history (
                    product_id, change_type, change_amount, old_stock, new_stock, created_at
                ) VALUES (
                    :pid, :act, :diff, :old_s, :new_s, CURRENT_TIMESTAMP
                );
            """), {
                "pid": int(clean_pid),
                "act": action,
                "diff": new_stock - old_stock,
                "old_s": old_stock,
                "new_s": new_stock
            })
            conn.commit()

        # Invalidate catalog caches
        try:
            from backend.utils.cache import products_cache
            products_cache.clear()
        except Exception:
            pass

        updated = SellerDatabaseService.get_product_by_id(seller_id, clean_pid)
        return True, {
            "previous_stock": old_stock,
            "new_stock": new_stock,
            "product": updated
        }

    @staticmethod
    def get_stock_history(seller_id: int, product_id: int, page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """Fetches stock audit log from DB2 seller_inventory_history."""
        db_id = SellerDatabaseService.get_seller_database_id(seller_id)
        if not db_id:
            return {"items": [], "total": 0, "page": page, "pages": 1, "limit": limit}

        engine = multi_db.get_engine(db_id)
        with engine.connect() as conn:
            count = conn.execute(text("""
                SELECT COUNT(*) FROM seller_inventory_history WHERE product_id = :pid
            """), {"pid": int(product_id)}).scalar() or 0

            offset = (page - 1) * limit
            rows = conn.execute(text("""
                SELECT id, change_type, change_amount, old_stock, new_stock, created_at
                FROM seller_inventory_history
                WHERE product_id = :pid
                ORDER BY created_at DESC
                LIMIT :lim OFFSET :off
            """), {"pid": int(product_id), "lim": limit, "off": offset}).mappings().all()

            import math
            return {
                "items": [{
                    "id": r["id"],
                    "action": r["change_type"],
                    "change_amount": r["change_amount"],
                    "previous_stock": r["old_stock"],
                    "new_stock": r["new_stock"],
                    "created_at": format_iso_datetime(r["created_at"])
                } for r in rows],
                "total": count,
                "page": page,
                "pages": max(1, math.ceil(count / limit)),
                "limit": limit
            }

    @staticmethod
    def get_category_stock_distribution(seller_id: int) -> Dict[str, Any]:
        """Calculates category valuation and units distribution directly from DB2 products."""
        products = SellerDatabaseService.get_products(seller_id)
        cat_map = {}
        total_val = 0.0
        total_units = 0

        for p in products:
            c_name = p.get("category_name") or "Handicrafts"
            val = p["price"] * p["stock"]
            units = p["stock"]
            total_val += val
            total_units += units

            if c_name not in cat_map:
                cat_map[c_name] = {
                    "category_name": c_name,
                    "products_count": 0,
                    "stock_value": 0.0,
                    "total_units": 0
                }
            cat_map[c_name]["products_count"] += 1
            cat_map[c_name]["stock_value"] += val
            cat_map[c_name]["total_units"] += units

        categories_list = []
        for c_name, data in cat_map.items():
            pct = round((data["stock_value"] / total_val * 100), 1) if total_val > 0 else 0.0
            data["percentage"] = pct
            categories_list.append(data)

        categories_list.sort(key=lambda x: x["stock_value"], reverse=True)

        return {
            "success": True,
            "total_stock_value": total_val,
            "total_products": len(products),
            "total_stock_units": total_units,
            "categories": categories_list
        }

    @staticmethod
    def get_low_stock_warnings(seller_id: int) -> Dict[str, Any]:
        """Finds items in DB2 with stock <= 10."""
        products = SellerDatabaseService.get_products(seller_id)
        low_stock = [p for p in products if p["stock"] <= 10]
        low_stock.sort(key=lambda p: (0 if p["stock"] == 0 else 1, p["stock"]))

        results = []
        for p in low_stock:
            stk = p["stock"]
            results.append({
                "id": p["id"],
                "_id": str(p["id"]),
                "name": p["name"],
                "category": p["category_name"],
                "category_id": p["category_id"],
                "price": p["price"],
                "stock": stk,
                "image": p["image_url"],
                "warning_type": "out_of_stock" if stk == 0 else "low_stock",
                "warning_label": "Out of Stock" if stk == 0 else f"Low Stock ({stk} units left)",
                "seller_id": str(seller_id),
                "seller_name": p.get("artisan_name") or "seller",
                "can_manage": True
            })

        return {
            "success": True,
            "count": len(results),
            "products": results
        }

    # =========================================================================
    # ORDERS ROUTING (DB2)
    # =========================================================================

    @staticmethod
    def get_orders(seller_id: int, page: int = None, limit: int = None) -> Any:
        """Fetches orders containing this seller's products from DB2."""
        db_id = SellerDatabaseService.get_seller_database_id(seller_id)
        if not db_id:
            return []

        engine = multi_db.get_engine(db_id)
        with engine.connect() as conn:
            orders_query = """
                SELECT id, master_order_id, customer_name, customer_email, 
                       shipping_city, shipping_state, total_amount, order_status, 
                       carrier, tracking_id, payment_method, payment_status, created_at
                FROM seller_orders
                ORDER BY created_at DESC
            """
            order_rows = conn.execute(text(orders_query)).mappings().all()
            
            res_orders = []
            for o in order_rows:
                ord_id = o["id"]
                # Fetch line items
                items_query = """
                    SELECT id, product_id, product_name, price, quantity, image_url, fulfillment_status
                    FROM seller_order_items
                    WHERE order_id = :oid
                """
                item_rows = conn.execute(text(items_query), {"oid": ord_id}).mappings().all()

                items_list = [{
                    "id": it["id"],
                    "product_id": str(it["product_id"] or ""),
                    "seller_id": str(seller_id),
                    "name": it["product_name"],
                    "price": float(it["price"]),
                    "quantity": int(it["quantity"]),
                    "image": it.get("image_url") or "",
                    "fulfillment_status": it.get("fulfillment_status") or "Pending"
                } for it in item_rows]

                res_orders.append({
                    "id": ord_id,
                    "_id": str(ord_id),
                    "order_id": o["master_order_id"],
                    "master_order_id": o["master_order_id"],
                    "customer_name": o.get("customer_name") or "Customer",
                    "customer_email": o.get("customer_email") or "",
                    "city": o.get("shipping_city") or "",
                    "state": o.get("shipping_state") or "",
                    "total_amount": float(o["total_amount"]),
                    "seller_total_amount": float(o["total_amount"]),
                    "status": o.get("order_status") or "Pending",
                    "order_status": o.get("order_status") or "Pending",
                    "payment_method": o.get("payment_method") or "Cash on Delivery",
                    "payment_status": o.get("payment_status") or "PENDING",
                    "carrier": o.get("carrier") or "",
                    "tracking_id": o.get("tracking_id") or "",
                    "items": items_list,
                    "created_at": format_iso_datetime(o.get("created_at"))
                })

            if page is not None and limit is not None:
                total = len(res_orders)
                start = (page - 1) * limit
                end = start + limit
                import math
                return {
                    "items": res_orders[start:end],
                    "total": total,
                    "page": page,
                    "pages": max(1, math.ceil(total / limit)),
                    "limit": limit
                }
            return res_orders

    @staticmethod
    def get_order_by_id(seller_id: int, order_id_or_master: str) -> Optional[Dict[str, Any]]:
        """Fetches a specific order from DB2."""
        orders = SellerDatabaseService.get_orders(seller_id)
        for o in orders:
            if str(o["id"]) == str(order_id_or_master) or str(o["order_id"]) == str(order_id_or_master):
                return o
        return None

    @staticmethod
    def update_order_status(seller_id: int, order_id_or_master: str, status: str, carrier: str = None, tracking_id: str = None) -> bool:
        """Updates status of an order in DB2."""
        db_id = SellerDatabaseService.get_seller_database_id(seller_id)
        if not db_id:
            return False

        engine = multi_db.get_engine(db_id)
        with engine.connect() as conn:
            conn.execute(text("""
                UPDATE seller_orders
                SET order_status = :st,
                    carrier = COALESCE(:carrier, carrier),
                    tracking_id = COALESCE(:tracking_id, tracking_id),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :oid OR master_order_id = :moid;
            """), {
                "st": status,
                "carrier": carrier,
                "tracking_id": tracking_id,
                "oid": int(order_id_or_master) if str(order_id_or_master).isdigit() else -1,
                "moid": str(order_id_or_master)
            })

            conn.execute(text("""
                UPDATE seller_order_items
                SET fulfillment_status = :st
                WHERE order_id IN (
                    SELECT id FROM seller_orders WHERE id = :oid OR master_order_id = :moid
                );
            """), {
                "st": status,
                "oid": int(order_id_or_master) if str(order_id_or_master).isdigit() else -1,
                "moid": str(order_id_or_master)
            })
            conn.commit()

        # Also sync to DB1 main order if present
        try:
            from backend.models.order import OrderModel
            from backend.extensions import db as main_db
            db1_ord = OrderModel.query.filter(
                (OrderModel.id == (int(order_id_or_master) if str(order_id_or_master).isdigit() else -1)) |
                (OrderModel.order_id == str(order_id_or_master))
            ).first()
            if db1_ord:
                db1_ord.order_status = status
                main_db.session.commit()
        except Exception:
            pass

        return True

    @staticmethod
    def update_order_payment_status(seller_id: int, order_id_or_master: str, payment_status: str, order_status: str = None) -> bool:
        """Updates payment_status and optionally order_status in seller's database."""
        db_id = SellerDatabaseService.get_seller_database_id(seller_id)
        if not db_id:
            return False

        try:
            engine = multi_db.get_engine(db_id)
            with engine.connect() as conn:
                params = {
                    "pst": payment_status,
                    "oid": int(order_id_or_master) if str(order_id_or_master).isdigit() else -1,
                    "moid": str(order_id_or_master)
                }
                if order_status:
                    params["ost"] = order_status
                    conn.execute(text("""
                        UPDATE seller_orders
                        SET payment_status = :pst,
                            order_status = :ost,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = :oid OR master_order_id = :moid;
                    """), params)
                else:
                    conn.execute(text("""
                        UPDATE seller_orders
                        SET payment_status = :pst,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = :oid OR master_order_id = :moid;
                    """), params)
                conn.commit()
            return True
        except Exception as e:
            logger.error(f"[SELLER DB PAYMENT STATUS ERROR] Seller {seller_id} (db {db_id}): {e}")
            return False

    @staticmethod
    def get_fulfillment_stats(seller_id: int) -> Dict[str, Any]:
        """Calculates real-time 7 canonical fulfillment status counts, Total Sales, and Units Sold from DB2."""
        orders = SellerDatabaseService.get_orders(seller_id)
        total_orders = len(orders)

        canonical_statuses = [
            "Pending", "Confirmed", "Packed", "Shipped",
            "Out for Delivery", "Delivered", "Cancelled"
        ]
        status_map = {
            "pending": "Pending", "order placed": "Pending",
            "confirmed": "Confirmed", "order confirmed": "Confirmed",
            "packed": "Packed", "shipped": "Shipped", "in transit": "Shipped",
            "out for delivery": "Out for Delivery", "outfordelivery": "Out for Delivery",
            "delivered": "Delivered", "cancelled": "Cancelled"
        }

        counts = {st: 0 for st in canonical_statuses}
        total_sales = 0.0
        total_units_sold = 0

        for o in orders:
            raw_st = str(o.get("order_status") or "Pending").strip().lower()
            pay_st = str(o.get("payment_status") or "").strip().lower()
            normalized = status_map.get(raw_st, "Pending")
            counts[normalized] = counts.get(normalized, 0) + 1

            # Only count eligible, non-cancelled orders towards Total Sales
            if raw_st not in ("cancelled", "canceled", "failed") and pay_st not in ("failed", "cancelled", "canceled"):
                for it in o.get("items", []):
                    qty = int(it.get("quantity") or 0)
                    prc = float(it.get("price") or 0.0)
                    total_sales += qty * prc
                    total_units_sold += qty

        breakdown = []
        for st in canonical_statuses:
            c = counts[st]
            pct = round((c / total_orders * 100), 1) if total_orders > 0 else 0.0
            breakdown.append({
                "status": st,
                "count": c,
                "percentage": pct
            })

        return {
            "success": True,
            "total_orders": total_orders,
            "total_sales": round(total_sales, 2),
            "total_units_sold": total_units_sold,
            "breakdown": breakdown,
            "counts": counts
        }

    @staticmethod
    def get_seller_payments(seller_id: int, page: int = None, limit: int = None) -> Dict[str, Any]:
        """Fetches sales and payment records for this seller from DB2."""
        orders = SellerDatabaseService.get_orders(seller_id)
        payments = []
        total_sales = 0.0
        total_units_sold = 0

        for o in orders:
            raw_st = str(o.get("order_status") or "Pending").strip().lower()
            pay_st = str(o.get("payment_status") or "PENDING").strip()
            
            order_units = sum(int(it.get("quantity") or 0) for it in o.get("items", []))
            order_subtotal = float(o.get("total_amount") or 0.0)

            is_eligible = raw_st not in ("cancelled", "canceled", "failed") and pay_st.lower() not in ("failed", "cancelled", "canceled")
            if is_eligible:
                total_sales += order_subtotal
                total_units_sold += order_units

            payments.append({
                "id": o["id"],
                "order_id": o["order_id"],
                "customer_name": o.get("customer_name") or "Customer",
                "payment_date": o.get("created_at"),
                "payment_method": o.get("payment_method") or "Cash on Delivery",
                "payment_status": pay_st,
                "order_status": o.get("order_status") or "Pending",
                "amount": order_subtotal,
                "units_sold": order_units,
                "transaction_id": o.get("tracking_id") or f"TXN-{o.get('order_id')}",
                "items": o.get("items", [])
            })

        total_txns = len(payments)
        if page is not None and limit is not None:
            start = (page - 1) * limit
            end = start + limit
            import math
            return {
                "success": True,
                "total_sales": round(total_sales, 2),
                "total_units_sold": total_units_sold,
                "total_transactions": total_txns,
                "payments": payments[start:end],
                "total": total_txns,
                "page": page,
                "pages": max(1, math.ceil(total_txns / limit)),
                "limit": limit
            }

        return {
            "success": True,
            "total_sales": round(total_sales, 2),
            "total_units_sold": total_units_sold,
            "total_transactions": total_txns,
            "payments": payments
        }

    # =========================================================================
    # CHECKOUT DISPATCH TO SELLER DB2
    # =========================================================================

    @staticmethod
    @staticmethod
    def dispatch_checkout_to_seller_db(master_order_id: str, customer_info: dict, items: list) -> dict:
        """
        Called when a customer places an order containing items belonging to an isolated seller.
        Inserts the order & line items directly into that seller's database, and decrements stock.
        Safely tracks dispatched vs failed seller databases for partial-failure visibility.
        """
        # Group items by seller_id
        seller_items_map = {}
        for it in items:
            s_id = it.get("seller_id")
            if s_id and SellerDatabaseService.is_isolated_seller(s_id):
                sid_int = int(s_id)
                if sid_int not in seller_items_map:
                    seller_items_map[sid_int] = []
                seller_items_map[sid_int].append(it)

        dispatched = []
        failed = []

        for s_id, s_items in seller_items_map.items():
            db_id = SellerDatabaseService.get_seller_database_id(s_id)
            if not db_id:
                failed.append({"seller_id": s_id, "error": "Database not configured"})
                continue

            seller_total = sum(float(it.get("price", 0)) * int(it.get("quantity", 1)) for it in s_items)
            p_status = str(customer_info.get("payment_status", "PENDING")).upper()
            p_method = str(customer_info.get("payment_method", "Cash on Delivery"))

            try:
                engine = multi_db.get_engine(db_id)
                with engine.connect() as conn:
                    # Insert seller order
                    ins_ord = """
                        INSERT INTO seller_orders (
                            master_order_id, customer_name, customer_email, 
                            shipping_city, shipping_state, total_amount, order_status,
                            payment_method, payment_status, created_at, updated_at
                        ) VALUES (
                            :moid, :cname, :cemail, :city, :state, :total, 'Pending',
                            :pmethod, :pstatus, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                        ) RETURNING id;
                    """
                    res_ord = conn.execute(text(ins_ord), {
                        "moid": str(master_order_id),
                        "cname": customer_info.get("name", "Customer"),
                        "cemail": customer_info.get("email", ""),
                        "city": customer_info.get("city", ""),
                        "state": customer_info.get("state", ""),
                        "total": seller_total,
                        "pmethod": p_method,
                        "pstatus": p_status
                    })
                    new_ord_id = res_ord.scalar() if res_ord.returns_rows else getattr(res_ord, "lastrowid", None)
                    if not new_ord_id:
                        try:
                            new_ord_id = conn.execute(text("SELECT last_insert_rowid()")).scalar()
                        except Exception:
                            pass

                    # Insert line items and adjust stock in isolated seller DB
                    for it in s_items:
                        p_name = it.get("name", "Product")
                        p_price = float(it.get("price", 0.0))
                        p_qty = int(it.get("quantity", 1))
                        p_img = it.get("image") or ""
                        target_lid = it.get("local_id")

                        # Find product in seller DB by local_id or name
                        find_p = None
                        if target_lid and str(target_lid).isdigit():
                            find_p = conn.execute(text("""
                                SELECT id, stock FROM seller_products WHERE id = :lid AND status != 'deleted' LIMIT 1
                            """), {"lid": int(target_lid)}).mappings().first()

                        if not find_p:
                            find_p = conn.execute(text("""
                                SELECT id, stock FROM seller_products WHERE name = :pname AND status != 'deleted' LIMIT 1
                            """), {"pname": p_name}).mappings().first()

                        db_pid = find_p["id"] if find_p else None
                        if find_p:
                            old_stk = int(find_p["stock"])
                            new_stk = max(0, old_stk - p_qty)
                            conn.execute(text("""
                                UPDATE seller_products SET stock = :nstk, updated_at = CURRENT_TIMESTAMP WHERE id = :pid
                            """), {"nstk": new_stk, "pid": db_pid})

                            conn.execute(text("""
                                INSERT INTO seller_inventory_history (
                                    product_id, change_type, change_amount, old_stock, new_stock, created_at
                                ) VALUES (
                                    :pid, 'order', :diff, :old_s, :new_s, CURRENT_TIMESTAMP
                                );
                            """), {
                                "pid": db_pid,
                                "diff": -p_qty,
                                "old_s": old_stk,
                                "new_s": new_stk
                            })

                        conn.execute(text("""
                            INSERT INTO seller_order_items (
                                order_id, product_id, product_name, price, quantity, image_url, fulfillment_status
                            ) VALUES (
                                :oid, :pid, :name, :price, :qty, :img, 'Pending'
                            );
                        """), {
                            "oid": new_ord_id,
                            "pid": db_pid,
                            "name": p_name,
                            "price": p_price,
                            "qty": p_qty,
                            "img": p_img
                        })

                    conn.commit()
                    dispatched.append({"seller_id": s_id, "database_id": db_id, "seller_order_id": new_ord_id})
            except Exception as e:
                logger.error("[SELLER DB DISPATCH ERROR] Failed for seller %s (%s): %s", s_id, db_id, e)
                failed.append({"seller_id": s_id, "database_id": db_id, "error": str(e)})

        return {
            "success": len(failed) == 0,
            "dispatched": dispatched,
            "failed": failed
        }


# Global singleton
seller_db_service = SellerDatabaseService()
