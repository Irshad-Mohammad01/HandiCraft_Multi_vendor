from backend.extensions import db
from datetime import datetime
import pytz
from backend.utils.timezone import format_iso_datetime, get_ist_time

class ProductImageModel(db.Model):
    __tablename__ = 'product_images'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    image_url = db.Column(db.String(512), nullable=False)
    image_order = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))

class ProductModel(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    discount = db.Column(db.Numeric(5, 2), default=0.00)
    description = db.Column(db.Text)
    images = db.Column(db.JSON) # JSON array of image URLs
    stock = db.Column(db.Integer, default=0)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    collection_id = db.Column(db.Integer, db.ForeignKey('collections.id', ondelete='SET NULL'), nullable=True)
    ratings = db.Column(db.Numeric(3, 2), default=5.00)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')), onupdate=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    discount_applied_at = db.Column(db.DateTime, nullable=True)
    name_translations = db.Column(db.JSON, nullable=True)
    description_translations = db.Column(db.JSON, nullable=True)
    
    created_by = db.Column(db.String(255), default="admin", nullable=True)
    modified_by = db.Column(db.String(255), default="admin", nullable=True)
    status = db.Column(db.String(50), default='active', server_default='active')
    show_on_homepage = db.Column(db.Boolean, default=False, nullable=False, server_default='false')
    show_on_home = db.Column(db.Boolean, default=False, nullable=True, server_default='false')

    # Multilingual fields
    name_en = db.Column(db.String(255), nullable=True)
    name_hi = db.Column(db.String(255), nullable=True)
    description_en = db.Column(db.Text, nullable=True)
    description_hi = db.Column(db.Text, nullable=True)
    features_en = db.Column(db.Text, nullable=True)
    features_hi = db.Column(db.Text, nullable=True)
    specifications_en = db.Column(db.Text, nullable=True)
    specifications_hi = db.Column(db.Text, nullable=True)

    # Relationships
    product_images = db.relationship('ProductImageModel', backref='product', cascade='all, delete-orphan', order_by='ProductImageModel.image_order', lazy=True)
    reviews = db.relationship('ReviewModel', backref='product', cascade='all, delete-orphan', lazy=True)
    cart_items = db.relationship('CartItem', backref='product', cascade='all, delete-orphan', lazy=True)
    wishlist_items = db.relationship('Wishlist', backref='product', cascade='all, delete-orphan', lazy=True)
    order_items = db.relationship('OrderItem', backref='product', lazy=True)
    variants = db.relationship('ProductVariantModel', backref='product', cascade='all, delete-orphan', lazy=True)
    seller = db.relationship('UserModel', foreign_keys=[seller_id], backref='seller_products', lazy=True)

    def to_dict(self):
        from flask import request
        lang = None
        try:
            if request:
                lang = request.args.get('lang') or request.headers.get('Accept-Language')
                if lang:
                    lang = lang.split(',')[0].split('-')[0].strip().lower()
        except Exception:
            pass

        # Language display logic
        if lang == 'hi':
            name = self.name_hi or self.name_en or self.name
            description = self.description_hi or self.description_en or self.description or ""
            features = self.features_hi or self.features_en or ""
            specifications = self.specifications_hi or self.specifications_en or ""
        else:
            name = self.name_en or self.name
            description = self.description_en or self.description or ""
            features = self.features_en or ""
            specifications = self.specifications_en or ""

        # Fetch image URLs from product_images table if present, otherwise fallback to images JSON column
        if self.product_images:
            image_urls = [img.image_url for img in sorted(self.product_images, key=lambda x: x.image_order)]
        else:
            image_urls = self.images or []

        cat_name = self.category.name if self.category else "Uncategorized"
        try:
            from backend.utils.cache import category_attributes_cache
            cache_key = f"attrs_{cat_name}"
            attributes_list = category_attributes_cache.get(cache_key)
            if attributes_list is None:
                from backend.models.product import CategoryAttributeModel
                attributes = CategoryAttributeModel.query.filter_by(category_name=cat_name).all()
                attributes_list = [attr.to_dict() for attr in attributes]
                category_attributes_cache.set(cache_key, attributes_list)
        except Exception:
            attributes_list = []

        try:
            variants_list = [v.to_dict() for v in self.variants]
        except Exception:
            variants_list = []

        coll_name = self.collection.name if hasattr(self, 'collection') and self.collection else None
        coll_id = str(self.collection_id) if hasattr(self, 'collection_id') and self.collection_id else None

        if hasattr(self, '_prefetched_review_count'):
            review_count = self._prefetched_review_count
        else:
            try:
                from sqlalchemy import inspect as sqla_inspect
                insp = sqla_inspect(self)
                if insp and hasattr(insp, 'unloaded') and 'reviews' not in insp.unloaded:
                    review_count = len(self.reviews) if self.reviews else 0
                else:
                    from backend.models.review import ReviewModel
                    review_count = db.session.query(db.func.count(ReviewModel.id)).filter_by(product_id=self.id).scalar() or 0
            except Exception:
                review_count = 0

        orig_price = round(float(self.price) / (1 - float(self.discount) / 100), 2) if (self.discount and float(self.discount) > 0 and float(self.discount) < 100) else float(self.price)
        artisan_label = self.created_by or (self.seller.name if self.seller else "Craft Artisan")
        img_first = image_urls[0] if image_urls else ""

        return {
            "id": str(self.id),
            "_id": str(self.id),
            "name": name,
            "title": name,
            "price": float(self.price),
            "selling_price": float(self.price),
            "discount": float(self.discount),
            "original_price": orig_price,
            "original_mrp": orig_price,
            "description": description,
            "features": features,
            "specifications": specifications,
            "materials": self.features_en or features or "",
            "origin": self.specifications_en or specifications or "",
            "craft_origin": self.specifications_en or specifications or "",
            "images": image_urls,
            "image_url": img_first,
            "stock": int(self.stock),
            "available_stock": int(self.stock),
            "category": cat_name,
            "category_id": str(self.category_id) if self.category_id else None,
            "collection_id": coll_id,
            "collection": coll_name,
            "collection_name": coll_name,
            "category_attributes": attributes_list,
            "ratings": float(self.ratings) if self.ratings is not None else 5.0,
            "review_count": review_count,
            "variants": variants_list,
            "created_at": format_iso_datetime(self.created_at),
            "updated_at": format_iso_datetime(self.updated_at),
            "discount_applied_at": format_iso_datetime(self.discount_applied_at),
            "created_by": self.created_by or "admin",
            "modified_by": self.modified_by or "admin",
            "artisan_name": artisan_label,
            "seller_id": str(self.seller_id) if self.seller_id else None,
            "seller_name": (self.seller.name if (self.seller and hasattr(self.seller, 'name')) else (self.created_by or "Main Owner")),
            "status": self.status or "active",
            "show_on_homepage": bool(self.show_on_homepage or self.show_on_home),
            "show_on_home": bool(self.show_on_home if self.show_on_home is not None else self.show_on_homepage),
            
            # Keep name_translations and description_translations if any other code expects it
            "name_translations": self.name_translations or {},
            "description_translations": self.description_translations or {},
            
            # Multilingual properties
            "name_en": self.name_en or self.name,
            "name_hi": self.name_hi or "",
            "description_en": self.description_en or self.description or "",
            "description_hi": self.description_hi or "",
            "features_en": self.features_en or "",
            "features_hi": self.features_hi or "",
            "specifications_en": self.specifications_en or "",
            "specifications_hi": self.specifications_hi or ""
        }

    @staticmethod
    def get_all(category=None, search_query=None, homepage_only=False, collection=None, page=None, limit=None, seller_id=None):
        from sqlalchemy.orm import joinedload, selectinload
        from backend.models.collection import CollectionModel
        query = ProductModel.query.options(
            joinedload(ProductModel.category),
            joinedload(ProductModel.collection),
            joinedload(ProductModel.seller),
            selectinload(ProductModel.product_images),
            selectinload(ProductModel.variants)
        )
        
        if homepage_only:
            hp_query = query.filter(ProductModel.show_on_homepage == True)
            raw_items = hp_query.order_by(ProductModel.created_at.desc()).all()
            if not raw_items:
                raw_items = query.order_by(ProductModel.created_at.desc()).all()
            p_ids = [p.id for p in raw_items if p.id]
            if p_ids:
                from backend.models.review import ReviewModel
                from sqlalchemy import func
                counts = dict(
                    db.session.query(ReviewModel.product_id, func.count(ReviewModel.id))
                    .filter(ReviewModel.product_id.in_(p_ids))
                    .group_by(ReviewModel.product_id)
                    .all()
                )
                for p in raw_items:
                    p._prefetched_review_count = counts.get(p.id, 0)
            return [p.to_dict() for p in raw_items]



            
        if category and category != 'All':
            from backend.models.category import Category
            from sqlalchemy import func
            cat_str = str(category).strip()
            if cat_str.isdigit():
                cat_query = query.filter(ProductModel.category_id == int(cat_str))
            else:
                cat_lower = cat_str.lower()
                cat_query = query.join(Category).filter(
                    (func.lower(Category.name) == cat_lower) |
                    (func.lower(Category.name_en) == cat_lower) |
                    (func.lower(Category.name_hi) == cat_lower)
                )
            if cat_query.count() > 0:
                query = cat_query

        if collection and collection != 'All':
            coll_str = str(collection).strip()
            if coll_str.isdigit():
                coll_query = query.filter(ProductModel.collection_id == int(coll_str))
            else:
                from sqlalchemy import func
                coll_lower = coll_str.lower()
                coll_slug_lower = coll_lower.replace(' ', '-')
                coll_query = query.outerjoin(CollectionModel).filter(
                    (func.lower(CollectionModel.name) == coll_lower) | 
                    (func.lower(CollectionModel.slug) == coll_lower) |
                    (func.lower(CollectionModel.slug) == coll_slug_lower)
                )
            if coll_query.count() > 0:
                query = coll_query

            
        if search_query:
            from backend.models.category import Category
            query = query.outerjoin(Category).outerjoin(CollectionModel).filter(
                (ProductModel.name.ilike(f"%{search_query}%")) |
                (ProductModel.name_en.ilike(f"%{search_query}%")) |
                (ProductModel.name_hi.ilike(f"%{search_query}%")) |
                (ProductModel.description.ilike(f"%{search_query}%")) |
                (ProductModel.description_en.ilike(f"%{search_query}%")) |
                (ProductModel.description_hi.ilike(f"%{search_query}%")) |
                (Category.name.ilike(f"%{search_query}%")) |
                (CollectionModel.name.ilike(f"%{search_query}%"))
            )
        if seller_id is not None:
            try:
                sid = int(seller_id)
                query = query.filter(ProductModel.seller_id == sid)
            except Exception:
                pass

        query = query.order_by(ProductModel.created_at.desc())

        if page is not None or limit is not None:
            from backend.utils.pagination import paginate_query
            res = paginate_query(query, page=page, limit=limit)
            if res.get("items"):
                raw_items = query.offset((res["current_page"] - 1) * res["page_size"]).limit(res["page_size"]).all()
                p_ids = [p.id for p in raw_items]
                if p_ids:
                    from backend.models.review import ReviewModel
                    from sqlalchemy import func
                    counts = dict(
                        db.session.query(ReviewModel.product_id, func.count(ReviewModel.id))
                        .filter(ReviewModel.product_id.in_(p_ids))
                        .group_by(ReviewModel.product_id)
                        .all()
                    )
                    for p in raw_items:
                        p._prefetched_review_count = counts.get(p.id, 0)
                res["items"] = [p.to_dict() for p in raw_items]
            return res

        products = query.all()
        if products:
            p_ids = [p.id for p in products]
            from backend.models.review import ReviewModel
            from sqlalchemy import func
            counts = dict(
                db.session.query(ReviewModel.product_id, func.count(ReviewModel.id))
                .filter(ReviewModel.product_id.in_(p_ids))
                .group_by(ReviewModel.product_id)
                .all()
            )
            for p in products:
                p._prefetched_review_count = counts.get(p.id, 0)

        return [p.to_dict() for p in products]

    @staticmethod
    def find_by_id(product_id):
        try:
            prod_id = int(product_id)
            from sqlalchemy.orm import joinedload
            product = ProductModel.query.options(
                joinedload(ProductModel.category),
                joinedload(ProductModel.product_images),
                joinedload(ProductModel.variants),
                joinedload(ProductModel.reviews)
            ).get(prod_id)
            return product.to_dict() if product else None
        except Exception:
            return None

    @staticmethod
    def create_product(data):
        from backend.models.category import Category
        category = None
        if data.get("category_id") and str(data.get("category_id")).isdigit():
            try:
                category = Category.query.get(int(data["category_id"]))
            except Exception:
                pass
        if not category and data.get("category"):
            category_name = str(data["category"]).strip()
            category = Category.query.filter(
                (Category.name.ilike(category_name)) |
                (Category.name_en.ilike(category_name))
            ).first()
            if not category and category_name.isdigit():
                category = Category.query.get(int(category_name))
        if not category:
            category_name = str(data.get("category") or "Uncategorized").strip()
            category = Category.query.filter_by(name=category_name).first()
            if not category:
                category = Category(name=category_name)
                db.session.add(category)
                db.session.commit()
            
        name_trans = data.get("name_translations", {})
        desc_trans = data.get("description_translations", {})
        
        name_en = data.get("name_en") or data.get("name") or data.get("title")
        name_hi = data.get("name_hi") or name_trans.get("hi", "")
        description_en = data.get("description_en") or data.get("description", "")
        description_hi = data.get("description_hi") or desc_trans.get("hi", "")
        features_en = data.get("materials") or data.get("features_en", "")
        features_hi = data.get("features_hi", "")
        specifications_en = data.get("craft_origin") or data.get("origin") or data.get("specifications_en", "")
        specifications_hi = data.get("specifications_hi", "")

        # Fallbacks:
        name = name_en or name_hi
        description = description_en or description_hi
        
        name_trans["en"] = name_en
        name_trans["hi"] = name_hi
        desc_trans["en"] = description_en
        desc_trans["hi"] = description_hi

        images_input = data.get("images", [])
        if not isinstance(images_input, list):
            images_input = []
        if len(images_input) == 0:
            if data.get("image_url"):
                images_input = [data.get("image_url"), data.get("image_url")]
            else:
                images_input = [
                    "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
                    "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=600&auto=format&fit=crop&q=80"
                ]
        elif len(images_input) == 1:
            images_input = [images_input[0], images_input[0]]

        admin_name = data.get("artisan_name") or data.get("created_by") or data.get("admin_name") or "admin"

        collection_input = data.get("collection_id") or data.get("collection")
        collection_id = None
        if collection_input and str(collection_input).lower() not in ["none", "null", "", "no collection", "0"]:
            from backend.models.collection import CollectionModel
            from sqlalchemy import func
            coll_str = str(collection_input).strip()
            if coll_str.isdigit():
                coll = CollectionModel.query.get(int(coll_str))
            else:
                coll_lower = coll_str.lower()
                coll_slug_lower = coll_lower.replace(' ', '-')
                coll = CollectionModel.query.filter(
                    (func.lower(CollectionModel.name) == coll_lower) |
                    (func.lower(CollectionModel.slug) == coll_lower) |
                    (func.lower(CollectionModel.slug) == coll_slug_lower)
                ).first()
            if coll:
                collection_id = coll.id

        discount_val = float(data.get("discount", 0))
        price_val = float(data.get("price") if data.get("price") is not None else (data.get("selling_price") or 0))
        if discount_val == 0 and (data.get("original_price") or data.get("original_mrp")):
            try:
                orig_val = float(data.get("original_price") or data.get("original_mrp") or 0)
                if orig_val > price_val and orig_val > 0:
                    discount_val = round(((orig_val - price_val) / orig_val) * 100, 2)
            except Exception:
                pass

        product = ProductModel(
            name=name,
            price=price_val,
            discount=discount_val,
            description=description,
            images=images_input,
            stock=int(data.get("stock") if data.get("stock") is not None else (data.get("available_stock") or 0)),
            category_id=category.id,
            collection_id=collection_id,
            ratings=float(data.get("ratings", 5.0)),
            created_at=get_ist_time(),
            updated_at=get_ist_time(),
            discount_applied_at=get_ist_time() if discount_val > 0 else None,
            name_translations=name_trans,
            description_translations=desc_trans,
            name_en=name_en,
            name_hi=name_hi,
            description_en=description_en,
            description_hi=description_hi,
            features_en=features_en,
            features_hi=features_hi,
            specifications_en=specifications_en,
            specifications_hi=specifications_hi,
            created_by=admin_name,
            modified_by=admin_name,
            status=data.get("status", "active"),
            show_on_homepage=bool(data.get("show_on_home") if "show_on_home" in data else data.get("show_on_homepage", False)),
            show_on_home=bool(data.get("show_on_home") if "show_on_home" in data else data.get("show_on_homepage", False)),
            seller_id=int(data.get("seller_id")) if (data.get("seller_id") and str(data.get("seller_id")).isdigit()) else None
        )
        db.session.add(product)
        db.session.commit()

        # Log initial stock to history if stock > 0
        creator_name = data.get("created_by") or admin_name
        user_role = data.get("user_role") or ("Owner" if (data.get("is_admin") or "admin" in str(admin_name).lower() or data.get("role") in ["owner", "admin"]) else "Seller")
        user_id = data.get("user_id")

        if int(data.get("stock", 0)) > 0:
            history = StockHistoryModel(
                product_id=product.id,
                change_type='create',
                change_amount=int(data.get("stock", 0)),
                old_stock=0,
                new_stock=int(data.get("stock", 0)),
                reason=data.get("reason") or "Initial Stock Allocation",
                updated_by=creator_name,
                user_role=user_role,
                user_id=user_id,
                created_at=get_ist_time()
            )
            db.session.add(history)
            db.session.commit()

        # Now save multiple images to product_images
        for order, img_url in enumerate(images_input):
            p_img = ProductImageModel(
                product_id=product.id,
                image_url=img_url,
                image_order=order
            )
            db.session.add(p_img)
        
        # Save product variants
        variants_input = data.get("variants", [])
        for var in variants_input:
            attr_name = var.get("attribute_name")
            attr_val = var.get("attribute_value")
            if attr_name and attr_val:
                p_var = ProductVariantModel(
                    product_id=product.id,
                    attribute_name=attr_name,
                    attribute_value=attr_val
                )
                db.session.add(p_var)
        db.session.commit()

        # Log to ProductAuditLogModel
        audit = ProductAuditLogModel(
            product_id=product.id,
            admin_id=creator_name,
            performed_by=creator_name,
            user_role=user_role,
            user_id=user_id,
            action_type="Product Created",
            field_name="all",
            old_value=None,
            new_value=product.name,
            created_at=get_ist_time()
        )
        db.session.add(audit)
        db.session.commit()

        return product.to_dict()

    @staticmethod
    def update_product(product_id, data):
        try:
            prod_id = int(product_id)
            product = ProductModel.query.with_for_update().get(prod_id)
            if not product:
                return None
                
            admin_name = data.get("modified_by") or data.get("admin_name") or "admin"
            performed_by = data.get("performed_by") or admin_name
            user_role = data.get("user_role") or ("Owner" if (data.get("is_admin") or "admin" in str(admin_name).lower() or data.get("role") in ["owner", "admin"]) else "Seller")
            user_id = data.get("user_id")
            product.modified_by = performed_by

            # Helper for audit log
            def log_change(action_type, field_name, old_val, new_val):
                if str(old_val) != str(new_val):
                    log_entry = ProductAuditLogModel(
                        product_id=product.id,
                        admin_id=admin_name,
                        performed_by=performed_by,
                        user_role=user_role,
                        user_id=user_id,
                        action_type=action_type,
                        field_name=field_name,
                        old_value=str(old_val) if old_val is not None else "",
                        new_value=str(new_val) if new_val is not None else "",
                        created_at=get_ist_time()
                    )
                    db.session.add(log_entry)

            if "name_translations" in data:
                product.name_translations = data["name_translations"]
                if product.name_translations and product.name_translations.get("en"):
                    log_change("Product Name Updated", "name", product.name, product.name_translations["en"])
                    product.name = product.name_translations["en"]
            elif "name" in data:
                log_change("Product Name Updated", "name", product.name, data["name"])
                product.name = data["name"]
                name_trans = dict(product.name_translations) if product.name_translations else {}
                name_trans["en"] = data["name"]
                product.name_translations = name_trans

            if "description_translations" in data:
                product.description_translations = data["description_translations"]
                if product.description_translations and product.description_translations.get("en"):
                    log_change("Product Description Updated", "description", product.description, product.description_translations["en"])
                    product.description = product.description_translations["en"]
            elif "description" in data:
                log_change("Product Description Updated", "description", product.description, data["description"])
                product.description = data["description"]
                desc_trans = dict(product.description_translations) if product.description_translations else {}
                desc_trans["en"] = data["description"]
                product.description_translations = desc_trans

            # Update specific multilingual fields if present in data
            if "name_en" in data:
                log_change("Product Name Updated", "name_en", product.name_en, data["name_en"])
                product.name_en = data["name_en"]
            if "name_hi" in data:
                log_change("Product Name Updated", "name_hi", product.name_hi, data["name_hi"])
                product.name_hi = data["name_hi"]
            if "description_en" in data:
                log_change("Product Description Updated", "description_en", product.description_en, data["description_en"])
                product.description_en = data["description_en"]
            if "description_hi" in data:
                log_change("Product Description Updated", "description_hi", product.description_hi, data["description_hi"])
                product.description_hi = data["description_hi"]
            if "features_en" in data:
                log_change("Product Highlights Updated", "features_en", product.features_en, data["features_en"])
                product.features_en = data["features_en"]
            if "features_hi" in data:
                log_change("Product Highlights Updated", "features_hi", product.features_hi, data["features_hi"])
                product.features_hi = data["features_hi"]
            if "specifications_en" in data:
                log_change("Product Specifications Updated", "specifications_en", product.specifications_en, data["specifications_en"])
                product.specifications_en = data["specifications_en"]
            if "specifications_hi" in data:
                log_change("Product Specifications Updated", "specifications_hi", product.specifications_hi, data["specifications_hi"])
                product.specifications_hi = data["specifications_hi"]

            # Maintain compatibility: if name_en/hi are set, update name/translations as well
            if product.name_en or product.name_hi:
                product.name = product.name_en or product.name_hi
                name_trans = dict(product.name_translations) if product.name_translations else {}
                if product.name_en: name_trans["en"] = product.name_en
                if product.name_hi: name_trans["hi"] = product.name_hi
                product.name_translations = name_trans
            
            if product.description_en or product.description_hi:
                product.description = product.description_en or product.description_hi
                desc_trans = dict(product.description_translations) if product.description_translations else {}
                if product.description_en: desc_trans["en"] = product.description_en
                if product.description_hi: desc_trans["hi"] = product.description_hi
                product.description_translations = desc_trans

            if "price" in data:
                log_change("Product Price Changed", "price", f"₹{float(product.price):.2f}", f"₹{float(data['price']):.2f}")
                product.price = float(data["price"])
            if "discount" in data:
                old_discount = float(product.discount or 0)
                new_discount = float(data["discount"])
                if old_discount != new_discount:
                    log_change("Product Discount Changed", "discount", f"{old_discount}%", f"{new_discount}%")
                    product.discount = new_discount
                    product.discount_applied_at = get_ist_time()
            if "stock" in data:
                old_stock = int(product.stock or 0)
                new_stock = int(data["stock"])
                if new_stock < 0:
                    raise ValueError("Stock cannot be negative")
                if old_stock != new_stock:
                    log_change("Product Stock Updated", "stock", f"{old_stock} units", f"{new_stock} units")
                    product.stock = new_stock
                    stock_reason = data.get("stock_reason") or data.get("reason") or "Manual Product Stock Adjustment"
                    history = StockHistoryModel(
                        product_id=product.id,
                        change_type='edit',
                        change_amount=new_stock - old_stock,
                        old_stock=old_stock,
                        new_stock=new_stock,
                        reason=stock_reason,
                        updated_by=performed_by,
                        user_role=user_role,
                        user_id=user_id,
                        created_at=get_ist_time()
                    )
                    db.session.add(history)
            if "category" in data or "category_id" in data:
                from backend.models.category import Category
                cat_id_or_name = data.get("category_id") or data.get("category")
                category = None
                if cat_id_or_name:
                    if str(cat_id_or_name).isdigit():
                        category = Category.query.get(int(cat_id_or_name))
                    else:
                        category = Category.query.filter_by(name=str(cat_id_or_name)).first()
                        if not category:
                            category = Category(name=str(cat_id_or_name))
                            db.session.add(category)
                            db.session.commit()
                if category:
                    old_cat = product.category.name if product.category else "Uncategorized"
                    log_change("Product Category Changed", "category", old_cat, category.name)
                    product.category_id = category.id
            if "collection" in data or "collection_id" in data:
                collection_input = data.get("collection_id") if "collection_id" in data else data.get("collection")
                if collection_input and str(collection_input).lower() not in ["none", "null", "", "no collection", "0"]:
                    from backend.models.collection import CollectionModel
                    from sqlalchemy import func
                    coll_str = str(collection_input).strip()
                    if coll_str.isdigit():
                        coll = CollectionModel.query.get(int(coll_str))
                    else:
                        coll_lower = coll_str.lower()
                        coll_slug_lower = coll_lower.replace(' ', '-')
                        coll = CollectionModel.query.filter(
                            (func.lower(CollectionModel.name) == coll_lower) |
                            (func.lower(CollectionModel.slug) == coll_lower) |
                            (func.lower(CollectionModel.slug) == coll_slug_lower)
                        ).first()
                    if coll:
                        old_coll = product.collection.name if product.collection else "None"
                        log_change("Product Collection Changed", "collection", old_coll, coll.name)
                        product.collection_id = coll.id
                    else:
                        old_coll = product.collection.name if product.collection else "None"
                        log_change("Product Collection Changed", "collection", old_coll, "None")
                        product.collection_id = None
                else:
                    old_coll = product.collection.name if product.collection else "None"
                    log_change("Product Collection Changed", "collection", old_coll, "None")
                    product.collection_id = None
            if "ratings" in data: product.ratings = float(data["ratings"])
            if "status" in data:
                log_change("Product Status Changed", "status", product.status, data["status"])
                product.status = data["status"]
            if "show_on_homepage" in data or "show_on_home" in data:
                home_visibility = bool(data.get("show_on_home") if "show_on_home" in data else data.get("show_on_homepage"))
                log_change("Product Visibility Changed", "show_on_homepage", product.show_on_homepage, home_visibility)
                product.show_on_homepage = home_visibility
                product.show_on_home = home_visibility
            
            if "images" in data:
                img_list = data["images"] or []
                if not isinstance(img_list, list):
                    img_list = []
                if len(img_list) == 0:
                    img_list = [
                        "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
                        "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=600&auto=format&fit=crop&q=80"
                    ]
                elif len(img_list) == 1:
                    img_list = [img_list[0], img_list[0]]

                old_images = f"{len(product.images or [])} image(s)"
                new_images = f"{len(img_list)} image(s)"
                log_change("Product Images Changed", "images", old_images, new_images)
                product.images = img_list
                # Delete existing product images
                ProductImageModel.query.filter_by(product_id=product.id).delete()
                # Insert updated images
                for order, img_url in enumerate(img_list):
                    p_img = ProductImageModel(
                        product_id=product.id,
                        image_url=img_url,
                        image_order=order
                    )
                    db.session.add(p_img)
            
            if "variants" in data:
                # Delete existing variants
                ProductVariantModel.query.filter_by(product_id=product.id).delete()
                # Insert updated variants
                for var in data["variants"]:
                    attr_name = var.get("attribute_name")
                    attr_val = var.get("attribute_value")
                    if attr_name and attr_val:
                        p_var = ProductVariantModel(
                            product_id=product.id,
                            attribute_name=attr_name,
                            attribute_value=attr_val
                        )
                        db.session.add(p_var)
            
            product.updated_at = get_ist_time()
            db.session.commit()
            return product.to_dict()
        except Exception as e:
            db.session.rollback()
            print("Failed to update product:", e)
            return None

    @staticmethod
    def delete_product(product_id):
        try:
            prod_id = int(product_id)
            product = ProductModel.query.with_for_update().get(prod_id)
            if product:
                db.session.delete(product)
                db.session.commit()
                return True
            return False
        except Exception:
            return False

    @staticmethod
    @staticmethod
    def update_stock(product_id, quantity_change, change_type='order_placed', admin_name='system', reason=None, performed_by=None, user_role=None, user_id=None):
        try:
            prod_id = int(product_id)
            product = ProductModel.query.with_for_update().get(prod_id)
            if product:
                old_stock = int(product.stock or 0)
                new_stock = old_stock + quantity_change
                if new_stock < 0:
                    return False, f"Stock cannot become negative. Current available stock is {old_stock}, cannot reduce by {abs(quantity_change)}."
                product.stock = new_stock
                actor_name = performed_by or admin_name or "System"
                role_val = user_role or ("Owner" if "admin" in str(actor_name).lower() else "Seller")
                default_reason = (
                    "Patron Order Placement" if change_type == 'order_placed'
                    else f"Manual Stock {'Increase' if quantity_change > 0 else 'Reduction'}"
                )
                actual_reason = reason or default_reason

                history = StockHistoryModel(
                    product_id=product.id,
                    change_type=change_type,
                    change_amount=quantity_change,
                    old_stock=old_stock,
                    new_stock=new_stock,
                    reason=actual_reason,
                    updated_by=actor_name,
                    user_role=role_val,
                    user_id=user_id,
                    created_at=get_ist_time()
                )
                db.session.add(history)

                audit = ProductAuditLogModel(
                    product_id=product.id,
                    admin_id=actor_name,
                    performed_by=actor_name,
                    user_role=role_val,
                    user_id=user_id,
                    action_type="Product Stock Updated",
                    field_name="stock",
                    old_value=f"{old_stock} units",
                    new_value=f"{new_stock} units",
                    created_at=get_ist_time()
                )
                db.session.add(audit)

                db.session.commit()

                # Trigger low stock notification if new stock is below 10 and decreased
                if new_stock < 10 and new_stock < old_stock:
                    try:
                        from backend.models.admin import add_admin_notification
                        add_admin_notification(
                            title="Low Stock Alert",
                            message=f"{product.name} is running low (only {new_stock} left)",
                            type="LOW_STOCK"
                        )
                    except Exception as ex:
                        print("Failed to send low stock notification:", ex)

                return True, product.to_dict()
            return False, "Product not found"
        except Exception as e:
            db.session.rollback()
            print("Failed to update stock:", e)
            return False, str(e)

    @staticmethod
    def set_stock(product_id, exact_stock, change_type='set', admin_name='admin', reason=None, performed_by=None, user_role=None, user_id=None):
        try:
            prod_id = int(product_id)
            if exact_stock < 0:
                return False, "Stock cannot be negative"
            product = ProductModel.query.with_for_update().get(prod_id)
            if product:
                old_stock = int(product.stock or 0)
                product.stock = exact_stock
                new_stock = product.stock
                change_amount = new_stock - old_stock
                actor_name = performed_by or admin_name or "System"
                role_val = user_role or ("Owner" if "admin" in str(actor_name).lower() else "Seller")
                actual_reason = reason or "Direct Inventory Level Adjustment"

                history = StockHistoryModel(
                    product_id=product.id,
                    change_type=change_type,
                    change_amount=change_amount,
                    old_stock=old_stock,
                    new_stock=new_stock,
                    reason=actual_reason,
                    updated_by=actor_name,
                    user_role=role_val,
                    user_id=user_id,
                    created_at=get_ist_time()
                )
                db.session.add(history)

                audit = ProductAuditLogModel(
                    product_id=product.id,
                    admin_id=actor_name,
                    performed_by=actor_name,
                    user_role=role_val,
                    user_id=user_id,
                    action_type="Product Stock Updated",
                    field_name="stock",
                    old_value=f"{old_stock} units",
                    new_value=f"{new_stock} units",
                    created_at=get_ist_time()
                )
                db.session.add(audit)

                db.session.commit()

                if new_stock < 10 and new_stock < old_stock:
                    try:
                        from backend.models.admin import add_admin_notification
                        add_admin_notification(
                            title="Low Stock Alert",
                            message=f"{product.name} is running low (only {new_stock} left)",
                            type="LOW_STOCK"
                        )
                    except Exception as ex:
                        print("Failed to send low stock notification:", ex)

                return True, product.to_dict()
            return False, "Product not found"
        except Exception as e:
            db.session.rollback()
            print("Failed to set stock:", e)
            return False, str(e)


class StockHistoryModel(db.Model):
    __tablename__ = 'stock_history'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    change_type = db.Column(db.String(50), nullable=False) # 'increase', 'decrease', 'set', 'order_placed', 'edit', 'create'
    change_amount = db.Column(db.Integer, nullable=False)
    old_stock = db.Column(db.Integer, nullable=False)
    new_stock = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.Text, nullable=True)
    updated_by = db.Column(db.String(255), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    user_role = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=get_ist_time)
    
    user = db.relationship('UserModel', foreign_keys=[user_id], lazy=True)

    def to_dict(self):
        dt_str = format_iso_datetime(self.created_at)
        return {
            "id": str(self.id),
            "product_id": str(self.product_id),
            "change_type": self.change_type,
            "change": self.change_amount,
            "change_amount": self.change_amount,
            "previous_stock": self.old_stock,
            "old_stock": self.old_stock,
            "new_stock": self.new_stock,
            "reason": self.reason or (
                "Patron Order" if self.change_type == 'order_placed'
                else "Initial Stock Allocation" if self.change_type == 'create'
                else "Manual Stock Adjustment"
            ),
            "updated_by": self.updated_by or (self.user.name if self.user else "System Administrator"),
            "user_role": self.user_role or "Owner",
            "user_id": self.user_id,
            "created_at": dt_str,
            "date_time": dt_str
        }


class ProductAuditLogModel(db.Model):
    __tablename__ = 'product_audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    admin_id = db.Column(db.String(100), nullable=True)
    action_type = db.Column(db.String(100), nullable=False) # e.g. "Product Created", "Product Price Changed", etc.
    field_name = db.Column(db.String(100), nullable=True)
    old_value = db.Column(db.Text, nullable=True)
    new_value = db.Column(db.Text, nullable=True)
    performed_by = db.Column(db.String(255), nullable=True)
    user_role = db.Column(db.String(50), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=get_ist_time)

    user = db.relationship('UserModel', foreign_keys=[user_id], lazy=True)

    def to_dict(self):
        dt_str = format_iso_datetime(self.created_at)
        return {
            "id": self.id,
            "product_id": self.product_id,
            "activity": self.action_type,
            "action_type": self.action_type,
            "field_name": self.field_name,
            "previous_value": self.old_value,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "performed_by": self.performed_by or self.admin_id or (self.user.name if self.user else "System"),
            "user_role": self.user_role or "Owner",
            "user_id": self.user_id,
            "created_at": dt_str,
            "date_time": dt_str
        }


class CategoryAttributeModel(db.Model):
    __tablename__ = 'category_attributes'
    
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='CASCADE'), nullable=True)
    category_name = db.Column(db.String(100), nullable=False)
    attribute_name = db.Column(db.String(100), nullable=False)
    attribute_value = db.Column(db.String(100), nullable=False)
    
    def to_dict(self):
        return {
            "id": self.id,
            "category_id": self.category_id,
            "category_name": self.category_name,
            "attribute_name": self.attribute_name,
            "attribute_value": self.attribute_value
        }


class ProductVariantModel(db.Model):
    __tablename__ = 'product_variants'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    attribute_name = db.Column(db.String(255), nullable=False)
    attribute_value = db.Column(db.String(255), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "attribute_name": self.attribute_name,
            "attribute_value": self.attribute_value
        }


class BuyRequestModel(db.Model):
    __tablename__ = 'buy_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    product_name = db.Column(db.String(255), nullable=True)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    selected_variant = db.Column(db.String(512), nullable=True)
    status = db.Column(db.String(100), default='Pending', nullable=False)
    expected_delivery_date = db.Column(db.String(100), nullable=True)
    expected_availability_date = db.Column(db.String(100), nullable=True)
    admin_note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=get_ist_time)
    
    # New fields
    city = db.Column(db.String(255), nullable=True)
    customer_confirmed = db.Column(db.Boolean, default=False, nullable=False)
    selected_address_id = db.Column(db.Integer, db.ForeignKey('delivery_addresses.id', ondelete='SET NULL'), nullable=True)
    payment_completed = db.Column(db.Boolean, default=False, nullable=False)
    converted_order_id = db.Column(db.Integer, db.ForeignKey('orders.id', ondelete='SET NULL'), nullable=True)
    converted_to_order_at = db.Column(db.DateTime, nullable=True)
    
    product = db.relationship('ProductModel', foreign_keys=[product_id])
    user = db.relationship('UserModel', foreign_keys=[user_id])
    converted_order = db.relationship('OrderModel', foreign_keys=[converted_order_id])
    selected_address = db.relationship('DeliveryAddress', foreign_keys=[selected_address_id])
    
    def to_dict(self):
        created_date = self.created_at.strftime('%Y-%m-%d') if self.created_at else None
        created_time = self.created_at.strftime('%H:%M:%S') if self.created_at else None
        
        converted_order_tracking_id = None
        if self.converted_order:
            converted_order_tracking_id = self.converted_order.order_id

        address_str = ""
        state_str = ""
        if self.selected_address:
            addr_obj = self.selected_address
            parts = [
                addr_obj.house_number,
                addr_obj.building_name,
                addr_obj.street,
                addr_obj.area,
                addr_obj.landmark,
                addr_obj.city,
                addr_obj.state,
                addr_obj.pincode
            ]
            address_str = ", ".join([p.strip() for p in parts if p and p.strip()])
            state_str = addr_obj.state or ""

        if not address_str and self.user:
            try:
                addr_obj = self.user.address
                if addr_obj:
                    parts = [
                        addr_obj.house_number,
                        addr_obj.building_name,
                        addr_obj.street,
                        addr_obj.area,
                        addr_obj.landmark,
                        addr_obj.city,
                        addr_obj.state,
                        addr_obj.pincode
                    ]
                    address_str = ", ".join([p.strip() for p in parts if p and p.strip()])
                    state_str = addr_obj.state or ""
            except Exception:
                pass

        return {
            "id": self.id,
            "product_id": self.product_id,
            "user_id": self.user_id,
            "product_name": self.product_name or (self.product.name if self.product else "Unknown Product"),
            "user_name": self.user.name if self.user else "Unknown User",
            "email": self.user.email if self.user else "",
            "mobile": self.user.mobile if self.user else "",
            "quantity": self.quantity,
            "selected_variant": self.selected_variant or "",
            "status": self.status,
            "expected_delivery_date": self.expected_delivery_date or "",
            "expected_availability_date": self.expected_availability_date or "",
            "admin_note": self.admin_note or "",
            "created_date": created_date,
            "created_time": created_time,
            "created_at": format_iso_datetime(self.created_at) if self.created_at else None,
            "city": self.city or "",
            "state": state_str,
            "address": address_str,
            "customer_confirmed": bool(self.customer_confirmed),
            "selected_address_id": self.selected_address_id,
            "payment_completed": bool(self.payment_completed),
            "converted_order_id": converted_order_tracking_id or self.converted_order_id,
            "converted_to_order_at": format_iso_datetime(self.converted_to_order_at) if self.converted_to_order_at else None
        }

from sqlalchemy import event

@event.listens_for(BuyRequestModel, 'before_insert')
@event.listens_for(BuyRequestModel, 'before_update')
def validate_buy_request_dates_on_save(mapper, connection, target):
    from datetime import datetime
    import pytz
    ist = pytz.timezone('Asia/Kolkata')
    today_date = datetime.now(ist).date()
    
    avail_str = target.expected_availability_date
    deliv_str = target.expected_delivery_date
    
    if avail_str:
        try:
            avail_date = datetime.strptime(avail_str, "%Y-%m-%d").date()
            if avail_date < today_date:
                raise ValueError("Please select today or a future date.")
        except ValueError as e:
            if "Please select today" in str(e):
                raise e
            
    if deliv_str:
        try:
            deliv_date = datetime.strptime(deliv_str, "%Y-%m-%d").date()
            if deliv_date < today_date:
                raise ValueError("Please select today or a future date.")
        except ValueError as e:
            if "Please select today" in str(e):
                raise e
            
    if avail_str and deliv_str:
        try:
            avail_date = datetime.strptime(avail_str, "%Y-%m-%d").date()
            deliv_date = datetime.strptime(deliv_str, "%Y-%m-%d").date()
            if deliv_date < avail_date:
                raise ValueError("Expected delivery date must be on or after availability date.")
        except ValueError as e:
            if "Expected delivery date" in str(e):
                raise e
