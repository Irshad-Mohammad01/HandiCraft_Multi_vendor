from functools import wraps
from flask import Blueprint, request, jsonify
from backend.models.support import SupportModel, SupportReplyModel, FAQModel, SupportLinkModel
from backend.models.user import UserModel
from backend.models.admin import AdminModel
from backend.middleware.auth import admin_required, token_required, extract_bearer_token, decode_jwt_token
from backend.extensions import db

support_bp = Blueprint('support', __name__)

ALLOWED_SUPPORT_URL_PREFIXES = ("https://", "http://", "mailto:", "tel:", "/")


def _is_valid_support_url(url):
    normalized = str(url or "").strip().lower()
    return normalized.startswith(ALLOWED_SUPPORT_URL_PREFIXES) and not normalized.startswith("//")


def owner_admin_required(f):
    """
    Ensure the request is made by an authenticated Owner or Admin.
    Sellers and general customers are strictly rejected with 403 Forbidden.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        token = extract_bearer_token()
        if not token:
            return jsonify({"message": "Authentication token is missing!"}), 401
        data, err = decode_jwt_token(token)
        if err or not data:
            return jsonify({"message": "Access denied! Invalid authentication token."}), 401

        user_id = data.get("user_id") or data.get("admin_id") or data.get("id")

        # 1. AdminModel session
        if data.get("admin_id") and user_id and str(user_id).isdigit():
            admin_obj = AdminModel.query.get(int(user_id))
            if admin_obj:
                return f(*args, **kwargs)

        # 2. UserModel session (Owner or Admin role only; never seller)
        if user_id:
            current_user = UserModel.find_by_id(user_id)
            if current_user:
                role = str(current_user.get("role") or "").lower()
                is_admin = bool(current_user.get("is_admin"))
                if role == "seller":
                    return jsonify({"message": "Access denied! Sellers cannot access Owner support."}), 403
                if is_admin or role in ("owner", "admin", "superadmin", "master"):
                    return f(*args, **kwargs)

        return jsonify({"message": "Access denied! Owner privileges required."}), 403
    return decorated


# List of beginner-friendly FAQs for initial seeding
DEFAULT_FAQS = [
    {
        "question": "What is CraftNest?",
        "answer": "CraftNest is a premier handcrafted goods and artisan marketplace offering masterfully crafted jewelry, pottery, textiles, and home decor."
    },
    {
        "question": "What certifications do you provide?",
        "answer": "All our artisan products meet authentic handcrafted criteria and carry verified quality certifications."
    },
    {
        "question": "Do you offer custom designs?",
        "answer": "Yes, we offer bespoke custom design services. You can contact our support team or connect directly with registered artisans."
    },
    {
        "question": "What is your return policy?",
        "answer": "We offer a 7-day hassle-free return policy on standard catalog items. Bespoke or customized pieces cannot be returned once crafting begins."
    },
    {
        "question": "How do I contact support?",
        "answer": "Fill out the contact form on this page or email our customer care team directly."
    }
]

def ensure_faqs_seeded():
    try:
        faqs = FAQModel.find_all()
        if not faqs:
            for item in DEFAULT_FAQS:
                FAQModel.create_faq(item["question"], item["answer"])
    except Exception as e:
        print("Failed to seed FAQs:", e)

@support_bp.route('', methods=['POST'])
def submit_contact_form():
    data = request.get_json() or {}
    name = str(data.get("name") or "").strip()
    email = str(data.get("email") or "").strip().lower()
    subject = str(data.get("subject") or "").strip()
    category = str(data.get("category") or "General Inquiry").strip()
    order_id = str(data.get("order_id") or "").strip()
    priority = str(data.get("priority") or "Medium").strip()
    message = str(data.get("message") or "").strip()
    
    if not all([name, email, message]):
        return jsonify({"message": "Please provide your name, email, and message."}), 400

    # Determine user_id if user is authenticated or by email lookup
    user_id = None
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_header:
        try:
            token = auth_header.split(" ")[1] if auth_header.startswith("Bearer ") else auth_header
            decoded_data, err = decode_jwt_token(token)
            if decoded_data and isinstance(decoded_data, dict):
                uid_val = decoded_data.get("user_id") or decoded_data.get("id")
                if uid_val and str(uid_val).isdigit():
                    user_id = int(uid_val)
        except Exception:
            pass

    if not user_id and email:
        user_obj = UserModel.query.filter(
            (UserModel.email == email) | (UserModel.email == email.lower())
        ).first()
        if user_obj:
            user_id = user_obj.id

    msg = SupportModel.create_message(
        name=name,
        email=email,
        message=message,
        user_id=user_id,
        subject=subject or "General Inquiry",
        category=category or "General Inquiry",
        order_id=order_id or None,
        priority=priority or "Medium"
    )
    if not msg:
        return jsonify({"message": "We could not create your support ticket. Please try again."}), 500

    return jsonify({
        "message": "Thank you! Your support message has been submitted. Our team will contact you shortly.",
        "support_message": msg,
        "ticket": msg,
        "ticket_id": msg.get("ticket_id")
    }), 201


@support_bp.route('/unread-count', methods=['GET'])
@owner_admin_required
def get_unread_count():
    try:
        from sqlalchemy import or_
        unresolved_count = SupportModel.query.filter(
            or_(
                SupportModel.status == 'Open',
                SupportModel.status == 'Pending',
                SupportModel.status == 'In Progress'
            )
        ).count()
        open_count = SupportModel.query.filter(
            or_(SupportModel.status == 'Open', SupportModel.status == 'Pending')
        ).count()
        total_count = SupportModel.query.count()
        return jsonify({
            "unread_count": unresolved_count,
            "unresolved_count": unresolved_count,
            "open_count": open_count,
            "total_count": total_count
        }), 200
    except Exception as e:
        print("Error fetching unread count:", e)
        return jsonify({"unread_count": 0, "unresolved_count": 0, "open_count": 0, "total_count": 0}), 200


@support_bp.route('/<int:ticket_id>', methods=['GET'])
@token_required
def get_ticket_details(current_user, ticket_id):
    from sqlalchemy.orm import selectinload
    ticket = SupportModel.query.options(selectinload(SupportModel.replies)).get(ticket_id)
    if not ticket:
        return jsonify({"message": "Support ticket not found."}), 404
        
    caller_id = current_user.get("id") or current_user.get("_id")
    caller_role = str(current_user.get("role") or "").lower()
    caller_is_admin = bool(current_user.get("is_admin")) or caller_role in ("owner", "admin", "superadmin")
    
    # Sellers cannot access support tickets
    if caller_role == "seller":
        return jsonify({"message": "Access denied! Sellers cannot access support management."}), 403
        
    # Non-admin users can only view their own ticket
    if not caller_is_admin:
        user_matches = (ticket.user_id and caller_id and int(ticket.user_id) == int(caller_id))
        email_matches = (ticket.email and current_user.get("email") and ticket.email.lower() == str(current_user.get("email")).lower())
        if not (user_matches or email_matches):
            return jsonify({"message": "Access denied! You do not have permission to view this ticket."}), 403
            
    return jsonify(ticket.to_dict()), 200


@support_bp.route('/<int:ticket_id>/reply', methods=['POST'])
@token_required
def reply_to_ticket(current_user, ticket_id):
    from backend.routes.auth import add_user_notification
    from backend.utils.email_service import send_support_ticket_reply
    
    try:
        ticket = SupportModel.query.with_for_update().get(ticket_id)
        if not ticket:
            return jsonify({"message": "Support ticket not found."}), 404
            
        caller_id_value = current_user.get("id") or current_user.get("_id")
        if not caller_id_value or not str(caller_id_value).isdigit():
            return jsonify({"message": "Invalid authenticated user."}), 401
        caller_id = int(caller_id_value)
        caller_role = str(current_user.get("role") or "").lower()
        caller_is_admin = bool(current_user.get("is_admin")) or caller_role in ("owner", "admin", "superadmin")
        
        # Sellers forbidden
        if caller_role == "seller":
            return jsonify({"message": "Access denied! Sellers cannot reply to support tickets."}), 403
            
        # If not admin/owner, check customer ticket ownership
        if not caller_is_admin:
            user_matches = (ticket.user_id and int(ticket.user_id) == caller_id)
            email_matches = (ticket.email and current_user.get("email") and ticket.email.lower() == str(current_user.get("email")).lower())
            if not (user_matches or email_matches):
                return jsonify({"message": "Access denied! You cannot reply to another customer's ticket."}), 403
            
        data = request.get_json() or {}
        message = str(data.get("message") or "").strip()
        status_update = str(data.get("status") or "").strip()
        
        if not message:
            return jsonify({"message": "Message is required."}), 400
            
        sender = "CraftNest Support" if caller_is_admin else (current_user.get("name") or ticket.name or "Customer")
        
        reply = SupportReplyModel(
            support_id=ticket.id,
            sender=sender,
            message=message
        )
        db.session.add(reply)
        
        is_admin_reply = caller_is_admin
        email_delivery = {"success": False, "status": "not_applicable"}
        
        if is_admin_reply:
            if status_update and status_update.lower() in ["open", "in progress", "replied", "resolved"]:
                valid_map = {"open": "Open", "in progress": "In Progress", "replied": "Replied", "resolved": "Resolved"}
                ticket.status = valid_map.get(status_update.lower(), status_update)
            else:
                ticket.status = "Replied"
        else:
            # Customer response reopens the ticket
            ticket.status = "Open"
            
        db.session.commit()
        
        # Trigger Notifications: Notify customer when Owner replies
        if is_admin_reply:
            recipient_user = None
            if ticket.user_id:
                recipient_user = UserModel.query.get(int(ticket.user_id))
            if not recipient_user and ticket.email:
                recipient_user = UserModel.query.filter(
                    (UserModel.email == ticket.email) | (UserModel.email == ticket.email.lower())
                ).first()
                if recipient_user:
                    ticket.user_id = recipient_user.id
                    db.session.commit()
                    
            if recipient_user:
                add_user_notification(
                    user_id=recipient_user.id,
                    title="Support Ticket Reply",
                    message=message,
                    notif_type="support_ticket_reply",
                    ticket_id=ticket.id,
                    original_message=ticket.message
                )

            recipient_email = getattr(recipient_user, "email", None) if recipient_user else ticket.email
            recipient_name = getattr(recipient_user, "full_name", None) if recipient_user else ticket.name
            if recipient_email:
                email_delivery = send_support_ticket_reply(
                    recipient_email,
                    recipient_name,
                    ticket.id,
                    ticket.message,
                    message,
                )
            else:
                email_delivery = {"success": False, "status": "no_recipient"}
        
        email_sent = email_delivery.get("status") in ("delivered", "sent", "success")
        
        return jsonify({
            "message": "Reply submitted successfully!",
            "reply": reply.to_dict(),
            "ticket": ticket.to_dict(),
            "success": True,
            "email_sent": email_sent,
            "email_status": email_delivery.get("status")
        }), 201
    except Exception as e:
        db.session.rollback()
        print("Failed to save support ticket reply:", e)
        return jsonify({"message": f"Failed to reply: {str(e)}"}), 500


@support_bp.route('/<int:ticket_id>/status', methods=['PUT'])
@support_bp.route('/messages/<int:ticket_id>/status', methods=['PUT'])
@owner_admin_required
def update_ticket_status(ticket_id):
    data = request.get_json() or {}
    status = data.get("status")
    if not status:
        return jsonify({"message": "Status is required."}), 400
        
    try:
        msg = SupportModel.query.with_for_update().get(ticket_id)
        if not msg:
            return jsonify({"message": "Support ticket not found."}), 404
            
        valid_statuses = ["Open", "In Progress", "Replied", "Resolved"]
        matched_status = next((s for s in valid_statuses if s.lower() == str(status).strip().lower()), str(status).strip())
        
        old_status = msg.status
        msg.status = matched_status
        db.session.commit()
        
        # Trigger customer notification if status changed
        if old_status != matched_status:
            try:
                recipient_user = None
                if msg.user_id:
                    recipient_user = UserModel.query.get(int(msg.user_id))
                if not recipient_user and msg.email:
                    recipient_user = UserModel.query.filter(
                        (UserModel.email == msg.email) | (UserModel.email == msg.email.lower())
                    ).first()
                if recipient_user:
                    from backend.routes.auth import add_user_notification
                    st_title = f"Support Ticket #{msg.id} Resolved" if matched_status == "Resolved" else f"Support Ticket #{msg.id} Status: {matched_status}"
                    st_msg = f"Your support ticket #{msg.id} ('{msg.subject or 'Inquiry'}') status has been updated to {matched_status}."
                    add_user_notification(
                        user_id=recipient_user.id,
                        title=st_title,
                        message=st_msg,
                        notif_type="support_ticket_status",
                        ticket_id=msg.id,
                        original_message=msg.message
                    )
            except Exception as notif_err:
                print("Error sending ticket status notification:", notif_err)
        
        # Audit Log
        try:
            from backend.utils.audit import log_admin_action
            log_admin_action("Support Ticket Updated", "Support Management", f"Updated support ticket #{ticket_id} status from '{old_status}' to '{matched_status}'")
        except Exception as ex:
            print("Failed to log admin action:", ex)
        
        return jsonify({
            "message": "Support ticket status updated successfully.",
            "status": msg.status,
            "ticket": msg.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        print("Error updating support message status:", e)
        return jsonify({"message": "An error occurred while updating support message status."}), 500


@support_bp.route('/my-tickets', methods=['GET'])
@token_required
def get_my_tickets(current_user):
    user_id = current_user.get("_id") or current_user.get("id")
    email = str(current_user.get("email") or "").strip().lower()
    if not user_id and not email:
        return jsonify([]), 200
    
    from sqlalchemy.orm import selectinload
    from sqlalchemy import or_
    
    conditions = []
    if user_id and str(user_id).isdigit():
        conditions.append(SupportModel.user_id == int(user_id))
    if email:
        conditions.append(SupportModel.email == email)
        conditions.append(SupportModel.email == email.lower())
        
    if not conditions:
        return jsonify([]), 200

    query = SupportModel.query.options(selectinload(SupportModel.replies)).filter(or_(*conditions)).order_by(SupportModel.created_at.desc())
    
    page_arg = request.args.get('page')
    limit_arg = request.args.get('limit') or request.args.get('page_size')
    if page_arg or limit_arg or request.args.get('paginate') == 'true':
        from backend.utils.pagination import parse_pagination_params, paginate_query
        p_num, p_limit = parse_pagination_params()
        return jsonify(paginate_query(query, page=p_num, limit=p_limit)), 200

    tickets = query.all()
    return jsonify([t.to_dict() for t in tickets]), 200


@support_bp.route('/all', methods=['GET'])
@owner_admin_required
def get_all_messages():
    from sqlalchemy.orm import selectinload
    from sqlalchemy import or_
    from datetime import datetime, timedelta
    import pytz
    
    search = str(request.args.get('search') or "").strip()
    status_filter = str(request.args.get('status') or "").strip()
    category_filter = str(request.args.get('category') or "").strip()
    date_filter = str(request.args.get('date') or "").strip()
    sort_order = str(request.args.get('sort') or "newest").strip().lower()

    query = SupportModel.query.options(selectinload(SupportModel.replies))

    # Search filter: Ticket ID, customer name, email, subject, message, order ID
    if search:
        clean_search = search.upper().replace("TKT-", "").lstrip("#").strip()
        id_match = int(clean_search) if clean_search.isdigit() else None
        
        search_pattern = f"%{search}%"
        filters = [
            SupportModel.name.ilike(search_pattern),
            SupportModel.email.ilike(search_pattern),
            SupportModel.subject.ilike(search_pattern),
            SupportModel.message.ilike(search_pattern),
            SupportModel.order_id.ilike(search_pattern),
        ]
        if id_match is not None:
            filters.append(SupportModel.id == id_match)
        query = query.filter(or_(*filters))

    # Status filter
    if status_filter and status_filter.lower() != 'all':
        query = query.filter(db.func.lower(SupportModel.status) == status_filter.lower())

    # Category filter
    if category_filter and category_filter.lower() != 'all':
        query = query.filter(db.func.lower(SupportModel.category) == category_filter.lower())

    # Date filter
    if date_filter and date_filter.lower() != 'all':
        ist = pytz.timezone('Asia/Kolkata')
        now_ist = datetime.now(ist)
        today_date = now_ist.date()
        
        if date_filter.lower() == 'today':
            query = query.filter(db.func.date(SupportModel.created_at) == today_date)
        elif date_filter.lower() == 'yesterday':
            yesterday_date = today_date - timedelta(days=1)
            query = query.filter(db.func.date(SupportModel.created_at) == yesterday_date)
        elif date_filter.lower() in ('week', 'last_7_days', '7days'):
            seven_days_ago = today_date - timedelta(days=7)
            query = query.filter(db.func.date(SupportModel.created_at) >= seven_days_ago)
        elif date_filter.lower() in ('month', 'last_30_days', '30days'):
            thirty_days_ago = today_date - timedelta(days=30)
            query = query.filter(db.func.date(SupportModel.created_at) >= thirty_days_ago)
        else:
            try:
                parsed_d = datetime.strptime(date_filter, "%Y-%m-%d").date()
                query = query.filter(db.func.date(SupportModel.created_at) == parsed_d)
            except Exception:
                pass

    # Sort
    if sort_order == 'oldest':
        query = query.order_by(SupportModel.created_at.asc())
    else:
        query = query.order_by(SupportModel.created_at.desc())

    page_arg = request.args.get('page')
    limit_arg = request.args.get('limit') or request.args.get('page_size')
    if page_arg or limit_arg or request.args.get('paginate') == 'true':
        from backend.utils.pagination import parse_pagination_params, paginate_query
        p_num, p_limit = parse_pagination_params()
        paginated_res = paginate_query(query, page=p_num, limit=p_limit)
        return jsonify(paginated_res), 200

    messages = query.all()
    return jsonify([m.to_dict() for m in messages]), 200

@support_bp.route('/faqs', methods=['GET'])
def get_faqs():
    ensure_faqs_seeded()
    faqs = FAQModel.find_all()
    return jsonify([f.to_dict() for f in faqs]), 200

@support_bp.route('/faqs', methods=['POST'])
@admin_required
def add_faq():
    data = request.get_json() or {}
    question = data.get("question")
    answer = data.get("answer")
    if not question or not answer:
        return jsonify({"message": "Question and Answer are required."}), 400
    faq = FAQModel.create_faq(question, answer)
    if faq:
        from backend.utils.audit import log_admin_action
        log_admin_action("Support Ticket Updated", "Support Management", f"Added new FAQ: '{question}'")
        return jsonify(faq), 201
    return jsonify({"message": "Failed to create FAQ."}), 500

@support_bp.route('/faqs/<int:faq_id>', methods=['PUT'])
@admin_required
def update_faq(faq_id):
    data = request.get_json() or {}
    question = data.get("question")
    answer = data.get("answer")
    if not question or not answer:
        return jsonify({"message": "Question and Answer are required."}), 400
    faq = FAQModel.update_faq(faq_id, question, answer)
    if faq:
        from backend.utils.audit import log_admin_action
        log_admin_action("Support Ticket Updated", "Support Management", f"Updated FAQ ID {faq_id}: '{question}'")
        return jsonify(faq), 200
    return jsonify({"message": "FAQ not found or update failed."}), 404

@support_bp.route('/faqs/<int:faq_id>', methods=['DELETE'])
@admin_required
def delete_faq(faq_id):
    success = FAQModel.delete_faq(faq_id)
    if success:
        from backend.utils.audit import log_admin_action
        log_admin_action("Support Ticket Updated", "Support Management", f"Deleted FAQ ID {faq_id}")
        return jsonify({"message": "FAQ deleted successfully."}), 200
    return jsonify({"message": "FAQ not found or delete failed."}), 404

@support_bp.route('/messages/<int:msg_id>/status', methods=['PUT'])
@admin_required
def update_message_status(msg_id):
    from backend.extensions import db
    data = request.get_json() or {}
    status = data.get("status")
    if not status:
        return jsonify({"message": "Status is required."}), 400
        
    try:
        msg = SupportModel.query.with_for_update().get(msg_id)
        if not msg:
            return jsonify({"message": "Message not found."}), 404
            
        old_status = msg.status
        msg.status = status
        db.session.commit()
        
        # Audit Log
        try:
            from backend.utils.audit import log_admin_action
            log_admin_action("Support Ticket Updated", "Support Management", f"Updated support ticket status from '{old_status}' to '{status}' for message from '{msg.name}' (ID: {msg_id})")
        except Exception as ex:
            print("Failed to log admin action:", ex)
        
        return jsonify({"message": "Support message status updated successfully.", "status": status}), 200
    except Exception as e:
        db.session.rollback()
        print("Error updating support message status:", e)
        return jsonify({"message": "An error occurred while updating support message status."}), 500

DEFAULT_SUPPORT_LINKS = [
    {
        "title": "+91 98765 43210",
        "url": "tel:+919876543210",
        "icon": "Phone"
    },
    {
        "title": "support@SSJewellery.com",
        "url": "mailto:support@SSJewellery.com",
        "icon": "Mail"
    },
    {
        "title": "Connaught Place, New Delhi, India",
        "url": "https://maps.google.com/?q=Connaught+Place,+New+Delhi,+India",
        "icon": "MapPin"
    }
]

def ensure_support_links_seeded():
    try:
        links = SupportLinkModel.find_all()
        if not links:
            for item in DEFAULT_SUPPORT_LINKS:
                SupportLinkModel.create_link(item["title"], item["url"], item["icon"])
    except Exception as e:
        print("Failed to seed support links:", e)

@support_bp.route('/links', methods=['GET'])
def get_support_links():
    links = SupportLinkModel.find_all()
    response = jsonify([link.to_dict() for link in links])
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response, 200

@support_bp.route('/links', methods=['POST'])
@admin_required
def add_support_link():
    data = request.get_json() or {}
    title = str(data.get("title") or "").strip()
    url = str(data.get("url") or "").strip()
    icon = str(data.get("icon") or "Phone").strip()
    is_active = data.get("is_active", True)
    if not title or not url:
        return jsonify({"message": "Title and URL are required."}), 400
    if not _is_valid_support_url(url):
        return jsonify({"message": "Use a valid https://, http://, mailto:, tel:, or internal / link."}), 400
    link = SupportLinkModel.create_link(title, url, icon, is_active)
    if link:
        from backend.utils.audit import log_admin_action
        log_admin_action("Support Ticket Updated", "Support Management", f"Added new Support Link: '{title}' ({url})")
        return jsonify(link), 201
    return jsonify({"message": "Failed to create support link."}), 500

@support_bp.route('/links/<int:link_id>', methods=['PUT'])
@admin_required
def update_support_link(link_id):
    data = request.get_json() or {}
    title = str(data.get("title") or "").strip()
    url = str(data.get("url") or "").strip()
    icon = str(data.get("icon") or "").strip()
    is_active = data.get("is_active", True)
    if not title or not url or not icon:
        return jsonify({"message": "Title, URL, and Icon are required."}), 400
    if not _is_valid_support_url(url):
        return jsonify({"message": "Use a valid https://, http://, mailto:, tel:, or internal / link."}), 400
    link = SupportLinkModel.update_link(link_id, title, url, icon, is_active)
    if link:
        from backend.utils.audit import log_admin_action
        log_admin_action("Support Ticket Updated", "Support Management", f"Updated Support Link ID {link_id}: '{title}'")
        return jsonify(link), 200
    return jsonify({"message": "Support link not found or update failed."}), 404

@support_bp.route('/links/<int:link_id>', methods=['DELETE'])
@admin_required
def delete_support_link(link_id):
    success = SupportLinkModel.delete_link(link_id)
    if success:
        from backend.utils.audit import log_admin_action
        log_admin_action("Support Ticket Updated", "Support Management", f"Deleted Support Link ID {link_id}")
        return jsonify({"message": "Support link deleted successfully."}), 200
    return jsonify({"message": "Support link not found or delete failed."}), 404



