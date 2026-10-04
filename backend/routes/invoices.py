import os
import csv
import io
from flask import Blueprint, request, jsonify, send_file, Response
from sqlalchemy import or_, func, desc, asc
from datetime import datetime

from backend.extensions import db
from backend.models.invoice import InvoiceModel
from backend.models.order import OrderModel
from backend.models.user import UserModel
from backend.middleware.auth import token_required, admin_required
from backend.services.invoice_service import generate_invoice_for_order, generate_invoice_pdf, INVOICE_STORAGE_DIR
from backend.utils.timezone import get_ist_time, format_iso_datetime

invoices_bp = Blueprint('invoices', __name__)

def check_invoice_access(current_user, invoice):
    """
    Check if the user is authorized to access the given invoice:
    - Admin/Owner: Full access
    - Customer: Only own invoices (matching customer_id)
    - Seller: Access if order contains seller's products
    """
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    uid = str(current_user.get("_id") or current_user.get("id"))

    if is_admin or role in ("owner", "admin", "superadmin", "sub_owner", "subowner"):
        return True, None

    if role == "customer":
        if str(invoice.customer_id) == uid:
            return True, None
        return False, "Access denied! You can only access invoices for your own orders."

    if role == "seller":
        order = invoice.order
        if order and any(str(it.seller_id) == uid for it in order.items):
            return True, None
        return False, "Access denied! This invoice does not contain products from your workshop."

    return False, "Unauthorized access to invoice."


@invoices_bp.route('/order/<order_id>', methods=['GET'])
@token_required
def get_order_invoice(current_user, order_id):
    """
    Retrieve or automatically generate the invoice for an order.
    Ensures non-breaking idempotency: if invoice exists, returns it;
    if order exists without invoice, generates it automatically.
    """
    order = None
    if str(order_id).isdigit():
        order = OrderModel.query.get(int(order_id))
    if not order:
        order = OrderModel.query.filter_by(order_id=str(order_id)).first()

    if not order:
        return jsonify({"success": False, "message": f"Order '{order_id}' was not found."}), 404

    # Authorization check on order
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    uid = str(current_user.get("_id") or current_user.get("id"))

    if not (is_admin or role in ("owner", "admin", "superadmin", "sub_owner", "subowner")):
        if role == "customer" and str(order.user_id) != uid:
            return jsonify({"success": False, "message": "Access denied! You can only view your own order invoice."}), 403
        if role == "seller" and not any(str(it.seller_id) == uid for it in order.items):
            return jsonify({"success": False, "message": "Access denied! This order has no items from your store."}), 403

    try:
        invoice = generate_invoice_for_order(order, commit=True)
        return jsonify({
            "success": True,
            "invoice": invoice.to_dict()
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to retrieve or generate invoice: {str(e)}"}), 500


@invoices_bp.route('/<invoice_id_or_num>', methods=['GET'])
@token_required
def get_invoice_by_id(current_user, invoice_id_or_num):
    """
    Retrieve invoice details by invoice ID or invoice number.
    """
    invoice = None
    if str(invoice_id_or_num).isdigit():
        invoice = InvoiceModel.query.get(int(invoice_id_or_num))
    if not invoice:
        invoice = InvoiceModel.query.filter_by(invoice_number=str(invoice_id_or_num)).first()

    if not invoice:
        return jsonify({"success": False, "message": "Invoice not found."}), 404

    has_access, err_msg = check_invoice_access(current_user, invoice)
    if not has_access:
        return jsonify({"success": False, "message": err_msg}), 403

    return jsonify({
        "success": True,
        "invoice": invoice.to_dict()
    }), 200


@invoices_bp.route('/<invoice_id_or_num>/pdf', methods=['GET'])
@invoices_bp.route('/order/<invoice_id_or_num>/pdf', methods=['GET'])
@token_required
def download_invoice_pdf(current_user, invoice_id_or_num):
    """
    Download or stream the professional PDF invoice.
    Accepts ?download=true or ?inline=true query params.
    """
    invoice = None
    if str(invoice_id_or_num).isdigit():
        invoice = InvoiceModel.query.get(int(invoice_id_or_num))
    if not invoice:
        invoice = InvoiceModel.query.filter_by(invoice_number=str(invoice_id_or_num)).first()
    if not invoice:
        # Check if parameter was an Order ID
        order = OrderModel.query.filter(
            or_(OrderModel.order_id == str(invoice_id_or_num), OrderModel.id == (int(invoice_id_or_num) if str(invoice_id_or_num).isdigit() else -1))
        ).first()
        if order:
            invoice = generate_invoice_for_order(order, commit=True)

    if not invoice:
        return jsonify({"success": False, "message": "Invoice record not found."}), 404

    has_access, err_msg = check_invoice_access(current_user, invoice)
    if not has_access:
        return jsonify({"success": False, "message": err_msg}), 403

    pdf_filename = f"{invoice.invoice_number}.pdf"
    pdf_path = os.path.join(INVOICE_STORAGE_DIR, pdf_filename)

    # If file doesn't exist on disk, regenerate it immediately
    if not os.path.exists(pdf_path):
        try:
            generate_invoice_pdf(invoice, pdf_path)
            invoice.invoice_pdf_path = f"/static/invoices/{pdf_filename}"
            db.session.commit()
        except Exception as e:
            return jsonify({"success": False, "message": f"Failed to generate invoice PDF: {str(e)}"}), 500

    as_attachment = request.args.get('download', 'false').lower() in ('true', '1', 'yes')
    download_name = f"CRAFTNEST-Invoice-{invoice.invoice_number}.pdf"

    return send_file(
        pdf_path,
        mimetype='application/pdf',
        as_attachment=as_attachment,
        download_name=download_name
    )


@invoices_bp.route('/admin/all', methods=['GET'])
@admin_required
def admin_get_all_invoices():
    """
    Owner / Admin invoice management endpoint:
    - View all generated invoices
    - Search by invoice number, order ID, customer name, email, phone
    - Filter by payment status, payment method, date range
    - Pagination & aggregate financial metrics (total invoiced, paid, pending)
    """
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    search = request.args.get('search', '').strip()
    order_id = request.args.get('order_id', '').strip()
    invoice_number = request.args.get('invoice_number', '').strip()
    payment_status = request.args.get('payment_status', '').strip()
    start_date = request.args.get('start_date', '').strip()
    end_date = request.args.get('end_date', '').strip()

    query = InvoiceModel.query.join(OrderModel, InvoiceModel.order_id == OrderModel.id)

    # Search filter
    if search:
        search_like = f"%{search}%"
        query = query.filter(
            or_(
                InvoiceModel.invoice_number.ilike(search_like),
                OrderModel.order_id.ilike(search_like),
                InvoiceModel.customer_name.ilike(search_like),
                InvoiceModel.customer_email.ilike(search_like),
                InvoiceModel.customer_phone.ilike(search_like)
            )
        )

    if order_id:
        query = query.filter(OrderModel.order_id.ilike(f"%{order_id}%"))

    if invoice_number:
        query = query.filter(InvoiceModel.invoice_number.ilike(f"%{invoice_number}%"))

    if payment_status and payment_status.upper() != 'ALL':
        query = query.filter(func.upper(InvoiceModel.payment_status) == payment_status.upper())

    if start_date:
        try:
            s_date = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(InvoiceModel.invoice_date >= s_date)
        except ValueError:
            pass

    if end_date:
        try:
            e_date = datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            query = query.filter(InvoiceModel.invoice_date <= e_date)
        except ValueError:
            pass

    # Aggregates across matched query
    total_count = query.count()
    total_amount = db.session.query(func.coalesce(func.sum(InvoiceModel.grand_total), 0.0)).select_from(query.subquery()).scalar() or 0.0
    paid_amount = db.session.query(func.coalesce(func.sum(InvoiceModel.grand_total), 0.0)).select_from(
        query.filter(func.upper(InvoiceModel.payment_status) == 'PAID').subquery()
    ).scalar() or 0.0
    pending_amount = db.session.query(func.coalesce(func.sum(InvoiceModel.grand_total), 0.0)).select_from(
        query.filter(func.upper(InvoiceModel.payment_status).in_(['PENDING', 'PAYMENT PENDING'])).subquery()
    ).scalar() or 0.0

    # Paginate
    query = query.order_by(InvoiceModel.invoice_date.desc())
    invoices_paged = query.offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        "success": True,
        "invoices": [inv.to_dict() for inv in invoices_paged],
        "total": total_count,
        "page": page,
        "limit": limit,
        "pages": (total_count + limit - 1) // limit if limit > 0 else 1,
        "stats": {
            "total_invoices_count": total_count,
            "total_invoiced_amount": float(total_amount),
            "paid_amount": float(paid_amount),
            "pending_amount": float(pending_amount)
        }
    }), 200


@invoices_bp.route('/admin/export', methods=['GET'])
@admin_required
def admin_export_invoices_csv():
    """
    Export all matching invoices as a standard CSV file for accounting and records.
    """
    search = request.args.get('search', '').strip()
    payment_status = request.args.get('payment_status', '').strip()
    start_date = request.args.get('start_date', '').strip()
    end_date = request.args.get('end_date', '').strip()

    query = InvoiceModel.query.join(OrderModel, InvoiceModel.order_id == OrderModel.id)

    if search:
        search_like = f"%{search}%"
        query = query.filter(
            or_(
                InvoiceModel.invoice_number.ilike(search_like),
                OrderModel.order_id.ilike(search_like),
                InvoiceModel.customer_name.ilike(search_like),
                InvoiceModel.customer_email.ilike(search_like)
            )
        )

    if payment_status and payment_status.upper() != 'ALL':
        query = query.filter(func.upper(InvoiceModel.payment_status) == payment_status.upper())

    if start_date:
        try:
            s_date = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(InvoiceModel.invoice_date >= s_date)
        except ValueError:
            pass

    if end_date:
        try:
            e_date = datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            query = query.filter(InvoiceModel.invoice_date <= e_date)
        except ValueError:
            pass

    invoices = query.order_by(InvoiceModel.invoice_date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # CSV Headers
    writer.writerow([
        "Invoice Number",
        "Order ID",
        "Invoice Date",
        "Customer Name",
        "Customer Email",
        "Customer Phone",
        "Payment Method",
        "Payment Status",
        "Subtotal (INR)",
        "Tax Amount (INR)",
        "CGST (INR)",
        "SGST (INR)",
        "IGST (INR)",
        "Shipping (INR)",
        "Grand Total (INR)",
        "Destination State"
    ])

    for inv in invoices:
        order_num = inv.order.order_id if inv.order else f"ORD-{inv.order_id}"
        inv_dt = inv.invoice_date.strftime("%Y-%m-%d %H:%M:%S") if inv.invoice_date else ""
        ship = inv.shipping_address_snapshot or {}
        state = ship.get("state") or ""

        writer.writerow([
            inv.invoice_number,
            order_num,
            inv_dt,
            inv.customer_name or "",
            inv.customer_email or "",
            inv.customer_phone or "",
            inv.payment_method or "CASH_ON_DELIVERY",
            inv.payment_status or "PENDING",
            float(inv.subtotal or 0.0),
            float(inv.tax_amount or 0.0),
            float(inv.cgst_amount or 0.0),
            float(inv.sgst_amount or 0.0),
            float(inv.igst_amount or 0.0),
            float(inv.shipping_charges or 0.0),
            float(inv.grand_total or 0.0),
            state
        ])

    csv_data = output.getvalue()
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"craftnest_invoices_{timestamp_str}.csv"

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
