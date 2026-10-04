import json
from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.lookbook import LookbookModel
from backend.middleware.auth import admin_required
from backend.utils.audit import log_admin_action

lookbook_bp = Blueprint('lookbook', __name__)

# 1. Public GET: Fetch active lookbooks ordered by display_order
@lookbook_bp.route('', methods=['GET'])
@lookbook_bp.route('/', methods=['GET'])
def get_lookbook_items():
    try:
        items = LookbookModel.query.filter_by(is_active=True).order_by(LookbookModel.display_order.asc(), LookbookModel.id.asc()).all()
        return jsonify([item.to_dict() for item in items]), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching lookbook items: {str(e)}"}), 500

# 2. Admin GET: Fetch all lookbooks (including inactive)
@lookbook_bp.route('/all', methods=['GET'])
@admin_required
def get_all_lookbook_items():
    try:
        items = LookbookModel.query.order_by(LookbookModel.display_order.asc(), LookbookModel.id.asc()).all()
        return jsonify([item.to_dict() for item in items]), 200
    except Exception as e:
        return jsonify({"message": f"Error fetching all lookbook items: {str(e)}"}), 500

# 3. Admin POST: Create a new lookbook card (inserts into lookbooks table)
@lookbook_bp.route('', methods=['POST'])
@lookbook_bp.route('/', methods=['POST'])
@admin_required
def create_lookbook_item():
    try:
        data = request.get_json() or {}
        title = data.get('title')
        if not title:
            return jsonify({"message": "Title is required."}), 400

        details_val = data.get('details')
        if isinstance(details_val, (list, dict)):
            details_str = json.dumps(details_val)
        else:
            details_str = str(details_val) if details_val is not None else None

        item = LookbookModel(
            title=title,
            tag=data.get('tag', 'Featured'),
            image=data.get('image') or data.get('image_url', ''),
            description=data.get('description', ''),
            details=details_str,
            link=data.get('link', ''),
            display_order=int(data.get('display_order', 0)),
            is_active=bool(data.get('is_active', True))
        )
        db.session.add(item)
        db.session.commit()
        log_admin_action("Lookbook Added", "Lookbook Management", f"Created lookbook item: '{title}'")
        return jsonify({"message": "Lookbook item created successfully!", "item": item.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error creating lookbook item: {str(e)}"}), 500

# 4. Admin PUT: Update an existing lookbook card (updates lookbooks table)
@lookbook_bp.route('/<int:id>', methods=['PUT'])
@admin_required
def update_lookbook_item(id):
    try:
        item = LookbookModel.query.get(id)
        if not item:
            return jsonify({"message": "Lookbook item not found."}), 404

        data = request.get_json() or {}
        if 'title' in data:
            item.title = data.get('title')
        if 'tag' in data:
            item.tag = data.get('tag')
        if 'image' in data or 'image_url' in data:
            item.image = data.get('image') or data.get('image_url')
        if 'description' in data:
            item.description = data.get('description')
        if 'details' in data:
            details_val = data.get('details')
            if isinstance(details_val, (list, dict)):
                item.details = json.dumps(details_val)
            else:
                item.details = str(details_val) if details_val is not None else None
        if 'link' in data:
            item.link = data.get('link')
        if 'display_order' in data:
            item.display_order = int(data.get('display_order', 0))
        if 'is_active' in data:
            item.is_active = bool(data.get('is_active', True))

        db.session.commit()
        log_admin_action("Lookbook Updated", "Lookbook Management", f"Updated lookbook item ID: {id}")
        return jsonify({"message": "Lookbook item updated successfully!", "item": item.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error updating lookbook item: {str(e)}"}), 500

# 5. Admin DELETE: Delete a lookbook card (deletes from lookbooks table)
@lookbook_bp.route('/<int:id>', methods=['DELETE'])
@admin_required
def delete_lookbook_item(id):
    try:
        item = LookbookModel.query.get(id)
        if not item:
            return jsonify({"message": "Lookbook item not found."}), 404

        title = item.title
        db.session.delete(item)
        db.session.commit()
        log_admin_action("Lookbook Deleted", "Lookbook Management", f"Deleted lookbook item: '{title}'")
        return jsonify({"message": "Lookbook item deleted successfully!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error deleting lookbook item: {str(e)}"}), 500
