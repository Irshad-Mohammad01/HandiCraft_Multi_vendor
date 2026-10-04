import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import cloudinary
import cloudinary.uploader
from backend.config import Config
from backend.models.product import ProductModel
from backend.models.review import ReviewModel
from backend.middleware.auth import token_required, admin_required
from backend.extensions import db
from backend.utils.timezone import format_iso_datetime
from backend.utils.uploads import validate_image_upload, validate_video_upload

products_bp = Blueprint('products', __name__)

# Configure Cloudinary if credentials are set
CLOUDINARY_CLOUD_NAME = Config.CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY = Config.CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET = Config.CLOUDINARY_API_SECRET

if all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]):
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET
    )
    CLOUDINARY_ENABLED = True
    print("[CLOUDINARY] Configured successfully.")
else:
    CLOUDINARY_ENABLED = False
    print("[CLOUDINARY] Credentials missing. Falling back to local upload serving.")

# Local Upload folder setup
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_admin_name_from_request():
    token = None
    if 'Authorization' in request.headers:
        auth_header = request.headers['Authorization']
        if auth_header.startswith('Bearer '):
            token = auth_header.split(" ")[1]
    if not token:
        return "admin"
    try:
        from backend.config import Config
        import jwt
        from backend.models.user import UserModel
        data = jwt.decode(token, Config.get_jwt_secret(), algorithms=["HS256"])
        if data.get("username"):
            return data.get("username")
        admin_id = data.get("admin_id") or data.get("user_id")
        if admin_id and str(admin_id).isdigit():
            from backend.models.admin import AdminModel
            adm = AdminModel.query.get(int(admin_id))
            if adm:
                return adm.username
        user = UserModel.find_by_id(admin_id)
        if user:
            return user.get("name") or user.get("email") or "Admin"
    except Exception:
        pass
    return "admin"

@products_bp.route('', methods=['GET'])
def get_products():
    category = request.args.get('category')
    search = request.args.get('search')
    collection = request.args.get('collection')
    seller = request.args.get('seller') or request.args.get('created_by')
    admin_view = request.args.get('admin_view') or request.args.get('admin')
    all_flag = request.args.get('all') == 'true' or request.args.get('catalog') == 'true'
    seller_id = request.args.get('seller_id')
    
    # Check if request has token from a seller requesting their own products
    from backend.middleware.auth import extract_bearer_token, decode_jwt_token
    from backend.models.user import UserModel
    token = extract_bearer_token()
    if token:
        data, err = decode_jwt_token(token)
        if data and not err:
            u_id = data.get("user_id") or data.get("id")
            if u_id:
                user = UserModel.find_by_id(u_id)
                if user and str(user.get("role") or "").lower() == "seller" and not user.get("is_admin"):
                    if request.args.get('my_products') == 'true' or request.args.get('seller_view') == 'true':
                        seller_id = str(user.get("id") or user.get("_id"))
    
    # Check if seller has a dedicated isolated database (e.g. DB2)
    from backend.services.seller_database_service import seller_db_service
    if seller_id and seller_db_service.is_isolated_seller(seller_id):
        if request.args.get('my_products') == 'true' or request.args.get('seller_view') == 'true' or (seller_id and not category and not collection):
            isolated_products = seller_db_service.get_products(int(seller_id), search=search)
            page_arg = request.args.get('page')
            limit_arg = request.args.get('limit') or request.args.get('page_size')
            if page_arg or limit_arg or request.args.get('paginate') == 'true':
                from backend.utils.pagination import parse_pagination_params
                p_num, p_limit = parse_pagination_params()
                total = len(isolated_products)
                start = (p_num - 1) * p_limit
                end = start + p_limit
                import math
                return jsonify({
                    "items": isolated_products[start:end],
                    "total": total,
                    "page": p_num,
                    "pages": max(1, math.ceil(total / p_limit)),
                    "limit": p_limit,
                    "products": isolated_products[start:end]
                }), 200
            return jsonify(isolated_products), 200

    homepage_only = False
    if request.args.get('homepage_only') == 'true' or request.args.get('show_on_home') == 'true':
        homepage_only = True
    elif not category and not search and not collection and not seller and not seller_id and admin_view != 'true' and not all_flag:
        homepage_only = True

    page_arg = request.args.get('page')
    limit_arg = request.args.get('limit') or request.args.get('page_size')
    
    from backend.services.catalog_aggregation_service import catalog_aggregation_service

    if page_arg or limit_arg or request.args.get('paginate') == 'true':
        from backend.utils.pagination import parse_pagination_params
        p_num, p_limit = parse_pagination_params()
        result = catalog_aggregation_service.get_all_products(
            category=category,
            search=search,
            collection=collection,
            seller=seller,
            seller_id=seller_id,
            homepage_only=homepage_only,
            page=p_num,
            limit=p_limit
        )
        return jsonify(result), 200
        
    products = catalog_aggregation_service.get_all_products(
        category=category,
        search=search,
        collection=collection,
        seller=seller,
        seller_id=seller_id,
        homepage_only=homepage_only
    )
    return jsonify(products), 200

@products_bp.route('/categories', methods=['GET'])
def get_all_categories():
    from backend.utils.cache import categories_cache
    cached_val = categories_cache.get('all_categories')
    if cached_val is not None:
        return jsonify(cached_val), 200

    from backend.models.category import Category
    from backend.models.product import ProductModel
    from sqlalchemy.orm import joinedload
    try:
        categories = Category.query.all()
        
        result = []
        for cat in categories:
            image_url = cat.image_url
            if not image_url or image_url == '/logo.svg':
                try:
                    first_product = ProductModel.query.options(
                        joinedload(ProductModel.product_images)
                    ).filter_by(category_id=cat.id).first()
                    if first_product:
                        if first_product.product_images:
                            images_sorted = sorted(first_product.product_images, key=lambda x: x.image_order)
                            if images_sorted:
                                image_url = images_sorted[0].image_url
                        elif first_product.images:
                            image_url = first_product.images[0] if len(first_product.images) > 0 else None
                except Exception as inner_e:
                    print("Error loading category product image:", inner_e)
                    
            result.append({
                "id": str(cat.id),
                "_id": str(cat.id),
                "name": cat.name,
                "name_en": cat.name_en or cat.name,
                "name_hi": cat.name_hi or cat.name,
                "image_url": image_url if (image_url and image_url != "/logo.svg") else None
            })
        categories_cache.set('all_categories', result)
        return jsonify(result), 200
    except Exception as e:
        print("Error fetching categories:", e)
        return jsonify([]), 200

@products_bp.route('/collections', methods=['GET'])
def get_all_collections():
    from backend.models.collection import CollectionModel
    try:
        collections = CollectionModel.query.filter_by(is_active=True).order_by(CollectionModel.display_order.asc(), CollectionModel.id.asc()).all()
        return jsonify([c.to_dict() for c in collections]), 200
    except Exception as e:
        print("Error fetching collections:", e)
        return jsonify([]), 200

@products_bp.route('/<id>', methods=['GET'])
def get_product(id):
    from backend.services.catalog_aggregation_service import catalog_aggregation_service
    product = catalog_aggregation_service.get_product_by_id(id)
    if not product:
        product = ProductModel.find_by_id(id)
        if not product:
            return jsonify({"message": "Product not found!"}), 404
        reviews = ReviewModel.find_by_product_id(id)
        product['reviews'] = reviews
    return jsonify(product), 200

@products_bp.route('/categories/<category_name>/attributes', methods=['GET'])
def get_category_attributes(category_name):
    from backend.utils.cache import category_attributes_cache
    cache_key = f"attrs_{category_name}"
    cached_val = category_attributes_cache.get(cache_key)
    if cached_val is not None:
        return jsonify(cached_val), 200

    from backend.models.product import CategoryAttributeModel
    attrs = CategoryAttributeModel.query.filter_by(category_name=category_name).all()
    result = [a.to_dict() for a in attrs]
    category_attributes_cache.set(cache_key, result)
    return jsonify(result), 200


@products_bp.route('/<id>/review', methods=['POST'])
@token_required
def add_review(current_user, id):
    product = ProductModel.find_by_id(id)
    if not product:
        return jsonify({"message": "Product not found!"}), 404
        
    data = request.get_json() or {}
    rating = data.get("rating")
    comment = data.get("comment", "")
    
    if rating is None or not (1 <= int(rating) <= 5):
        return jsonify({"message": "Rating must be an integer between 1 and 5."}), 400
        
    review = ReviewModel.create_review(id, current_user["name"], rating, comment)
    return jsonify({
        "message": "Review submitted successfully!",
        "review": review
    }), 201

# Add Product (Owner or Seller)
@products_bp.route('', methods=['POST'])
@token_required
def create_product(current_user):
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    
    if not (is_admin or role in ("owner", "admin", "seller", "superadmin")):
        return jsonify({"message": "Access denied! Seller or Owner privileges required."}), 403

    data = request.get_json() or {}
    name = (data.get("name") or data.get("title") or "").strip()
    raw_price = data.get("price") if data.get("price") is not None else data.get("selling_price")
    raw_stock = data.get("stock") if data.get("stock") is not None else data.get("available_stock")
    raw_category = data.get("category") or data.get("category_id")

    # Precise validation with meaningful error messages
    if not name:
        return jsonify({"message": "Craft title/name is required."}), 400

    if raw_price is None or str(raw_price).strip() == "" or str(raw_price).lower() == "nan":
        return jsonify({"message": "Selling price is required."}), 400
    try:
        price = float(raw_price)
        if price <= 0:
            return jsonify({"message": "Selling price must be greater than 0."}), 400
    except (ValueError, TypeError):
        return jsonify({"message": "Selling price must be a valid number."}), 400

    if not raw_category or str(raw_category).strip() == "" or str(raw_category).lower() in ("nan", "null"):
        return jsonify({"message": "Product category is required."}), 400

    if raw_stock is None or str(raw_stock).strip() == "" or str(raw_stock).lower() == "nan":
        return jsonify({"message": "Available stock units is required."}), 400
    try:
        stock = int(raw_stock)
        if stock < 0:
            return jsonify({"message": "Available stock units must be a non-negative integer."}), 400
    except (ValueError, TypeError):
        return jsonify({"message": "Available stock units must be a valid integer."}), 400

    # Resolve category consistently (both category_id and category name)
    from backend.models.category import Category
    category_obj = None
    if isinstance(raw_category, int) or (isinstance(raw_category, str) and raw_category.isdigit()):
        category_obj = Category.query.get(int(raw_category))
    if not category_obj and isinstance(raw_category, str):
        category_obj = Category.query.filter(
            (Category.name.ilike(raw_category.strip())) | (Category.name_en.ilike(raw_category.strip()))
        ).first()
    if not category_obj and data.get("category_id") and str(data.get("category_id")).isdigit():
        try:
            category_obj = Category.query.get(int(data.get("category_id")))
        except Exception:
            pass
    if not category_obj and data.get("category"):
        cat_name_str = str(data.get("category")).strip()
        category_obj = Category.query.filter(
            (Category.name.ilike(cat_name_str)) | (Category.name_en.ilike(cat_name_str))
        ).first()

    if category_obj:
        data["category_id"] = category_obj.id
        data["category"] = category_obj.name
        category_log = category_obj.name
    else:
        category_log = str(raw_category)
        data["category"] = category_log

    data["name"] = name
    data["title"] = name
    data["price"] = price
    data["selling_price"] = price
    data["stock"] = stock
    data["available_stock"] = stock

    # Optional fields mapping
    raw_orig = data.get("original_mrp") if data.get("original_mrp") is not None else data.get("original_price")
    if raw_orig is not None and str(raw_orig).strip() != "" and str(raw_orig).lower() not in ("nan", "null"):
        try:
            orig_val = float(raw_orig)
            if orig_val < 0:
                return jsonify({"message": "Original MRP cannot be negative."}), 400
            data["original_price"] = orig_val
            data["original_mrp"] = orig_val
            if orig_val > price:
                data["discount"] = round(((orig_val - price) / orig_val) * 100, 2)
        except (ValueError, TypeError):
            return jsonify({"message": "Original MRP must be a valid number."}), 400

    creator_name = current_user.get("name") or current_user.get("username") or "Admin"
    artisan_name = (data.get("artisan_name") or "").strip()
    if not artisan_name:
        artisan_name = creator_name
    data["artisan_name"] = artisan_name
    data["created_by"] = artisan_name
    data["admin_name"] = creator_name

    image_url = (data.get("image_url") or "").strip()
    if image_url:
        data["image_url"] = image_url
        if not data.get("images") or len(data.get("images")) == 0:
            data["images"] = [image_url, image_url]

    materials = (data.get("materials") or "").strip()
    origin = (data.get("craft_origin") or data.get("origin") or "").strip()
    data["materials"] = materials
    data["origin"] = origin
    data["craft_origin"] = origin
    data["features_en"] = data.get("features_en") or materials
    data["specifications_en"] = data.get("specifications_en") or origin

    from backend.services.seller_database_service import seller_db_service
    seller_uid = int(current_user["_id"])

    # Determine seller identity strictly from backend authentication
    if role == "seller" and not is_admin:
        # Authenticated seller: seller_id is ALWAYS their authenticated database ID
        data["seller_id"] = seller_uid

        # Route to isolated database (DB2) if seller is isolated
        if seller_db_service.is_isolated_seller(seller_uid):
            data["artisan_name"] = artisan_name
            created_prod = seller_db_service.create_product(seller_uid, data)
            return jsonify({
                "message": "Product created successfully!",
                "product": created_prod
            }), 201
    else:
        # Main Owner: can assign to a seller if specified and validated, or owner-owned (None)
        req_seller = data.get("seller_id")
        if req_seller:
            try:
                from backend.models.user import UserModel
                s_rec = UserModel.query.get(int(req_seller))
                if s_rec and str(s_rec.role).lower() == "seller":
                    data["seller_id"] = int(s_rec.id)
                else:
                    data["seller_id"] = None
            except Exception:
                data["seller_id"] = None
        else:
            data["seller_id"] = None

    product = ProductModel.create_product(data)
    
    # Invalidate category and product cache
    from backend.utils.cache import categories_cache, products_cache
    categories_cache.clear()
    products_cache.clear()
    
    # Audit Log
    from backend.utils.audit import log_admin_action
    log_admin_action("Product Added", "Product Management", f"Added product: '{name}' (Category: '{category_log}', Price: ₹{price}, Stock: {stock})")
    
    return jsonify({
        "message": "Product created successfully!",
        "product": product
    }), 201

# Update Product (Owner or Product Owner Seller)
@products_bp.route('/<id>', methods=['PUT'])
@token_required
def update_product(current_user, id):
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    
    if not (is_admin or role in ("owner", "admin", "seller", "superadmin")):
        return jsonify({"message": "Access denied!"}), 403

    from backend.services.seller_database_service import seller_db_service
    seller_uid = int(current_user["_id"])
    data = request.get_json() or {}

    from backend.services.catalog_aggregation_service import parse_product_composite_id
    p_type, s_id, local_id = parse_product_composite_id(id)

    # Route seller composite ID: 'seller_{seller_id}_{local_id}'
    if p_type == 'seller' and s_id and local_id:
        if role == "seller" and not is_admin and s_id != seller_uid:
            return jsonify({"message": "You are not authorized to modify another artisan's product."}), 403
        try:
            updated_p = seller_db_service.update_product(s_id, local_id, data)
            return jsonify({
                "message": "Product updated successfully!",
                "product": updated_p
            }), 200
        except LookupError:
            return jsonify({"message": "Product not found in your workshop database."}), 404
        except PermissionError:
            return jsonify({"message": "You are not authorized to modify this product."}), 403

    # If caller is an isolated seller, route update strictly to their database
    if role == "seller" and not is_admin and seller_db_service.is_isolated_seller(seller_uid):
        try:
            prod_id_int = local_id if local_id is not None else int(id)
            updated_p = seller_db_service.update_product(seller_uid, prod_id_int, data)
            return jsonify({
                "message": "Product updated successfully!",
                "product": updated_p
            }), 200
        except LookupError:
            return jsonify({"message": "Product not found in your workshop database."}), 404
        except PermissionError:
            return jsonify({"message": "You are not authorized to modify this product."}), 403

    product = ProductModel.find_by_id(id)
    if not product:
        return jsonify({"message": "Product not found!"}), 404
        
    # Verify ownership for sellers:
    if role == "seller" and not is_admin:
        if str(product.get("seller_id")) != str(current_user["_id"]):
            return jsonify({"message": "You are not authorized to modify this product."}), 403

    # Enforce isolation boundary: Another seller cannot modify an isolated seller's product
    if product.get("seller_id") and seller_db_service.is_isolated_seller(product.get("seller_id")):
        if str(product.get("seller_id")) != str(current_user["_id"]):
            return jsonify({"message": "You are not authorized to modify another artisan's private workshop product."}), 403

    # If seller, prevent changing seller_id
    if role == "seller" and not is_admin:
        data["seller_id"] = int(current_user["_id"])
        
    modifier_name = current_user.get("name") or current_user.get("username") or "Admin"
    data["modified_by"] = modifier_name
    data["admin_name"] = modifier_name
    data["performed_by"] = modifier_name
    data["user_role"] = "Owner" if (is_admin or role in ("owner", "admin")) else "Seller"
    data["user_id"] = int(current_user["_id"])
    updated_product = ProductModel.update_product(id, data)
    
    # Invalidate category and product cache
    from backend.utils.cache import categories_cache, products_cache
    categories_cache.clear()
    products_cache.clear()
    
    return jsonify({
        "message": "Product updated successfully!",
        "product": updated_product
    }), 200

# Delete Product (Owner or Product Owner Seller)
@products_bp.route('/<id>', methods=['DELETE'])
@token_required
def delete_product(current_user, id):
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    
    if not (is_admin or role in ("owner", "admin", "seller", "superadmin")):
        return jsonify({"message": "Access denied!"}), 403

    from backend.services.seller_database_service import seller_db_service
    seller_uid = int(current_user["_id"])

    from backend.services.catalog_aggregation_service import parse_product_composite_id
    p_type, s_id, local_id = parse_product_composite_id(id)

    # Route seller composite ID: 'seller_{seller_id}_{local_id}'
    if p_type == 'seller' and s_id and local_id:
        if role == "seller" and not is_admin and s_id != seller_uid:
            return jsonify({"message": "You are not authorized to delete another artisan's product."}), 403
        try:
            seller_db_service.delete_product(s_id, local_id)
            return jsonify({"message": "Product deleted successfully!"}), 200
        except LookupError:
            return jsonify({"message": "Product not found in your workshop database."}), 404
        except PermissionError:
            return jsonify({"message": "You are not authorized to modify this product."}), 403

    # If caller is an isolated seller, route deletion strictly to their database
    if role == "seller" and not is_admin and seller_db_service.is_isolated_seller(seller_uid):
        try:
            prod_id_int = local_id if local_id is not None else int(id)
            seller_db_service.delete_product(seller_uid, prod_id_int)
            return jsonify({"message": "Product deleted successfully!"}), 200
        except LookupError:
            return jsonify({"message": "Product not found in your workshop database."}), 404
        except PermissionError:
            return jsonify({"message": "You are not authorized to modify this product."}), 403

    product = ProductModel.find_by_id(id)
    if not product:
        return jsonify({"message": "Product not found!"}), 404
        
    # Verify ownership for sellers:
    if role == "seller" and not is_admin:
        if str(product.get("seller_id")) != str(current_user["_id"]):
            return jsonify({"message": "You are not authorized to modify this product."}), 403

    # Enforce isolation boundary: Another seller cannot delete an isolated seller's product
    if product.get("seller_id") and seller_db_service.is_isolated_seller(product.get("seller_id")):
        if str(product.get("seller_id")) != str(current_user["_id"]):
            return jsonify({"message": "You are not authorized to delete another artisan's private workshop product."}), 403

    success = ProductModel.delete_product(id)
    if not success:
        return jsonify({"message": "Failed to delete product."}), 500
        
    # Invalidate category and product cache
    from backend.utils.cache import categories_cache, products_cache
    categories_cache.clear()
    products_cache.clear()
        
    return jsonify({"message": "Product deleted successfully!"}), 200


# Dedicated Product Management Detail Endpoint (Owner & Seller with strict RBAC)
@products_bp.route('/<id>/management', methods=['GET'])
@token_required
def get_product_management_detail(current_user, id):
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    is_owner = is_admin or role in ("owner", "admin", "superadmin")
    is_seller = role == "seller"

    if not (is_owner or is_seller or role == "sub_owner"):
        return jsonify({"message": "Access denied. Management interface is restricted to platform owners and verified sellers."}), 403

    from backend.services.catalog_aggregation_service import parse_product_composite_id
    p_type, s_id, local_id = parse_product_composite_id(id)

    if p_type == 'seller' and s_id and local_id:
        if is_seller and not is_owner and s_id != int(current_user["_id"]):
            return jsonify({
                "message": "Access denied. You can only view and manage your own handcrafted products. Access to another artisan's inventory is strictly prohibited.",
                "error_code": "FORBIDDEN_ANOTHER_SELLER_PRODUCT",
                "seller_id": str(current_user["_id"]),
                "product_seller_id": str(s_id)
            }), 403
        from backend.services.seller_database_service import seller_db_service
        p = seller_db_service.get_product_by_id(s_id, local_id)
        if not p:
            return jsonify({"message": "Product not found!"}), 404

        from backend.models.user import UserModel
        seller_user = UserModel.find_by_id(s_id)
        seller_info = {
            "id": str(s_id),
            "name": seller_user.get("name") if seller_user else p.get("artisan_name"),
            "email": seller_user.get("email") if seller_user else "",
            "role": "seller",
            "store_name": p.get("artisan_name") or "Artisan Workshop",
            "artisan_cluster": p.get("origin") or "Artisan Cluster"
        }
        return jsonify({
            "product": p,
            "seller": seller_info,
            "is_owner": is_owner,
            "is_seller": is_seller,
            "can_manage_stock": True,
            "can_update_product": True
        }), 200

    try:
        prod_id = local_id if local_id is not None else int(id)
    except Exception:
        return jsonify({"message": "Invalid product ID"}), 400

    product = ProductModel.query.get(prod_id)
    if not product:
        return jsonify({"message": "Product not found!"}), 404

    # Critical Role Permission Enforcement: Seller can ONLY view their own product
    if is_seller and not is_owner:
        if str(product.seller_id) != str(current_user["_id"]):
            return jsonify({
                "message": "Access denied. You can only view and manage your own handcrafted products. Access to another artisan's inventory is strictly prohibited.",
                "error_code": "FORBIDDEN_ANOTHER_SELLER_PRODUCT",
                "seller_id": str(current_user["_id"]),
                "product_seller_id": str(product.seller_id)
            }), 403

    seller_info = None
    if product.seller:
        seller_info = {
            "id": str(product.seller.id),
            "name": product.seller.name,
            "email": product.seller.email,
            "role": product.seller.role,
            "store_name": getattr(product.seller, "store_name", None) or product.seller.name,
            "artisan_cluster": getattr(product.seller, "artisan_cluster", None)
        }
    else:
        seller_info = {
            "id": None,
            "name": product.created_by or "Main Platform Owner",
            "email": "owner@craftnest.internal",
            "role": "owner",
            "store_name": "CraftNest Heritage Vault",
            "artisan_cluster": "Central Platform Reserve"
        }

    return jsonify({
        "product": product.to_dict(),
        "seller": seller_info,
        "is_owner": is_owner,
        "is_seller": is_seller,
        "can_manage_stock": True,
        "can_update_product": True
    }), 200


# Stock Management Endpoint (Add, Reduce, Set with Backend Validation & Mandatory Audit)
@products_bp.route('/<id>/stock', methods=['PUT'])
@token_required
def manage_product_stock(current_user, id):
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    is_owner = is_admin or role in ("owner", "admin", "superadmin")
    is_seller = role == "seller"

    if not (is_owner or is_seller or role == "sub_owner"):
        return jsonify({"message": "Access denied. Inventory adjustment requires Owner or Seller privileges."}), 403

    from backend.services.catalog_aggregation_service import parse_product_composite_id
    p_type, s_id, local_id = parse_product_composite_id(id)

    from backend.services.seller_database_service import seller_db_service
    seller_uid = int(current_user["_id"])

    # If product is in a seller database or caller is isolated seller
    target_sid = s_id if (p_type == 'seller' and s_id) else (seller_uid if (is_seller and seller_db_service.is_isolated_seller(seller_uid)) else None)
    target_pid = local_id if (local_id is not None) else (int(id) if str(id).isdigit() else None)

    if target_sid:
        if is_seller and not is_owner and target_sid != seller_uid:
            return jsonify({"message": "Access denied. You cannot modify another artisan's inventory."}), 403
        data = request.get_json() or {}
        action = str(data.get("action") or "").strip().lower()
        value_raw = data.get("value") if data.get("value") is not None else (data.get("amount") if data.get("amount") is not None else data.get("quantity"))
        reason = str(data.get("reason") or data.get("stock_adjustment_reason") or "").strip()
        if not action or value_raw is None:
            return jsonify({"message": "Please provide 'action' (increase, decrease, set) and 'value'."}), 400
        try:
            val = int(value_raw)
        except (ValueError, TypeError):
            return jsonify({"message": "Stock value must be a valid integer."}), 400
        if val < 0:
            return jsonify({"message": "Stock adjustment value must be non-negative."}), 400
        ok, res = seller_db_service.adjust_stock(target_sid, target_pid, action, val, reason)
        if not ok:
            return jsonify({"message": res.get("message", "Failed to update stock.")}), 400
        return jsonify({
            "message": f"Stock successfully updated via '{action}'. New stock is {res['new_stock']} units.",
            "previous_stock": res["previous_stock"],
            "new_stock": res["new_stock"],
            "product": res["product"]
        }), 200

    product = ProductModel.query.get(prod_id)
    if not product:
        return jsonify({"message": "Product not found!"}), 404

    # Seller Ownership Verification
    if is_seller and not is_owner:
        if str(product.seller_id) != str(current_user["_id"]):
            return jsonify({"message": "Access denied. You can only adjust inventory levels for your own products."}), 403

    # Enforce isolation boundary: Another seller cannot adjust an isolated seller's product
    if product.seller_id and seller_db_service.is_isolated_seller(product.seller_id):
        if str(product.seller_id) != str(current_user["_id"]):
            return jsonify({"message": "Access denied. You cannot modify another artisan's private workshop inventory."}), 403

    data = request.get_json() or {}
    action = str(data.get("action") or "").strip().lower()
    value_raw = data.get("value") if data.get("value") is not None else (data.get("amount") if data.get("amount") is not None else data.get("quantity"))
    reason = str(data.get("reason") or data.get("stock_adjustment_reason") or "").strip()

    if not action or value_raw is None:
        return jsonify({"message": "Please provide 'action' (increase, decrease, set) and 'value'."}), 400

    try:
        val = int(value_raw)
    except (ValueError, TypeError):
        return jsonify({"message": "Stock value must be a valid integer."}), 400

    if val < 0:
        return jsonify({"message": "Stock adjustment value must be non-negative."}), 400

    user_name = current_user.get("name") or current_user.get("username") or "Admin"
    role_label = "Owner" if is_owner else "Seller"
    user_id = int(current_user["_id"])

    old_stock = int(product.stock or 0)

    # Validate action and compute resulting stock
    if action in ('increase', 'add'):
        new_stock = old_stock + val
        actual_reason = reason or "Manual Stock Addition from Artisan Batch"
        success, res = ProductModel.update_stock(
            prod_id, val, change_type='increase', admin_name=user_name,
            reason=actual_reason, performed_by=user_name, user_role=role_label, user_id=user_id
        )
    elif action in ('decrease', 'reduce'):
        if old_stock - val < 0:
            return jsonify({
                "message": f"Stock cannot become negative. Available stock is {old_stock} units; cannot reduce by {val} units.",
                "current_stock": old_stock,
                "requested_reduction": val
            }), 400
        new_stock = old_stock - val
        actual_reason = reason or "Manual Stock Reduction / Shrinkage"
        success, res = ProductModel.update_stock(
            prod_id, -val, change_type='decrease', admin_name=user_name,
            reason=actual_reason, performed_by=user_name, user_role=role_label, user_id=user_id
        )
    elif action in ('set', 'update'):
        new_stock = val
        actual_reason = reason or "Direct Inventory Level Reset"
        success, res = ProductModel.set_stock(
            prod_id, val, change_type='set', admin_name=user_name,
            reason=actual_reason, performed_by=user_name, user_role=role_label, user_id=user_id
        )
    else:
        return jsonify({"message": "Invalid action. Supported actions: 'increase', 'decrease', 'set'."}), 400

    if not success:
        return jsonify({"message": f"Failed to update stock: {res}"}), 400

    # Invalidate cache
    from backend.utils.cache import products_cache
    products_cache.clear()

    return jsonify({
        "message": f"Stock successfully updated via '{action}'. New stock is {new_stock} units.",
        "previous_stock": old_stock,
        "new_stock": new_stock,
        "product": res
    }), 200


# Product Audit Logs (Owner & Seller with strict RBAC and Pagination)
@products_bp.route('/<id>/logs', methods=['GET'])
@token_required
def get_product_logs(current_user, id):
    import math
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    is_owner = is_admin or role in ("owner", "admin", "superadmin")
    is_seller = role == "seller"

    if not (is_owner or is_seller or role == "sub_owner"):
        return jsonify({"message": "Access denied. Audit trail is restricted to Owner and Seller roles."}), 403

    from backend.services.catalog_aggregation_service import parse_product_composite_id
    p_type, s_id, local_id = parse_product_composite_id(id)

    from backend.services.seller_database_service import seller_db_service
    seller_uid = int(current_user["_id"])

    if p_type == 'seller' and s_id and local_id:
        if is_seller and not is_owner and s_id != seller_uid:
            return jsonify({"message": "Access denied. You can only view the audit trail for your own handcrafted products."}), 403
        page = request.args.get('page', default=1, type=int)
        limit = request.args.get('limit', default=10, type=int)
        return jsonify(seller_db_service.get_stock_history(s_id, local_id, page=page, limit=limit)), 200

    try:
        prod_id = local_id if local_id is not None else int(id)
    except Exception:
        return jsonify({"message": "Invalid product ID"}), 400

    product = ProductModel.query.get(prod_id)
    if not product:
        return jsonify({"message": "Product not found!"}), 404

    # Seller Ownership Verification
    if is_seller and not is_owner:
        if str(product.seller_id) != str(current_user["_id"]):
            return jsonify({"message": "Access denied. You can only view the audit trail for your own handcrafted products."}), 403

    from backend.models.product import ProductAuditLogModel
    query = ProductAuditLogModel.query.filter_by(product_id=prod_id).order_by(ProductAuditLogModel.created_at.desc())
    
    page = request.args.get('page', default=1, type=int)
    limit = request.args.get('limit', default=10, type=int)
    if limit > 100: limit = 100
    if page < 1: page = 1

    total = query.count()
    pages = max(1, math.ceil(total / limit))
    logs = query.offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        "items": [log.to_dict() for log in logs],
        "total": total,
        "page": page,
        "pages": pages,
        "limit": limit
    }), 200


# Product Stock History (Owner & Seller with strict RBAC and Pagination)
@products_bp.route('/<id>/stock-history', methods=['GET'])
@token_required
def get_product_stock_history(current_user, id):
    import math
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    is_owner = is_admin or role in ("owner", "admin", "superadmin")
    is_seller = role == "seller"

    if not (is_owner or is_seller or role == "sub_owner"):
        return jsonify({"message": "Access denied. Stock history is restricted to Owner and Seller roles."}), 403

    from backend.services.catalog_aggregation_service import parse_product_composite_id
    p_type, s_id, local_id = parse_product_composite_id(id)

    from backend.services.seller_database_service import seller_db_service
    seller_uid = int(current_user["_id"])

    target_sid = s_id if (p_type == 'seller' and s_id) else (seller_uid if (is_seller and seller_db_service.is_isolated_seller(seller_uid)) else None)
    target_pid = local_id if (local_id is not None) else (int(id) if str(id).isdigit() else None)

    if target_sid and target_pid:
        if is_seller and not is_owner and target_sid != seller_uid:
            return jsonify({"message": "Access denied. You cannot view another artisan's private workshop stock history."}), 403
        page = request.args.get('page', default=1, type=int)
        limit = request.args.get('limit', default=10, type=int)
        return jsonify(seller_db_service.get_stock_history(target_sid, target_pid, page=page, limit=limit)), 200

    try:
        prod_id = local_id if local_id is not None else int(id)
    except Exception:
        return jsonify({"message": "Invalid product ID"}), 400

    product = ProductModel.query.get(prod_id)
    if not product:
        return jsonify({"message": "Product not found!"}), 404

    # Seller Ownership Verification
    if is_seller and not is_owner:
        if str(product.seller_id) != str(current_user["_id"]):
            return jsonify({"message": "Access denied. You can only view stock history for your own handcrafted products."}), 403

    # Enforce isolation boundary: Another seller cannot view an isolated seller's product stock history
    if product.seller_id and seller_db_service.is_isolated_seller(product.seller_id):
        if str(product.seller_id) != str(current_user["_id"]):
            return jsonify({"message": "Access denied. You cannot view another artisan's private workshop stock history."}), 403

    from backend.models.product import StockHistoryModel
    query = StockHistoryModel.query.filter_by(product_id=prod_id).order_by(StockHistoryModel.created_at.desc())

    page = request.args.get('page', default=1, type=int)
    limit = request.args.get('limit', default=10, type=int)
    if limit > 100: limit = 100
    if page < 1: page = 1

    total = query.count()
    pages = max(1, math.ceil(total / limit))
    history = query.offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        "items": [h.to_dict() for h in history],
        "total": total,
        "page": page,
        "pages": pages,
        "limit": limit
    }), 200

# Admin: Product Sales Analytics
@products_bp.route('/<id>/sales', methods=['GET'])
@admin_required
def get_product_sales(id):
    from backend.models.order import OrderItem, OrderModel, Transaction
    from backend.models.user import UserModel
    try:
        prod_id = int(id)
    except Exception:
        return jsonify({"message": "Invalid product ID"}), 400
        
    items = db.session.query(
        OrderItem,
        OrderModel,
        Transaction,
        UserModel
    ).join(
        OrderModel,
        OrderItem.order_id == OrderModel.id
    ).outerjoin(
        Transaction,
        Transaction.order_id == OrderModel.id
    ).outerjoin(
        UserModel,
        UserModel.id == OrderModel.user_id
    ).filter(
        OrderItem.product_id == prod_id
    ).order_by(
        OrderModel.created_at.desc()
    ).all()
    
    sales_list = []
    total_sold = 0
    total_revenue = 0.0
    
    for item, order, tx, user in items:
        qty = int(item.quantity)
        price = float(item.price)
        total = qty * price
        
        customer_name = user.full_name if user else (order.shipping_address.get("name") if order.shipping_address else "Guest")
        payment_method = tx.payment_method if tx else "Online"
        
        sales_list.append({
            "order_id": order.order_id,
            "date": format_iso_datetime(order.created_at),
            "quantity": qty,
            "price": price,
            "total": total,
            "status": order.order_status,
            "customer_name": customer_name,
            "payment_method": payment_method
        })
        
        if order.order_status not in ["Cancelled", "Returned", "Rejected"]:
            total_sold += qty
            total_revenue += total
            
    # Aggregate sales by date
    daily_sales = {}
    for s in sales_list:
        if s["status"] not in ["Cancelled", "Returned", "Rejected"]:
            dt_str = s["date"][:10]
            daily_sales[dt_str] = daily_sales.get(dt_str, 0.0) + s["total"]
            
    daily_sales_list = [{"date": k, "revenue": v} for k, v in sorted(daily_sales.items())]
    
    return jsonify({
        "sales": sales_list,
        "total_sold": total_sold,
        "total_revenue": round(total_revenue, 2),
        "daily_sales": daily_sales_list
    }), 200

# Admin: Upload Image (Cloudinary or Local fallback)
@products_bp.route('/upload', methods=['POST'])
@admin_required
def upload_image():
    if 'image' not in request.files:
        return jsonify({"message": "No file uploaded."}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({"message": "No file selected."}), 400
    filename, validation_error = validate_image_upload(file)
    if validation_error:
        return jsonify({"message": validation_error}), 400
        
    if CLOUDINARY_ENABLED:
        try:
            upload_result = cloudinary.uploader.upload(file)
            return jsonify({
                "message": "Image uploaded successfully to Cloudinary!",
                "url": upload_result.get("secure_url")
            }), 200
        except Exception as e:
            print(f"Cloudinary upload failed: {e}. Falling back to local.")
            # Cloudinary may consume the multipart stream before raising. Reset
            # it so the local fallback writes the complete original image.
            file.stream.seek(0)
            
    # Local fallback
    try:
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        if os.path.getsize(filepath) == 0:
            os.remove(filepath)
            raise ValueError("Uploaded image was empty after local persistence.")
        
        url = f"/static/uploads/{filename}"
        return jsonify({
            "message": "Image uploaded successfully to local storage!",
            "url": url
        }), 200
    except Exception as ex:
        return jsonify({"message": f"Failed to upload image locally: {str(ex)}"}), 500


@products_bp.route('/upload-video', methods=['POST'])
@admin_required
def upload_video():
    file = request.files.get('video') or request.files.get('file')
    filename, validation_error = validate_video_upload(file)
    if validation_error:
        return jsonify({"message": validation_error}), 400

    if CLOUDINARY_ENABLED:
        try:
            upload_result = cloudinary.uploader.upload(
                file,
                resource_type="video",
                folder="ssjewellery/video-showcase",
            )
            url = upload_result.get("secure_url")
            if not url:
                raise ValueError("Cloudinary did not return a video URL.")
            return jsonify({"message": "Video uploaded successfully!", "url": url}), 200
        except Exception as exc:
            print(f"Cloudinary video upload failed: {exc}. Falling back to local.")
            file.stream.seek(0)

    try:
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        if os.path.getsize(filepath) == 0:
            os.remove(filepath)
            raise ValueError("Uploaded video was empty after local persistence.")
        return jsonify({
            "message": "Video uploaded successfully!",
            "url": f"/static/uploads/{filename}",
        }), 200
    except Exception as exc:
        return jsonify({"message": f"Failed to upload video: {str(exc)}"}), 500


# User: Request to Buy Out-of-Stock Product
@products_bp.route('/<id>/request-buy', methods=['POST'])
@token_required
def request_buy_product(current_user, id):
    try:
        prod_id = int(id)
    except Exception:
        return jsonify({"message": "Invalid product ID"}), 400
        
    from backend.models.product import ProductModel, BuyRequestModel
    from backend.models.admin import add_admin_notification
    
    try:
        product = ProductModel.query.with_for_update().get(prod_id)
        if not product:
            return jsonify({"message": "Product not found!"}), 404
            
        if product.stock > 0:
            return jsonify({"message": "Product is in stock. You can buy it directly!"}), 400
            
        data = request.get_json() or {}
        quantity = int(data.get("quantity", 1))
        selected_variant_raw = data.get("selected_variant", "")
        city = data.get("city")
        
        if not city:
            return jsonify({"message": "Location/City is required."}), 400
            
        # Format selected_variant if it is a dictionary/object
        if isinstance(selected_variant_raw, dict):
            variant_parts = []
            for k, v in selected_variant_raw.items():
                if v:
                    variant_parts.append(f"{k}: {v}")
            selected_variant = ", ".join(variant_parts)
        else:
            selected_variant = str(selected_variant_raw)
            
        # Check if this user has already requested to buy this product and it is still pending
        existing_request = BuyRequestModel.query.filter_by(
            product_id=prod_id, 
            user_id=int(current_user["_id"]),
            status='Pending'
        ).with_for_update().first()
        
        if existing_request:
            return jsonify({
                "message": "You already have a pending buy request for this product.",
                "success": True
            }), 200
    except Exception as e:
        db.session.rollback()
        print("Pre-checks for buy request failed:", e)
        return jsonify({"message": f"Failed to verify request: {str(e)}"}), 500
        
    try:
        buy_request = BuyRequestModel(
            product_id=prod_id,
            user_id=int(current_user["_id"]),
            product_name=product.name,
            quantity=quantity,
            selected_variant=selected_variant,
            city=city,
            status='Pending'
        )
        db.session.add(buy_request)
        db.session.commit()
        
        # Trigger Admin Notification
        variant_info = f" ({selected_variant})" if selected_variant else ""
        notification_msg = (
            f"New Buy Request\n"
            f"Product:\n{product.name}{variant_info}\n"
            f"Customer:\n{current_user['name']}\n"
            f"City:\n{city}\n"
            f"Quantity:\n{quantity}"
        )
        add_admin_notification(
            title="Buy Request Received",
            message=notification_msg,
            type="BUY_REQUEST",
            user_id=int(current_user["_id"])
        )
        
        return jsonify({
            "message": "Buy request submitted successfully!",
            "buy_request": buy_request.to_dict(),
            "success": True
        }), 201
    except Exception as e:
        db.session.rollback()
        print("Failed to save buy request:", e)
        return jsonify({"message": f"Failed to submit buy request: {str(e)}"}), 500


@products_bp.route('/category-stock-distribution', methods=['GET'])
@token_required
def get_category_stock_distribution(current_user):
    """
    Computes real-time Category Stock Value Distribution:
    Category Stock Value = SUM(Product Price * Available Stock Quantity)
    - If Admin: all platform products
    - If Seller: only products belonging to that seller
    - Includes 'Uncategorized' if category is missing
    """
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    uid = str(current_user.get("_id") or current_user.get("id"))
    is_owner_admin = is_admin or role in ("owner", "admin", "superadmin", "sub_owner", "subowner")
    is_seller = (role == "seller")

    if not is_owner_admin and not is_seller:
        return jsonify({"message": "Access denied! Privileged access required."}), 403

    from backend.services.seller_database_service import seller_db_service
    if is_seller and not is_owner_admin and seller_db_service.is_isolated_seller(uid):
        return jsonify(seller_db_service.get_category_stock_distribution(int(uid))), 200

    from sqlalchemy.orm import joinedload
    query = ProductModel.query.options(joinedload(ProductModel.category))

    if is_seller and not is_owner_admin:
        try:
            sid = int(uid)
            query = query.filter_by(seller_id=sid)
        except Exception:
            return jsonify({"total_stock_value": 0.0, "total_products": 0, "categories": []}), 200

    products = query.all()

    category_map = {}
    total_catalog_value = 0.0
    total_products_count = len(products)
    total_stock_units = 0

    for prod in products:
        cat_name = prod.category.name if (prod.category and prod.category.name) else "Uncategorized"
        price = float(prod.price or 0.0)
        stock = int(prod.stock or 0)
        stock_value = price * stock

        total_catalog_value += stock_value
        total_stock_units += stock

        if cat_name not in category_map:
            category_map[cat_name] = {
                "category_name": cat_name,
                "products_count": 0,
                "stock_value": 0.0,
                "total_units": 0
            }
        category_map[cat_name]["products_count"] += 1
        category_map[cat_name]["stock_value"] += stock_value
        category_map[cat_name]["total_units"] += stock

    # Convert to list and compute percentages
    categories = []
    for cat_name, info in category_map.items():
        percentage = round((info["stock_value"] / total_catalog_value * 100), 1) if total_catalog_value > 0 else 0.0
        categories.append({
            "category_name": cat_name,
            "products_count": info["products_count"],
            "stock_value": round(info["stock_value"], 2),
            "total_units": info["total_units"],
            "percentage": percentage
        })

    # Sort descending by stock_value
    categories.sort(key=lambda c: c["stock_value"], reverse=True)

    return jsonify({
        "success": True,
        "total_stock_value": round(total_catalog_value, 2),
        "total_products": total_products_count,
        "total_stock_units": total_stock_units,
        "categories": categories
    }), 200


@products_bp.route('/low-stock-warnings', methods=['GET'])
@token_required
def get_low_stock_warnings(current_user):
    """
    Returns products requiring stock attention (stock <= 10):
    - stock == 0: Out of Stock
    - 1 <= stock <= 10: Low Stock
    - stock > 10: Excluded
    - If Admin: platform-wide products
    - If Seller: only their own products
    """
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    uid = str(current_user.get("_id") or current_user.get("id"))
    is_owner_admin = is_admin or role in ("owner", "admin", "superadmin", "sub_owner", "subowner")
    is_seller = (role == "seller")

    if not is_owner_admin and not is_seller:
        return jsonify({"message": "Access denied! Privileged access required."}), 403

    from backend.services.seller_database_service import seller_db_service
    if is_seller and not is_owner_admin and seller_db_service.is_isolated_seller(uid):
        return jsonify(seller_db_service.get_low_stock_warnings(int(uid))), 200

    from sqlalchemy.orm import joinedload, selectinload
    query = ProductModel.query.options(
        joinedload(ProductModel.category),
        joinedload(ProductModel.seller),
        selectinload(ProductModel.product_images)
    ).filter(ProductModel.stock <= 10)

    if is_seller and not is_owner_admin:
        try:
            sid = int(uid)
            query = query.filter_by(seller_id=sid)
        except Exception:
            return jsonify({"success": True, "count": 0, "products": []}), 200

    raw_products = query.all()

    # Sort: stock == 0 first, then stock ascending
    raw_products.sort(key=lambda p: (0 if (p.stock or 0) == 0 else 1, int(p.stock or 0)))

    results = []
    for p in raw_products:
        p_dict = p.to_dict()
        stk = int(p.stock or 0)
        image = p_dict.get("images", [""])[0] if p_dict.get("images") else ""
        results.append({
            "id": p.id,
            "_id": str(p.id),
            "name": p.name,
            "category": p.category.name if (p.category and p.category.name) else "Uncategorized",
            "category_id": p.category_id,
            "price": float(p.price or 0.0),
            "stock": stk,
            "image": image,
            "warning_type": "out_of_stock" if stk == 0 else "low_stock",
            "warning_label": "Out of Stock" if stk == 0 else f"Low Stock ({stk} units left)",
            "seller_id": str(p.seller_id) if p.seller_id else None,
            "seller_name": p_dict.get("seller_name") or "Main Owner",
            "can_manage": True if is_owner_admin else (str(p.seller_id) == str(uid))
        })

    return jsonify({
        "success": True,
        "count": len(results),
        "products": results
    }), 200
