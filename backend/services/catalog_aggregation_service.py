"""
Catalog Aggregation Service
---------------------------
Dynamically aggregates products from:
- DB1: Main Owner Database (ProductModel)
- DB2, DB3, DB4... DBn: All active seller databases registered in SellerDatabaseRegistry

Key Guarantees:
1. Unified Storefront: Aggregates across all connected databases for Home, All Products, Search, Filters, and Product Details.
2. Dynamic Discovery: Discovers registered databases automatically from DB1 registry without hardcoding.
3. Safe Composite Identifiers: Assigns globally unique identifiers (e.g. 'seller_{seller_id}_{product_id}' and 'owner_{id}')
   preventing ID collisions across independent databases.
4. Fault Tolerance: Gracefully handles unavailable seller databases, logging the connection boundary failure while
   continuing to serve catalog items from all connected databases.
5. Zero Credential Exposure: Internal DB credentials, URLs, and secret keys are never exposed in public product objects.
"""

import logging
import math
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy import text

from backend.extensions import db
from backend.services.multi_db_manager import multi_db
from backend.utils.timezone import format_iso_datetime

logger = logging.getLogger(__name__)


def parse_product_composite_id(product_id_str: Any) -> Tuple[str, Optional[int], Optional[int]]:
    """
    Parses a product identifier into (type, seller_id, local_id).
    Types:
    - 'seller': seller product (seller_id, local_id)
    - 'owner': owner product (None, local_id)
    - 'numeric': numeric identifier (could be owner or legacy ID)
    """
    if not product_id_str:
        return 'unknown', None, None

    pid_str = str(product_id_str).strip()

    if pid_str.startswith("seller_") or pid_str.startswith("seller-"):
        parts = pid_str.replace("seller-", "seller_").split("_")
        if len(parts) >= 3 and parts[1].isdigit() and parts[2].isdigit():
            return 'seller', int(parts[1]), int(parts[2])

    if pid_str.startswith("owner_") or pid_str.startswith("owner-"):
        parts = pid_str.replace("owner-", "owner_").split("_")
        if len(parts) >= 2 and parts[1].isdigit():
            return 'owner', None, int(parts[1])

    if pid_str.isdigit():
        return 'numeric', None, int(pid_str)

    return 'unknown', None, None


class CatalogAggregationService:

    parse_product_composite_id = staticmethod(parse_product_composite_id)

    @staticmethod
    def format_seller_product(r: dict, seller_id: int, seller_name: str, db_id: str) -> Dict[str, Any]:
        """Formats a seller_products database row into a standardized public product dictionary."""
        local_id = int(r["id"])
        composite_id = f"seller_{seller_id}_{local_id}"
        price = float(r["price"])
        orig_price = float(r.get("original_price") or price)
        discount = float(r.get("discount") or 0.0)
        if discount == 0.0 and orig_price > price:
            discount = round(((orig_price - price) / orig_price) * 100, 2)

        image_url = r.get("image_url") or ""
        images = [image_url] if image_url else []

        cat_id = r.get("category_id") or 1
        cat_name = r.get("category_name") or "Handicrafts"
        stock = int(r.get("stock") or 0)
        ratings = float(r.get("ratings") or 5.0)
        artisan = r.get("artisan_name") or seller_name or "Artisan Workshop"

        return {
            "id": composite_id,
            "_id": composite_id,
            "composite_id": composite_id,
            "local_id": local_id,
            "name": r["name"],
            "title": r["name"],
            "price": price,
            "selling_price": price,
            "original_price": orig_price,
            "original_mrp": orig_price,
            "discount": discount,
            "stock": stock,
            "available_stock": stock,
            "description": r.get("description") or "",
            "features": r.get("materials") or "",
            "specifications": r.get("origin") or "",
            "materials": r.get("materials") or "",
            "origin": r.get("origin") or "",
            "craft_origin": r.get("origin") or "",
            "images": images,
            "image_url": image_url,
            "category": cat_name,
            "category_name": cat_name,
            "category_id": str(cat_id),
            "ratings": ratings,
            "review_count": 0,
            "seller_id": str(seller_id),
            "seller_name": seller_name,
            "artisan_name": artisan,
            "created_by": artisan,
            "is_owner_product": False,
            "status": r.get("status") or "active",
            "show_on_home": bool(r.get("show_on_home")),
            "show_on_homepage": bool(r.get("show_on_home")),
            "source_database": db_id,
            "created_at": format_iso_datetime(r.get("created_at")),
            "updated_at": format_iso_datetime(r.get("updated_at"))
        }

    @staticmethod
    def format_owner_product(p) -> Dict[str, Any]:
        """Formats a DB1 ProductModel into a standardized public product dictionary."""
        p_dict = p.to_dict()
        owner_id = str(p.id)
        composite_id = f"owner_{p.id}"
        
        # Keep both composite ID and integer string for full compatibility
        p_dict["id"] = owner_id
        p_dict["_id"] = owner_id
        p_dict["composite_id"] = composite_id
        p_dict["local_id"] = p.id
        p_dict["is_owner_product"] = True
        p_dict["source_database"] = "DB1"
        p_dict["seller_id"] = None
        p_dict["seller_name"] = "CraftNest Master Workshop"
        p_dict["artisan_name"] = p.created_by or "Main Owner"
        return p_dict

    @staticmethod
    def get_all_products(
        category: str = None,
        search: str = None,
        collection: str = None,
        seller: str = None,
        seller_id: str = None,
        homepage_only: bool = False,
        page: int = None,
        limit: int = None,
        include_owner: bool = True
    ) -> Any:
        """
        Dynamically reads and unifies products across DB1 and all registered seller databases.
        Safely isolates database failures without crashing the storefront.
        """
        aggregated: List[Dict[str, Any]] = []

        # 1. Read Owner Products from DB1
        if include_owner and (not seller_id or str(seller_id).lower() in ("owner", "none", "1")):
            try:
                from backend.models.product import ProductModel
                owner_query = ProductModel.query.filter(
                    ProductModel.status.in_(['active', 'published']),
                    (ProductModel.seller_id == None) | (ProductModel.seller_id == 1)
                )

                if homepage_only:
                    owner_query = owner_query.filter((ProductModel.show_on_homepage == True) | (ProductModel.show_on_home == True))

                owner_products = owner_query.order_by(ProductModel.id.desc()).all()
                for p in owner_products:
                    aggregated.append(CatalogAggregationService.format_owner_product(p))
            except Exception as e:
                logger.error("[CATALOG AGGREGATION] Failed reading owner products from DB1: %s", e)

        # 2. Dynamically Discover & Read from all Registered Seller Databases
        try:
            from backend.models.database_registry import SellerDatabaseRegistry
            registries = SellerDatabaseRegistry.query.filter(
                SellerDatabaseRegistry.provisioning_status.in_(['ready', 'active', 'configured'])
            ).all()

            for reg in registries:
                s_id = reg.seller_id
                db_id = reg.database_id
                
                # If filtering for a specific seller
                if seller_id and str(seller_id) != str(s_id):
                    continue

                seller_name = "Artisan Workshop"
                if reg.seller:
                    seller_name = getattr(reg.seller, 'name', None) or getattr(reg.seller, 'username', None) or seller_name

                # Fault-tolerant isolated read from seller's database
                try:
                    engine = multi_db.get_engine(db_id)
                    with engine.connect() as conn:
                        q = """
                            SELECT id, name, price, original_price, discount, description, stock, 
                                   category_name, category_id, ratings, status, image_url, materials, 
                                   origin, artisan_name, show_on_home, created_at, updated_at
                            FROM seller_products
                            WHERE status != 'deleted' AND status != 'inactive'
                            ORDER BY id DESC
                        """
                        rows = conn.execute(text(q)).mappings().all()
                        for r in rows:
                            aggregated.append(
                                CatalogAggregationService.format_seller_product(dict(r), s_id, seller_name, db_id)
                            )
                except Exception as db_err:
                    # Log connection failure clearly and continue showing other databases
                    logger.warning(
                        "[CATALOG AGGREGATION] Seller database '%s' (Seller ID: %s) is currently unavailable: %s",
                        db_id, s_id, db_err
                    )
        except Exception as reg_err:
            logger.error("[CATALOG AGGREGATION] Failed querying SellerDatabaseRegistry: %s", reg_err)

        # 3. Apply Unified Filtering
        filtered = aggregated

        # Homepage visibility filter (Only products with Show on Home Page enabled)
        if homepage_only:
            filtered = [
                p for p in filtered
                if p.get("show_on_home") is True or p.get("show_on_homepage") is True
            ]

        # Category filter
        if category:
            cat_clean = str(category).strip().lower()
            filtered = [
                p for p in filtered 
                if cat_clean in str(p.get("category") or "").lower() 
                or cat_clean in str(p.get("category_name") or "").lower()
                or (cat_clean.isdigit() and str(p.get("category_id")) == cat_clean)
            ]

        # Collection filter (matched via collection_id or description tags)
        if collection:
            coll_clean = str(collection).strip().lower()
            filtered = [
                p for p in filtered
                if coll_clean in str(p.get("collection") or "").lower()
                or coll_clean in str(p.get("collection_name") or "").lower()
                or coll_clean in str(p.get("category") or "").lower()
            ]

        # Search filter (name, description, materials, craft origin, artisan)
        if search:
            s_terms = str(search).strip().lower().split()
            filtered = [
                p for p in filtered
                if any(
                    term in str(p.get("name") or "").lower()
                    or term in str(p.get("description") or "").lower()
                    or term in str(p.get("materials") or "").lower()
                    or term in str(p.get("artisan_name") or "").lower()
                    or term in str(p.get("origin") or "").lower()
                    for term in s_terms
                )
            ]

        # Seller / Artisan filter
        if seller:
            s_name_clean = str(seller).strip().lower()
            filtered = [
                p for p in filtered
                if s_name_clean in str(p.get("artisan_name") or "").lower()
                or s_name_clean in str(p.get("seller_name") or "").lower()
                or s_name_clean in str(p.get("created_by") or "").lower()
            ]

        # Sorting: preserve consistent newest-first ordering
        def sort_key(item):
            created = item.get("created_at") or ""
            return str(created)

        filtered.sort(key=sort_key, reverse=True)

        # 4. Handle Pagination
        total = len(filtered)
        if page is not None and limit is not None:
            p_num = max(1, int(page))
            p_lim = max(1, int(limit))
            start = (p_num - 1) * p_lim
            end = start + p_lim
            items = filtered[start:end]
            pages = max(1, math.ceil(total / p_lim))
            return {
                "items": items,
                "products": items,
                "total": total,
                "page": p_num,
                "pages": pages,
                "limit": p_lim
            }

        return filtered

    @staticmethod
    def get_product_by_id(product_id_or_composite: Any) -> Optional[Dict[str, Any]]:
        """
        Retrieves a single product by composite ID or legacy ID across all databases.
        Supports:
        - 'seller_{seller_id}_{local_id}' -> fetches from seller's dedicated database
        - 'owner_{local_id}' -> fetches from DB1
        - numeric ID -> checks DB1 first, then searches registered seller databases
        """
        if not product_id_or_composite:
            return None

        p_type, seller_id, local_id = parse_product_composite_id(product_id_or_composite)

        # 1. Explicit Seller Composite ID: 'seller_{seller_id}_{local_id}'
        if p_type == 'seller' and seller_id and local_id:
            try:
                from backend.models.database_registry import SellerDatabaseRegistry
                reg = SellerDatabaseRegistry.query.filter_by(seller_id=seller_id).first()
                if not reg:
                    return None
                db_id = reg.database_id
                seller_name = getattr(reg.seller, 'name', 'Artisan Workshop') if reg.seller else "Artisan Workshop"

                engine = multi_db.get_engine(db_id)
                with engine.connect() as conn:
                    q = """
                        SELECT id, name, price, original_price, discount, description, stock, 
                               category_name, category_id, ratings, status, image_url, materials, 
                               origin, artisan_name, created_at, updated_at
                        FROM seller_products
                        WHERE id = :pid AND status != 'deleted'
                    """
                    row = conn.execute(text(q), {"pid": local_id}).mappings().first()
                    if row:
                        prod = CatalogAggregationService.format_seller_product(dict(row), seller_id, seller_name, db_id)
                        # Fetch reviews from seller DB
                        rev_q = "SELECT id, customer_name, rating, comment, created_at FROM seller_reviews WHERE product_id = :pid ORDER BY id DESC"
                        rev_rows = conn.execute(text(rev_q), {"pid": local_id}).mappings().all()
                        prod["reviews"] = [dict(rev) for rev in rev_rows]
                        prod["review_count"] = len(prod["reviews"])
                        return prod
            except Exception as e:
                logger.error("[CATALOG AGGREGATION] Failed fetching seller product %s: %s", product_id_or_composite, e)
                return None

        # 2. Explicit Owner Composite ID: 'owner_{id}'
        if p_type == 'owner' and local_id:
            try:
                from backend.models.product import ProductModel
                from backend.models.review import ReviewModel
                p = ProductModel.query.get(local_id)
                if p and p.status != 'deleted':
                    prod = CatalogAggregationService.format_owner_product(p)
                    reviews = ReviewModel.find_by_product_id(local_id)
                    prod["reviews"] = reviews or []
                    prod["review_count"] = len(reviews) if reviews else 0
                    return prod
            except Exception as e:
                logger.error("[CATALOG AGGREGATION] Failed fetching owner product %s: %s", product_id_or_composite, e)
                return None

        # 3. Numeric ID (backwards compatibility): Try DB1 first
        if p_type == 'numeric' and local_id:
            try:
                from backend.models.product import ProductModel
                from backend.models.review import ReviewModel
                p = ProductModel.query.get(local_id)
                if p and p.status != 'deleted':
                    prod = CatalogAggregationService.format_owner_product(p)
                    reviews = ReviewModel.find_by_product_id(local_id)
                    prod["reviews"] = reviews or []
                    prod["review_count"] = len(reviews) if reviews else 0
                    return prod
            except Exception:
                pass

            # If not in DB1, search across registered seller databases
            try:
                from backend.models.database_registry import SellerDatabaseRegistry
                registries = SellerDatabaseRegistry.query.filter_by(provisioning_status='ready').all()
                for reg in registries:
                    try:
                        engine = multi_db.get_engine(reg.database_id)
                        with engine.connect() as conn:
                            q = """
                                SELECT id, name, price, original_price, discount, description, stock, 
                                       category_name, category_id, ratings, status, image_url, materials, 
                                       origin, artisan_name, created_at, updated_at
                                FROM seller_products
                                WHERE id = :pid AND status != 'deleted'
                            """
                            row = conn.execute(text(q), {"pid": local_id}).mappings().first()
                            if row:
                                s_name = getattr(reg.seller, 'name', 'Artisan') if reg.seller else "Artisan"
                                prod = CatalogAggregationService.format_seller_product(
                                    dict(row), reg.seller_id, s_name, reg.database_id
                                )
                                return prod
                    except Exception:
                        continue
            except Exception:
                pass

        return None


# Global singleton
catalog_aggregation_service = CatalogAggregationService()
