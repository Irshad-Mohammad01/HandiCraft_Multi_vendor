import os
import time
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import cloudinary.uploader
from backend.extensions import db
from backend.models.banner import BannerModel
from backend.middleware.auth import admin_required
from backend.utils.audit import log_admin_action
from backend.utils.uploads import validate_image_upload

banners_bp = Blueprint('banners', __name__)

# Cloudinary Setup
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

if all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]):
    try:
        import cloudinary
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET
        )
        CLOUDINARY_ENABLED = True
    except Exception:
        CLOUDINARY_ENABLED = False
else:
    CLOUDINARY_ENABLED = False

# Local Upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

from datetime import datetime
import pytz
from dateutil import parser as date_parser

def parse_datetime_field(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    try:
        dt = date_parser.parse(str(val))
        if dt.tzinfo is None:
            dt = pytz.timezone('Asia/Kolkata').localize(dt)
        return dt
    except Exception:
        return None

# 1. Public route: Get all active scheduled banners ordered by display_order
@banners_bp.route('', methods=['GET'])
def get_active_banners():
    try:
        location = request.args.get('location')
        now = datetime.now(pytz.timezone('Asia/Kolkata'))

        query = BannerModel.query.filter_by(is_active=True)
        if location:
            query = query.filter_by(display_location=location)

        banners = query.order_by(BannerModel.display_order.asc(), BannerModel.id.asc()).all()
        
        valid_banners = []
        for b in banners:
            if b.start_date:
                s_dt = b.start_date if b.start_date.tzinfo else pytz.timezone('Asia/Kolkata').localize(b.start_date)
                if now < s_dt:
                    continue
            if b.expiry_date:
                e_dt = b.expiry_date if b.expiry_date.tzinfo else pytz.timezone('Asia/Kolkata').localize(b.expiry_date)
                if now > e_dt:
                    continue
            valid_banners.append(b.to_dict())

        return jsonify(valid_banners), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching active banners: {str(e)}"}), 500

# 2. Admin route: Get all banners (including inactive and scheduled ones)
@banners_bp.route('/all', methods=['GET'])
@admin_required
def get_all_banners():
    try:
        query = BannerModel.query.order_by(BannerModel.display_order.asc(), BannerModel.id.desc())
        location = request.args.get('location')
        if location:
            query = query.filter_by(display_location=location)

        page_arg = request.args.get('page')
        limit_arg = request.args.get('limit') or request.args.get('page_size')
        if page_arg or limit_arg or request.args.get('paginate') == 'true':
            from backend.utils.pagination import parse_pagination_params, paginate_query
            p_num, p_limit = parse_pagination_params()
            return jsonify(paginate_query(query, page=p_num, limit=p_limit)), 200
        banners = query.all()
        return jsonify([b.to_dict() for b in banners]), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching all banners: {str(e)}"}), 500

# 3. Admin route: Create a new banner
@banners_bp.route('', methods=['POST'])
@admin_required
def create_banner():
    try:
        data = request.get_json() or {}
        
        title = data.get("title")
        if not title:
            return jsonify({"message": "Banner Title is required."}), 400
            
        banner = BannerModel(
            title=title,
            subtitle=data.get("subtitle", ""),
            description=data.get("description", ""),
            button_text=data.get("button_text", ""),
            button_link=data.get("button_link", ""),
            image_url=data.get("image_url", ""),
            mobile_image_url=data.get("mobile_image_url", ""),
            background_style=data.get("background_style", "from-slate-900 via-indigo-950 to-slate-900"),
            bg_color=data.get("bg_color", "#2B2523"),
            text_color=data.get("text_color", "#FFFFFF"),
            display_location=data.get("display_location", "homepage_hero"),
            category=data.get("category", ""),
            start_date=parse_datetime_field(data.get("start_date")),
            expiry_date=parse_datetime_field(data.get("expiry_date")),
            display_order=int(data.get("display_order", 0)),
            is_active=bool(data.get("is_active", True))
        )
        
        db.session.add(banner)
        db.session.commit()
        
        from backend.utils.cache import banners_cache
        banners_cache.clear()
        
        log_admin_action("Banner Added", "Banner Management", f"Created banner: '{title}' ({banner.display_location})")
        
        return jsonify({
            "message": "Banner created successfully!",
            "banner": banner.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error creating banner: {str(e)}"}), 500

# 4. Admin route: Update an existing banner
@banners_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
@admin_required
def update_banner(id):
    try:
        banner = BannerModel.query.get(id)
        if not banner:
            return jsonify({"message": "Banner not found."}), 404
            
        data = request.get_json() or {}
        
        if "title" in data:
            banner.title = data.get("title")
        if "subtitle" in data:
            banner.subtitle = data.get("subtitle")
        if "description" in data:
            banner.description = data.get("description")
        if "button_text" in data:
            banner.button_text = data.get("button_text")
        if "button_link" in data:
            banner.button_link = data.get("button_link")
        if "image_url" in data:
            banner.image_url = data.get("image_url")
        if "mobile_image_url" in data:
            banner.mobile_image_url = data.get("mobile_image_url")
        if "background_style" in data:
            banner.background_style = data.get("background_style")
        if "bg_color" in data:
            banner.bg_color = data.get("bg_color")
        if "text_color" in data:
            banner.text_color = data.get("text_color")
        if "display_location" in data:
            banner.display_location = data.get("display_location")
        if "category" in data:
            banner.category = data.get("category")
        if "start_date" in data:
            banner.start_date = parse_datetime_field(data.get("start_date"))
        if "expiry_date" in data:
            banner.expiry_date = parse_datetime_field(data.get("expiry_date"))
        if "display_order" in data:
            banner.display_order = int(data.get("display_order", 0))
        if "is_active" in data:
            banner.is_active = bool(data.get("is_active", True))
            
        db.session.commit()
        
        from backend.utils.cache import banners_cache
        banners_cache.clear()
        
        log_admin_action("Banner Updated", "Banner Management", f"Updated banner: '{banner.title}'")
        
        return jsonify({
            "message": "Banner updated successfully!",
            "banner": banner.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error updating banner: {str(e)}"}), 500

# 5. Admin route: Toggle banner active state
@banners_bp.route('/<int:id>/toggle', methods=['PATCH', 'PUT'])
@admin_required
def toggle_banner_status(id):
    try:
        banner = BannerModel.query.get(id)
        if not banner:
            return jsonify({"message": "Banner not found."}), 404
        banner.is_active = not banner.is_active
        db.session.commit()
        from backend.utils.cache import banners_cache
        banners_cache.clear()
        status_text = "activated" if banner.is_active else "deactivated"
        log_admin_action("Banner Status Toggled", "Banner Management", f"Banner '{banner.title}' {status_text}")
        return jsonify({
            "message": f"Banner {status_text} successfully!",
            "banner": banner.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error toggling banner status: {str(e)}"}), 500

# 6. Admin route: Batch reorder banners
@banners_bp.route('/reorder', methods=['POST'])
@admin_required
def reorder_banners():
    try:
        data = request.get_json() or {}
        orders = data.get("orders") or data.get("items") or []
        for item in orders:
            b_id = item.get("id")
            order = item.get("display_order")
            if b_id is not None and order is not None:
                b = BannerModel.query.get(b_id)
                if b:
                    b.display_order = int(order)
        db.session.commit()
        from backend.utils.cache import banners_cache
        banners_cache.clear()
        return jsonify({"message": "Banners reordered successfully!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error reordering banners: {str(e)}"}), 500

# 5. Admin route: Delete a banner
@banners_bp.route('/<int:id>', methods=['DELETE'])
@admin_required
def delete_banner(id):
    try:
        banner = BannerModel.query.get(id)
        if not banner:
            return jsonify({"message": "Banner not found."}), 404
            
        title = banner.title
        db.session.delete(banner)
        db.session.commit()
        
        from backend.utils.cache import banners_cache
        banners_cache.clear()
        
        log_admin_action("Banner Deleted", "Banner Management", f"Deleted banner: '{title}'")
        
        return jsonify({"message": "Banner deleted successfully!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error deleting banner: {str(e)}"}), 500

# 6. Admin route: Upload banner image
@banners_bp.route('/upload', methods=['POST'])
@admin_required
def upload_banner_image():
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
                "message": "Banner image uploaded to Cloudinary successfully!",
                "url": upload_result.get("secure_url"),
                "image_url": upload_result.get("secure_url")
            }), 200
        except Exception as e:
            print(f"[CLOUDINARY] Upload failed, falling back to local: {e}")
            
    # Local fallback
    try:
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        url = f"/static/uploads/{filename}"
        return jsonify({
            "message": "Banner image uploaded locally successfully!",
            "url": url,
            "image_url": url
        }), 200
    except Exception as ex:
        return jsonify({"message": f"Failed to upload banner image: {str(ex)}"}), 500
