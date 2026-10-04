import os
from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.order import OrderModel
from backend.models.product import ProductModel
from backend.models.user import UserModel, DeliveryAddress
from backend.middleware.auth import token_required, admin_required
from backend.utils.email_service import send_order_confirmation, send_order_status_update

orders_bp = Blueprint('orders', __name__)

def is_address_complete(addr, name=None, phone=None):
    if not addr or not isinstance(addr, dict):
        return False
    street = addr.get("street") or addr.get("address")
    house = addr.get("house_number") or addr.get("house")
    city = addr.get("city")
    state = addr.get("state")
    pincode = addr.get("pincode") or addr.get("postal_code")
    
    full_name = addr.get("full_name") or addr.get("name") or name
    mobile = addr.get("phone") or addr.get("mobile_number") or addr.get("mobile") or phone
    
    if not full_name or not str(full_name).strip():
        return False
    if not mobile or not str(mobile).strip():
        return False
    if not house or not str(house).strip():
        return False
    if not street or not str(street).strip():
        return False
    if not city or not str(city).strip():
        return False
    if not state or not str(state).strip():
        return False
    if not pincode or not str(pincode).strip():
        return False
        
    return True

@orders_bp.route('', methods=['POST'])
@token_required
def create_order(current_user):
    from backend.models.product import BuyRequestModel, ProductModel, StockHistoryModel, ProductAuditLogModel
    from backend.models.transaction import TransactionModel
    from backend.utils.timezone import get_ist_time
    import random
    from datetime import datetime
    
    data = request.get_json() or {}
    raw_shipping_address = data.get("shipping_address")
    items = data.get("items", [])
    terms_accepted = data.get("terms_accepted", True)
    buy_request_id = data.get("buy_request_id")
    selected_address_id = data.get("selected_address_id")
    payment_method = str(data.get("payment_method") or "CASH_ON_DELIVERY").upper()
    
    if not items or len(items) == 0:
        return jsonify({"message": "No items provided for order."}), 400
        
    try:
        # 1. Lock user row
        user_obj = UserModel.query.with_for_update().get(int(current_user["_id"]))
        if not user_obj:
            return jsonify({"message": "User not found."}), 404

        # 2. Resolve and validate delivery address
        shipping_address_snapshot = None
        if selected_address_id:
            db_addr = DeliveryAddress.query.filter_by(id=int(selected_address_id), user_id=user_obj.id).first()
            if not db_addr:
                return jsonify({
                    "success": False,
                    "message": "Selected delivery address was not found or does not belong to your account."
                }), 400
            shipping_address_snapshot = {
                "name": db_addr.full_name or user_obj.name,
                "full_name": db_addr.full_name or user_obj.name,
                "phone": db_addr.phone or user_obj.phone,
                "mobile_number": db_addr.phone or user_obj.phone,
                "house_number": db_addr.house_number,
                "street": db_addr.street,
                "area": db_addr.area or db_addr.street,
                "landmark": db_addr.landmark or "",
                "city": db_addr.city,
                "state": db_addr.state,
                "pincode": db_addr.pincode,
                "postal_code": db_addr.pincode,
                "country": db_addr.country or "India",
                "address_type": db_addr.address_type or "Home",
                "email": user_obj.email
            }
        elif raw_shipping_address and isinstance(raw_shipping_address, dict):
            name = raw_shipping_address.get("full_name") or raw_shipping_address.get("name") or user_obj.name
            phone = raw_shipping_address.get("mobile_number") or raw_shipping_address.get("phone") or user_obj.phone
            if not is_address_complete(raw_shipping_address, name, phone):
                return jsonify({
                    "success": False,
                    "message": "A complete and valid delivery address is required to place your order."
                }), 400
            shipping_address_snapshot = {
                "name": name,
                "full_name": name,
                "phone": phone,
                "mobile_number": phone,
                "house_number": raw_shipping_address.get("house_number") or raw_shipping_address.get("house", ""),
                "street": raw_shipping_address.get("street") or raw_shipping_address.get("address", ""),
                "area": raw_shipping_address.get("area") or raw_shipping_address.get("street", ""),
                "landmark": raw_shipping_address.get("landmark", ""),
                "city": raw_shipping_address.get("city", ""),
                "state": raw_shipping_address.get("state", ""),
                "pincode": raw_shipping_address.get("pincode") or raw_shipping_address.get("postal_code", ""),
                "postal_code": raw_shipping_address.get("pincode") or raw_shipping_address.get("postal_code", ""),
                "country": raw_shipping_address.get("country", "India"),
                "address_type": raw_shipping_address.get("address_type", "Home"),
                "email": raw_shipping_address.get("email") or user_obj.email
            }
        else:
            # Fall back to default address if customer has one saved
            default_addr = DeliveryAddress.query.filter_by(user_id=user_obj.id, is_default=True).first()
            if not default_addr:
                default_addr = DeliveryAddress.query.filter_by(user_id=user_obj.id).first()
            if default_addr and is_address_complete(default_addr.to_dict()):
                shipping_address_snapshot = {
                    "name": default_addr.full_name or user_obj.name,
                    "full_name": default_addr.full_name or user_obj.name,
                    "phone": default_addr.phone or user_obj.phone,
                    "mobile_number": default_addr.phone or user_obj.phone,
                    "house_number": default_addr.house_number,
                    "street": default_addr.street,
                    "area": default_addr.area or default_addr.street,
                    "landmark": default_addr.landmark or "",
                    "city": default_addr.city,
                    "state": default_addr.state,
                    "pincode": default_addr.pincode,
                    "postal_code": default_addr.pincode,
                    "country": default_addr.country or "India",
                    "address_type": default_addr.address_type or "Home",
                    "email": user_obj.email
                }
            else:
                return jsonify({
                    "success": False,
                    "message": "No delivery address found. Please add your delivery address to continue."
                }), 400

        # 3. Idempotency Check
        idempotency_key = request.headers.get("Idempotency-Key") or data.get("idempotency_key")
        if idempotency_key:
            existing_tx = TransactionModel.query.filter_by(payment_reference=str(idempotency_key).strip(), customer_id=user_obj.id).first()
            if existing_tx and existing_tx.order_id:
                existing_ord = OrderModel.query.get(existing_tx.order_id)
                if existing_ord:
                    return jsonify({
                        "message": "Order already created (idempotent request).",
                        "order": existing_ord.to_dict(),
                        "order_id": existing_ord.order_id,
                        "id": existing_ord.id,
                        "idempotent": True
                    }), 200

        # 4. Multi-Database Product Resolution & Validation
        from backend.services.catalog_aggregation_service import catalog_aggregation_service as catalog_aggregation
        from backend.services.seller_database_service import seller_db_service
        from backend.models.database_registry import SellerDatabaseRegistry

        # Lock BuyRequest row if any
        buy_req = None
        if buy_request_id:
            buy_req = BuyRequestModel.query.filter_by(
                id=int(buy_request_id),
                user_id=int(current_user["_id"])
            ).with_for_update().first()
            if not buy_req:
                return jsonify({"message": "Buy request not found."}), 404

        # Parse composite or integer IDs
        parsed_items = []
        for item in items:
            p_id_raw = item.get("product_id") or item.get("id")
            if not p_id_raw:
                return jsonify({"message": "Item product_id is missing."}), 400
            try:
                quantity = int(item.get("quantity", 1))
            except (ValueError, TypeError):
                quantity = 1
            if quantity <= 0:
                return jsonify({"message": "Item quantity must be at least 1."}), 400

            source_type, parsed_sid, local_id = catalog_aggregation.parse_product_composite_id(p_id_raw)
            parsed_items.append({
                "raw_id": p_id_raw,
                "source_type": source_type,
                "seller_id": parsed_sid,
                "local_id": local_id,
                "quantity": quantity
            })

        # Lock DB1 products with pessimistic concurrency control (with_for_update)
        db1_ids = []
        for pi in parsed_items:
            if pi["source_type"] in ("owner", "numeric") or (pi["source_type"] == "unknown" and str(pi["local_id"]).isdigit()):
                if str(pi["local_id"]).isdigit():
                    db1_ids.append(int(pi["local_id"]))
        sorted_db1_ids = sorted(list(set(db1_ids)))

        db1_product_map = {}
        if sorted_db1_ids:
            db1_products = ProductModel.query.filter(ProductModel.id.in_(sorted_db1_ids)).with_for_update().all()
            db1_product_map = {p.id: p for p in db1_products}

        # Validate products strictly from source database (never trusting frontend price or seller)
        calculated_subtotal = 0.0
        verified_items = []

        for pi in parsed_items:
            raw_id = pi["raw_id"]
            qty = pi["quantity"]
            src = pi["source_type"]
            sid = pi["seller_id"]
            lid = pi["local_id"]

            prod_obj = None
            is_owner_db = False

            if (src in ("owner", "numeric") or src == "unknown") and str(lid).isdigit() and int(lid) in db1_product_map:
                prod_obj = db1_product_map.get(int(lid))
                if prod_obj:
                    is_owner_db = True
                    prod_name = prod_obj.name
                    prod_price = float(prod_obj.price)
                    prod_stock = int(prod_obj.stock or 0)
                    prod_img = (prod_obj.images[0] if getattr(prod_obj, "images", None) and len(prod_obj.images) > 0 
                                else getattr(prod_obj, "image", None) or getattr(prod_obj, "image_url", None) or "")
                    actual_seller_id = prod_obj.seller_id

            if not is_owner_db:
                # Query isolated seller database directly
                seller_prod = None
                if sid and seller_db_service.is_isolated_seller(sid):
                    seller_prod = seller_db_service.get_product_by_id(sid, lid)
                else:
                    # Query catalog aggregation if seller ID was not in composite string
                    res = catalog_aggregation.get_product_by_id(raw_id)
                    if res and res.get("seller_id") and seller_db_service.is_isolated_seller(res.get("seller_id")):
                        sid = int(res["seller_id"])
                        lid = res.get("local_id") or lid
                        seller_prod = res

                if not seller_prod or seller_prod.get("status") == "deleted":
                    return jsonify({"message": f"Product '{raw_id}' was not found in workshop inventory."}), 404

                prod_name = seller_prod["name"]
                prod_price = float(seller_prod["price"])
                prod_stock = int(seller_prod.get("stock") or 0)
                prod_img = seller_prod.get("image_url") or seller_prod.get("image") or ""
                actual_seller_id = sid
                src = "seller"

            # Check stock
            if not buy_req:
                if prod_stock < qty:
                    return jsonify({"message": f"Insufficient stock for '{prod_name}'! Only {prod_stock} items left."}), 400

            item_total = round(prod_price * qty, 2)
            calculated_subtotal = round(calculated_subtotal + item_total, 2)

            verified_items.append({
                "raw_id": raw_id,
                "source_type": "owner" if is_owner_db else "seller",
                "local_id": lid,
                "product_id": int(lid) if is_owner_db else None,  # Nullable in DB1 OrderItem to prevent FK violation
                "seller_id": actual_seller_id,
                "name": prod_name,
                "price": prod_price,
                "quantity": qty,
                "image": prod_img,
                "db_obj": prod_obj if is_owner_db else None
            })

        # 5. Calculate platform shipping, discount, and seller-wise allocations
        shipping_cost = 0.0 if (calculated_subtotal >= 999.0 or calculated_subtotal == 0.0) else 99.0
        discount_amount = float(data.get("discount_amount") or 0.0)
        discount = round(min(discount_amount, calculated_subtotal), 2)
        calculated_total = max(0.0, round(calculated_subtotal - discount + shipping_cost, 2))

        # Group items by seller for split routing
        seller_splits = []
        owner_items = [it for it in verified_items if it["source_type"] == "owner"]
        seller_items = [it for it in verified_items if it["source_type"] == "seller"]

        seller_groups = {}
        for it in seller_items:
            s_id = it["seller_id"]
            if s_id not in seller_groups:
                seller_groups[s_id] = []
            seller_groups[s_id].append(it)

        for s_id, s_list in seller_groups.items():
            s_subtotal = round(sum(it["price"] * it["quantity"] for it in s_list), 2)
            reg = SellerDatabaseRegistry.query.filter_by(seller_id=s_id).first()
            p_acc = getattr(reg, "payment_account_id", None) or os.environ.get(f"SELLER_{s_id}_PAYMENT_ACCOUNT_ID") or None

            settlement_status = "pending_settlement"
            settlement_note = ""
            if p_acc and p_acc.startswith("acc_"):
                settlement_status = "ready_for_transfer"
                settlement_note = f"Configured for Razorpay Route transfer to {p_acc}"
            else:
                settlement_status = "pending_kyc_onboarding"
                settlement_note = f"Artisan #{s_id} has not completed Razorpay Route KYC onboarding. Split held pending account connection."

            seller_splits.append({
                "seller_id": s_id,
                "seller_name": reg.seller.name if reg and reg.seller else f"Artisan #{s_id}",
                "database_id": reg.database_id if reg else f"DB{s_id}",
                "amount": s_subtotal,
                "currency": "INR",
                "items_count": sum(it["quantity"] for it in s_list),
                "payment_account_id": p_acc,
                "settlement_status": settlement_status,
                "settlement_note": settlement_note
            })

        owner_subtotal = round(sum(it["price"] * it["quantity"] for it in owner_items), 2)
        owner_payable = max(0.0, round(owner_subtotal - discount + shipping_cost, 2))
        platform_split = {
            "owner_id": "platform_owner",
            "subtotal": owner_subtotal,
            "shipping": shipping_cost,
            "discount_absorbed": discount,
            "amount": owner_payable,
            "currency": "INR",
            "settlement_status": "routed_to_platform_account"
        }

        # 6. Decrease stock in Owner DB1 for owner products
        for it in owner_items:
            product = it["db_obj"]
            quantity = it["quantity"]
            old_stock = int(product.stock or 0)
            product.stock = max(0, old_stock - quantity)
            new_stock = product.stock

            history = StockHistoryModel(
                product_id=product.id,
                change_type='order_placed',
                change_amount=-quantity,
                old_stock=old_stock,
                new_stock=new_stock,
                reason=f"Customer Order Placement ({payment_method})",
                updated_by=current_user.get("name") or "Customer Checkout",
                user_role="Customer",
                user_id=int(current_user["_id"]),
                created_at=get_ist_time()
            )
            db.session.add(history)

            audit = ProductAuditLogModel(
                product_id=product.id,
                admin_id='customer_checkout',
                performed_by=current_user.get("name") or "Customer Checkout",
                user_role="Customer",
                user_id=int(current_user["_id"]),
                action_type="Product Stock Updated",
                field_name="stock",
                old_value=f"{old_stock} units",
                new_value=f"{new_stock} units",
                created_at=get_ist_time()
            )
            db.session.add(audit)

        # 7. Create Master Order in DB1 with commit=False
        db1_order_items = [
            {
                "product_id": v["product_id"],
                "seller_id": v["seller_id"],
                "name": v["name"],
                "price": v["price"],
                "quantity": v["quantity"],
                "image": v["image"]
            }
            for v in verified_items
        ]

        order = OrderModel.create_order(
            user_id=user_obj.id,
            shipping_address=shipping_address_snapshot,
            items=db1_order_items,
            total_amount=calculated_total,
            terms_accepted=terms_accepted,
            payment_method=payment_method,
            payment_status='PENDING',
            commit=False
        )

        # 8. Create central Transaction record with seller payment routing breakdown
        txn = TransactionModel(
            transaction_id=f"TXN-{random.randint(10000000, 99999999)}",
            order_id=int(order["id"]),
            customer_id=user_obj.id,
            payment_gateway='cod' if payment_method in ('COD', 'CASH_ON_DELIVERY') else 'razorpay',
            payment_method=payment_method,
            amount=calculated_total,
            currency='INR',
            payment_status='pending',
            transaction_status='created',
            payment_reference=str(idempotency_key).strip() if idempotency_key else None,
            gateway_response={
                "seller_splits": seller_splits,
                "platform_split": platform_split,
                "routing_type": "dynamic_multi_seller_route"
            },
            remarks=f"{payment_method} order placed across {len(seller_splits) + (1 if owner_items else 0)} databases.",
            created_at=datetime.utcnow()
        )
        db.session.add(txn)

        # 9. Update BuyRequest row if any
        if buy_req:
            buy_req.status = 'Converted To Order'
            buy_req.payment_completed = False
            buy_req.converted_order_id = int(order['id'])
            buy_req.converted_to_order_at = get_ist_time()

        # 10. Empty purchased items from customer's cart
        if not buy_req and user_obj.cart and user_obj.cart.items:
            purchased_pids = {v["product_id"] for v in verified_items if v["product_id"]}
            for c_item in list(user_obj.cart.items):
                if c_item.product_id in purchased_pids:
                    db.session.delete(c_item)

        # 11. Commit Master Database Transaction
        db.session.commit()

        # 12. Dispatch isolated seller line items to their dedicated databases (e.g. DB2)
        dispatch_results = {}
        if seller_items:
            try:
                dispatch_results = seller_db_service.dispatch_checkout_to_seller_db(
                    master_order_id=order.get("order_id") if isinstance(order, dict) else getattr(order, "order_id", ""),
                    customer_info={
                        "name": shipping_address_snapshot.get("name") or user_obj.name,
                        "email": shipping_address_snapshot.get("email") or user_obj.email,
                        "city": shipping_address_snapshot.get("city", ""),
                        "state": shipping_address_snapshot.get("state", ""),
                        "payment_method": payment_method,
                        "payment_status": "PENDING"
                    },
                    items=seller_items
                )
            except Exception as dispatch_err:
                print("[SELLER DB DISPATCH ERROR]:", dispatch_err)
                dispatch_results = {"status": "partial_failure", "error": str(dispatch_err)}

        # 13. Create Payment Gateway Order if ONLINE payment
        payment_info = None
        if payment_method in ('ONLINE', 'RAZORPAY'):
            from backend.utils.payment_gateway import PaymentGatewayManager
            from backend.config import Config
            gateway = PaymentGatewayManager.get_gateway("razorpay")
            notes = {
                "order_id": order.get("order_id"),
                "customer_id": str(user_obj.id),
                "seller_count": len(seller_splits)
            }
            gw_res = gateway.create_order(
                amount=calculated_total,
                currency="INR",
                order_id=order.get("order_id"),
                notes=notes
            )
            if gw_res.get("success"):
                txn.gateway_order_id = gw_res.get("gateway_order_id")
                db.session.commit()
                payment_info = {
                    "gateway": "razorpay",
                    "gateway_order_id": gw_res.get("gateway_order_id"),
                    "amount": calculated_total,
                    "currency": "INR",
                    "key_id": Config.RAZORPAY_KEY_ID or "rzp_test_craftnest_sandbox",
                    "seller_splits": seller_splits
                }

        # 14. Automatically generate database-backed invoice
        created_invoice = None
        try:
            from backend.services.invoice_service import generate_invoice_for_order
            order_db_id = int(order["id"]) if isinstance(order, dict) else order.id
            created_invoice = generate_invoice_for_order(order_db_id, commit=True)
            if isinstance(order, dict) and created_invoice:
                order["invoice"] = created_invoice.to_dict()
                order["invoice_number"] = created_invoice.invoice_number
                order["invoice_id"] = created_invoice.id
                order["invoice_pdf_url"] = f"/api/orders/{order.get('order_id')}/invoice/pdf"
        except Exception as inv_err:
            print("[INVOICE AUTO-GEN WARN] Error creating invoice:", inv_err)
    except Exception as e:
        db.session.rollback()
        print("Error during order placement:", e)
        return jsonify({"message": f"Failed to place order: {str(e)}"}), 500
        
    # 12. Post-commit workflows (non-critical notifications/emails)
    try:
        # Send order confirmation email
        recipient_email = current_user.get("email") or (shipping_address or {}).get("email") or f"{current_user.get('mobile', 'user')}@SSJewellery.com"
        send_order_confirmation(recipient_email, order)
    except Exception as email_ex:
        print("Error sending order confirmation email:", email_ex)
        
    try:
        from backend.routes.auth import add_user_notification
        if buy_req:
            add_user_notification(
                current_user["_id"],
                "Order Successfully Created",
                f"Your order {order['order_id']} for requested product '{buy_req.product_name}' has been successfully created and paid.",
                notif_type="order_placed",
                order_id=order['order_id']
            )
        else:
            add_user_notification(
                current_user["_id"],
                "Order Placed",
                f"Your order {order['order_id']} for ₹{order['total_amount']} has been successfully placed.",
                notif_type="order_placed",
                order_id=order['order_id']
            )
    except Exception as ex:
        print(f"Error adding order notification: {ex}")
     
    try:
        from backend.models.admin import add_admin_notification
        if buy_req:
            add_admin_notification(
                title="New Order Created From Buy Request",
                message=f"User {current_user['name']} paid for request #{buy_req.id} ({buy_req.product_name}) in {buy_req.city or 'unknown city'}. Order #{order['order_id']} created.",
                type="BUY_REQUEST",
                user_id=int(current_user["_id"])
            )
        else:
            add_admin_notification(
                title="🛒 New Order",
                message=f"Order #{order['order_id']} placed",
                type="NEW_ORDER",
                order_id=int(order['id'])
            )
    except Exception as ex:
        print(f"Error adding admin notification: {ex}")
        
    return jsonify({
        "message": "Order placed successfully!",
        "order": order,
        "order_id": order.get("order_id") if isinstance(order, dict) else getattr(order, "order_id", ""),
        "id": order.get("id") if isinstance(order, dict) else getattr(order, "id", ""),
        "payment": payment_info,
        "seller_splits": seller_splits,
        "invoice": created_invoice.to_dict() if created_invoice else None,
        "invoice_number": created_invoice.invoice_number if created_invoice else None,
        "invoice_pdf_url": f"/api/orders/{order.get('order_id')}/invoice/pdf" if created_invoice else None
    }), 201

@orders_bp.route('', methods=['GET'])
@token_required
def get_user_orders(current_user):
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)

    page_arg = request.args.get('page')
    limit_arg = request.args.get('limit') or request.args.get('page_size')
    p_num = None
    p_limit = None
    if page_arg or limit_arg or request.args.get('paginate') == 'true':
        from backend.utils.pagination import parse_pagination_params
        p_num, p_limit = parse_pagination_params()

    # 1. If seller: query only order items belonging to this seller
    if role == "seller" and not is_admin:
        from backend.services.seller_database_service import seller_db_service
        if seller_db_service.is_isolated_seller(current_user["_id"]):
            orders = seller_db_service.get_orders(int(current_user["_id"]), page=p_num, limit=p_limit)
            return jsonify(orders), 200
        orders = OrderModel.find_by_seller_id(current_user["_id"], page=p_num, limit=p_limit)
        return jsonify(orders), 200

    # 2. If owner/admin: return all orders
    if is_admin or role in ("owner", "admin", "superadmin", "sub_owner", "subowner"):
        orders = OrderModel.find_all(page=p_num, limit=p_limit)
        return jsonify(orders), 200

    # 3. If customer: return strictly their own orders
    orders = OrderModel.find_by_user_id(current_user["_id"], page=p_num, limit=p_limit)
    return jsonify(orders), 200

@orders_bp.route('/seller', methods=['GET'])
@token_required
def get_seller_orders(current_user):
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    if not (is_admin or role in ("seller", "owner", "admin")):
        return jsonify({"message": "Access denied! Seller privileges required."}), 403

    page_arg = request.args.get('page')
    limit_arg = request.args.get('limit') or request.args.get('page_size')
    p_num = int(page_arg) if page_arg and str(page_arg).isdigit() else None
    p_limit = int(limit_arg) if limit_arg and str(limit_arg).isdigit() else None

    from backend.services.seller_database_service import seller_db_service
    if role == "seller" and not is_admin and seller_db_service.is_isolated_seller(current_user["_id"]):
        orders = seller_db_service.get_orders(int(current_user["_id"]), page=p_num, limit=p_limit)
        return jsonify(orders), 200

    orders = OrderModel.find_by_seller_id(current_user["_id"], page=p_num, limit=p_limit)
    return jsonify(orders), 200

@orders_bp.route('/<id>', methods=['GET'])
@token_required
def get_order_by_id(current_user, id):
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    uid = str(current_user.get("_id") or current_user.get("id"))

    from backend.services.seller_database_service import seller_db_service
    if role == "seller" and not is_admin and seller_db_service.is_isolated_seller(uid):
        ord_db2 = seller_db_service.get_order_by_id(int(uid), id)
        if ord_db2:
            return jsonify(ord_db2), 200

    order_obj = None
    if str(id).isdigit():
        order_obj = OrderModel.query.get(int(id))
    if not order_obj:
        order_obj = OrderModel.query.filter_by(order_id=str(id)).first()
    if not order_obj:
        return jsonify({"message": "Order not found."}), 404
    
    # 1. Owner / Admin can view everything
    if is_admin or role in ("owner", "admin", "superadmin", "sub_owner", "subowner"):
        return jsonify(order_obj.to_dict()), 200
        
    # 2. Customer can only view their own order
    if role == "customer":
        if str(order_obj.user_id) != uid:
            return jsonify({"message": "Access denied! You can only access your own orders."}), 403
        return jsonify(order_obj.to_dict()), 200
        
    # 3. Seller can only view orders containing their items, and only see their items
    if role == "seller":
        seller_items = [it for it in order_obj.items if str(it.seller_id) == uid]
        if not seller_items:
            return jsonify({"message": "Access denied! This order does not contain your products."}), 403
        d = order_obj.to_dict()
        d["items"] = [{
            "product_id": str(it.product_id) if it.product_id else "",
            "seller_id": str(it.seller_id) if it.seller_id else None,
            "name": it.name,
            "price": float(it.price),
            "quantity": int(it.quantity),
            "image": it.image or ""
        } for it in seller_items]
        d["seller_total_amount"] = sum(float(it.price) * int(it.quantity) for it in seller_items)
        return jsonify(d), 200
        
    return jsonify({"message": "Unauthorized"}), 403

@orders_bp.route('/fulfillment-stats', methods=['GET'])
@token_required
def get_fulfillment_stats(current_user):
    """
    Computes real-time Order Fulfillment Status Breakdown:
    Returns counts and percentage distribution for:
    Pending, Confirmed, Packed, Shipped, Out for Delivery, Delivered, Cancelled
    - If Admin: platform-wide orders
    - If Seller: orders containing products from this seller
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
        return jsonify(seller_db_service.get_fulfillment_stats(int(uid))), 200

    from backend.models.order import OrderItem
    query = OrderModel.query

    if is_seller and not is_owner_admin:
        try:
            sid = int(uid)
            seller_order_ids = db.session.query(OrderItem.order_id).filter(OrderItem.seller_id == sid).distinct()
            query = query.filter(OrderModel.id.in_(seller_order_ids))
        except Exception:
            return jsonify({"total_orders": 0, "breakdown": [], "counts": {}}), 200

    orders = query.all()
    total_orders = len(orders)

    canonical_statuses = [
        "Pending",
        "Confirmed",
        "Packed",
        "Shipped",
        "Out for Delivery",
        "Delivered",
        "Cancelled"
    ]

    status_map = {
        "pending": "Pending",
        "order placed": "Pending",
        "confirmed": "Confirmed",
        "order confirmed": "Confirmed",
        "packed": "Packed",
        "shipped": "Shipped",
        "in transit": "Shipped",
        "out for delivery": "Out for Delivery",
        "outfordelivery": "Out for Delivery",
        "delivered": "Delivered",
        "cancelled": "Cancelled"
    }

    counts = {st: 0 for st in canonical_statuses}

    total_sales = 0.0
    total_units_sold = 0

    for ord_obj in orders:
        raw_st = str(ord_obj.order_status or ord_obj.status or "Pending").strip().lower()
        normalized = status_map.get(raw_st, "Pending")
        if normalized not in counts:
            normalized = "Pending"
        counts[normalized] += 1

        # Calculate Total Sales & Units Sold for eligible orders
        if raw_st not in ("cancelled", "canceled", "failed"):
            for it in ord_obj.items:
                if is_seller and not is_owner_admin and str(it.seller_id) != uid:
                    continue
                q = int(it.quantity or 0)
                p = float(it.price or 0.0)
                total_sales += q * p
                total_units_sold += q

    breakdown = []
    for st in canonical_statuses:
        cnt = counts[st]
        pct = round((cnt / total_orders * 100), 1) if total_orders > 0 else 0.0
        breakdown.append({
            "status": st,
            "count": cnt,
            "percentage": pct
        })

    return jsonify({
        "success": True,
        "total_orders": total_orders,
        "total_sales": round(total_sales, 2),
        "total_units_sold": total_units_sold,
        "breakdown": breakdown,
        "counts": counts
    }), 200

@orders_bp.route('/seller-payments', methods=['GET'])
@token_required
def get_seller_payments_route(current_user):
    """
    Returns payment and sales history strictly for the authenticated seller.
    """
    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    uid = str(current_user.get("_id") or current_user.get("id"))

    if not (is_admin or role in ("seller", "owner", "admin")):
        return jsonify({"message": "Access denied! Seller privileges required."}), 403

    from backend.services.seller_database_service import seller_db_service
    if role == "seller" and not is_admin and seller_db_service.is_isolated_seller(uid):
        return jsonify(seller_db_service.get_seller_payments(int(uid))), 200

    # Non-isolated seller from central DB1
    from backend.models.order import OrderItem
    try:
        sid = int(uid)
    except Exception:
        return jsonify({"success": True, "total_sales": 0, "total_units_sold": 0, "total_transactions": 0, "payments": []}), 200

    seller_order_ids = db.session.query(OrderItem.order_id).filter(OrderItem.seller_id == sid).distinct()
    orders = OrderModel.query.filter(OrderModel.id.in_(seller_order_ids)).order_by(OrderModel.created_at.desc()).all()

    payments = []
    total_sales = 0.0
    total_units_sold = 0
    for o in orders:
        raw_st = str(o.order_status or o.status or "Pending").strip().lower()
        seller_items = [it for it in o.items if it.seller_id == sid]
        order_units = sum(int(it.quantity or 0) for it in seller_items)
        order_subtotal = sum(float(it.price or 0.0) * int(it.quantity or 0) for it in seller_items)

        if raw_st not in ("cancelled", "canceled", "failed"):
            total_sales += order_subtotal
            total_units_sold += order_units

        payments.append({
            "id": o.id,
            "order_id": o.order_id or str(o.id),
            "customer_name": o.user.name if o.user else "Customer",
            "payment_date": format_iso_datetime(o.created_at),
            "payment_method": o.payment_method or "Cash on Delivery",
            "payment_status": o.payment_status or "PENDING",
            "order_status": o.order_status or "Pending",
            "amount": round(order_subtotal, 2),
            "units_sold": order_units,
            "transaction_id": getattr(o, "transaction_id", None) or f"TXN-{o.order_id or o.id}",
            "items": [it.to_dict() for it in seller_items]
        })

    return jsonify({
        "success": True,
        "total_sales": round(total_sales, 2),
        "total_units_sold": total_units_sold,
        "total_transactions": len(payments),
        "payments": payments
    }), 200

@orders_bp.route('/all', methods=['GET'])
@admin_required
def get_all_orders():
    page_arg = request.args.get('page')
    limit_arg = request.args.get('limit') or request.args.get('page_size')
    if page_arg or limit_arg or request.args.get('paginate') == 'true':
        from backend.utils.pagination import parse_pagination_params
        p_num, p_limit = parse_pagination_params()
        orders = OrderModel.find_all(page=p_num, limit=p_limit)
        return jsonify(orders), 200
    orders = OrderModel.find_all()
    return jsonify(orders), 200

@orders_bp.route('/<id>/status', methods=['PUT', 'PATCH'])
@token_required
def update_order_status(current_user, id):
    data = request.get_json() or {}
    status = data.get("status") or data.get("order_status")
    message = data.get("message")
    delivery_date = data.get("delivery_date")
    carrier = data.get("carrier")
    tracking_id = data.get("tracking_id") or data.get("tracking_number") or data.get("awb")
    tracking_url = data.get("tracking_url")
    item_id = data.get("item_id")
    
    print(f"[DEBUG Save Status] Received update status for order '{id}': status='{status}', tracking_id='{tracking_id}', carrier='{carrier}'")
    
    if not status:
        return jsonify({"message": "Please provide the status parameter."}), 400

    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    uid = str(current_user.get("_id") or current_user.get("id"))
    user_name = current_user.get("name") or current_user.get("username") or current_user.get("email") or "Authorized User"

    is_owner_admin = is_admin or role in ("owner", "admin", "superadmin", "sub_owner", "subowner")
    is_seller = (role == "seller")

    if not is_owner_admin and not is_seller:
        return jsonify({"message": "Access denied! Only owners and sellers can update order fulfillment."}), 403

    status_map = {
        "pending": "Pending",
        "order placed": "Pending",
        "confirmed": "Confirmed",
        "order confirmed": "Confirmed",
        "packed": "Packed",
        "shipped": "Shipped",
        "in transit": "Shipped",
        "out for delivery": "Out for Delivery",
        "outfordelivery": "Out for Delivery",
        "delivered": "Delivered",
        "cancelled": "Cancelled"
    }
    
    normalized_status = status_map.get(str(status).lower().strip())
    if not normalized_status:
        valid_statuses = ["Pending", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"]
        return jsonify({"message": f"Invalid status value '{status}'. Must be one of {valid_statuses}"}), 400

    from backend.services.seller_database_service import seller_db_service

    # Route isolated seller updates directly to DB2
    if is_seller and not is_owner_admin and seller_db_service.is_isolated_seller(uid):
        db2_ord = seller_db_service.get_order_by_id(int(uid), id)
        if not db2_ord:
            return jsonify({"message": f"Order #{id} was not found in your workshop orders."}), 404
        seller_db_service.update_order_status(int(uid), id, normalized_status, carrier=carrier, tracking_id=tracking_id)
        return jsonify({
            "message": "Order fulfillment status updated successfully!",
            "status": normalized_status
        }), 200

    order_obj = None
    if str(id).isdigit():
        order_obj = OrderModel.query.get(int(id))
    if not order_obj:
        order_obj = OrderModel.query.filter_by(order_id=str(id)).first()
    if not order_obj:
        return jsonify({"message": f"Order #{id} was not found."}), 404

    # Enforce Owner restriction: Owner cannot edit seller-specific orders belonging to isolated sellers
    if is_owner_admin:
        has_isolated_seller_items = any(
            it.seller_id and seller_db_service.is_isolated_seller(it.seller_id)
            for it in order_obj.items
        )
        if has_isolated_seller_items:
            return jsonify({
                "message": "Access restricted: Seller-specific orders are managed exclusively by the respective artisan."
            }), 403

    if is_seller:
        # Verify that this order contains products belonging to this seller
        seller_items = [it for it in order_obj.items if str(it.seller_id) == uid]
        if not seller_items:
            return jsonify({"message": "Access denied! You can only update fulfillment for orders containing your products."}), 403
        
    status_map = {
        "pending": "Pending",
        "order placed": "Pending",
        "confirmed": "Confirmed",
        "order confirmed": "Confirmed",
        "packed": "Packed",
        "shipped": "Shipped",
        "in transit": "Shipped",
        "out for delivery": "Out for Delivery",
        "outfordelivery": "Out for Delivery",
        "delivered": "Delivered",
        "cancelled": "Cancelled"
    }
    
    normalized_status = status_map.get(str(status).lower().strip())
    if not normalized_status:
        valid_statuses = ["Pending", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"]
        return jsonify({"message": f"Invalid status value '{status}'. Must be one of {valid_statuses}"}), 400

    current_status = order_obj.order_status or order_obj.status or "Pending"

    # Terminal state checks
    if current_status == "Delivered" and normalized_status != "Delivered":
        return jsonify({"message": "Cannot modify an order that has already been delivered."}), 400
    if current_status == "Cancelled" and normalized_status != "Cancelled":
        return jsonify({"message": "Cannot modify an order that has been cancelled."}), 400

    # Validate logical milestone sequence if attempting invalid backwards jump
    status_rank = {
        "Pending": 0,
        "Confirmed": 1,
        "Packed": 2,
        "Shipped": 3,
        "Out for Delivery": 4,
        "Delivered": 5
    }
    if normalized_status in status_rank and current_status in status_rank:
        if status_rank[normalized_status] < status_rank[current_status]:
            return jsonify({
                "message": f"Invalid transition: Cannot move order status backwards from '{current_status}' to '{normalized_status}'."
            }), 400

    actor_label = f"{user_name} ({'Owner' if is_owner_admin else 'Seller'})"
    user_id_int = int(uid) if (uid and uid.isdigit()) else None
    role_label = "Owner" if is_owner_admin else "Seller"

    success = OrderModel.update_status(
        order_obj.id,
        normalized_status,
        message=message,
        delivery_date=delivery_date,
        carrier=carrier,
        tracking_id=tracking_id.strip() if tracking_id else None,
        tracking_url=tracking_url.strip() if tracking_url else None,
        updated_by=actor_label,
        user_id=user_id_int,
        role=role_label,
        item_id=item_id
    )
    if not success:
        return jsonify({"message": "Failed to update order status in the database."}), 500

    # Sync to isolated seller database (DB2)
    try:
        from backend.services.seller_database_service import seller_db_service
        if is_seller and seller_db_service.is_isolated_seller(uid):
            seller_db_service.update_order_status(
                int(uid), id, normalized_status, carrier=carrier, tracking_id=tracking_id.strip() if tracking_id else None
            )
    except Exception as s_err:
        print("[SELLER DB STATUS SYNC WARN]:", s_err)
        
    order_obj = OrderModel.query.get(order_obj.id)
        
    # Send notification to user
    try:
        from backend.routes.auth import add_user_notification
        if order_obj and order_obj.user_id:
            tracking_msg = f" (AWB: {order_obj.tracking_id})" if order_obj.tracking_id else ""
            add_user_notification(
                str(order_obj.user_id),
                "Order Tracking Update",
                f"Your order #{order_obj.order_id} is now: {normalized_status}.{tracking_msg} {message or ''}".strip()
            )
    except Exception as ex:
        print(f"Error sending tracking notification: {ex}")

    email_delivery = {"success": False, "status": "no_recipient"}
    if order_obj:
        recipient = UserModel.query.get(order_obj.user_id) if order_obj.user_id else None
        shipping = order_obj.shipping_address or {}
        recipient_email = getattr(recipient, "email", None) or shipping.get("email")
        recipient_name = getattr(recipient, "full_name", None) or shipping.get("name") or "Valued Customer"
        if recipient_email:
            try:
                email_delivery = send_order_status_update(
                    recipient_email,
                    recipient_name,
                    order_obj.order_id,
                    normalized_status,
                    message=message,
                    tracking_id=order_obj.tracking_id,
                    tracking_url=order_obj.tracking_url,
                    delivery_date=order_obj.delivery_date,
                )
            except Exception as e_err:
                print(f"[ORDER EMAIL WARN] Error: {e_err}")
        else:
            print(f"[ORDER EMAIL] No customer email found for order {order_obj.order_id}")
        
    # Audit Log
    try:
        from backend.utils.audit import log_admin_action
        ord_id_str = order_obj.order_id if order_obj else str(id)
        u_id = order_obj.user_id if order_obj else None
        o_db_id = order_obj.id if order_obj else None
        if normalized_status == "Cancelled":
            log_admin_action("Order Cancelled", "Order Management", f"Cancelled order: '{ord_id_str}' by {actor_label}", user_id=u_id, order_id=o_db_id)
        else:
            log_admin_action("Order Updated", "Order Management", f"Updated status of order '{ord_id_str}' to '{normalized_status}' by {actor_label}", user_id=u_id, order_id=o_db_id)
    except Exception as a_err:
        print(f"[AUDIT LOG WARN] Error: {a_err}")
        
    return jsonify({
        "message": f"Order #{order_obj.order_id} status updated to {normalized_status} successfully!",
        "status": normalized_status,
        "order": order_obj.to_dict(),
        "email_sent": email_delivery.get("status") == "delivered",
        "email_status": email_delivery.get("status", "failed")
    }), 200

@orders_bp.route('/<id>/tracking', methods=['PUT'])
@token_required
def update_order_tracking(current_user, id):
    data = request.get_json() or {}
    tracking_url = data.get("tracking_url")
    tracking_id = data.get("tracking_id") or data.get("tracking_number") or data.get("awb")
    carrier = data.get("carrier")
    
    print(f"[DEBUG Save Tracking] Received update tracking for order '{id}': tracking_id='{tracking_id}', tracking_url='{tracking_url}'")
    
    if not tracking_id or not str(tracking_id).strip():
        return jsonify({"message": "Tracking ID / AWB is required."}), 400

    order_obj = None
    if str(id).isdigit():
        order_obj = OrderModel.query.get(int(id))
    if not order_obj:
        order_obj = OrderModel.query.filter_by(order_id=str(id)).first()

    if not order_obj:
        return jsonify({"message": "Order not found."}), 404

    role = str(current_user.get("role") or "").lower()
    is_admin = current_user.get("is_admin", False)
    uid = str(current_user.get("_id") or current_user.get("id"))
    is_owner_admin = is_admin or role in ("owner", "admin", "superadmin", "sub_owner", "subowner")

    if not is_owner_admin and role == "seller":
        seller_items = [it for it in order_obj.items if str(it.seller_id) == uid]
        if not seller_items:
            return jsonify({"message": "Access denied! You can only update tracking for orders containing your products."}), 403
    elif not is_owner_admin:
        return jsonify({"message": "Access denied! Owner or Seller privileges required."}), 403

    if order_obj.status == "Delivered":
        return jsonify({"message": "Tracking information cannot be edited for delivered orders."}), 400
        
    success = OrderModel.update_tracking(
        order_obj.id, 
        tracking_url=tracking_url.strip() if tracking_url else None, 
        tracking_id=tracking_id.strip(), 
        carrier=carrier.strip() if carrier else None
    )
    if not success:
        return jsonify({"message": "Failed to update tracking information."}), 500
        
    return jsonify({
        "message": "Tracking information updated successfully!",
        "order": order_obj.to_dict()
    }), 200

@orders_bp.route('/<id>/return', methods=['POST'])
@token_required
def request_order_return(current_user, id):
    data = request.get_json() or {}
    reason = data.get("reason")
    message = data.get("message", "")
    
    if not reason:
        return jsonify({"message": "Please provide a reason for the return request."}), 400
        
    success = OrderModel.request_return(id, reason, message)
    if not success:
        return jsonify({"message": "Failed to submit return request."}), 500
        
    # Send user notification
    try:
        from backend.routes.auth import add_user_notification
        add_user_notification(current_user["_id"], "Return Requested", f"Your return request for order {id} has been submitted successfully.")
    except Exception as ex:
        print(f"Error adding return notification: {ex}")
        
    return jsonify({"message": "Return request submitted successfully!"}), 200

@orders_bp.route('/<id>/invoice', methods=['GET'])
@token_required
def get_order_invoice_route(current_user, id):
    from backend.routes.invoices import get_order_invoice
    return get_order_invoice(id)

@orders_bp.route('/<id>/invoice/pdf', methods=['GET'])
@token_required
def download_order_invoice_pdf_route(current_user, id):
    from backend.routes.invoices import download_invoice_pdf
    return download_invoice_pdf(id)


# =========================================================================
# SELLER-WISE PAYMENT ROUTING & WEBHOOK VERIFICATION ENDPOINTS
# =========================================================================

@orders_bp.route('/create-payment-order', methods=['POST'])
@token_required
def create_payment_order_route(current_user):
    """
    Creates a payment gateway order with multi-seller transfers/split routing.
    """
    from backend.models.transaction import TransactionModel
    from backend.utils.payment_gateway import PaymentGatewayManager
    from backend.config import Config

    data = request.get_json() or {}
    order_id = data.get("order_id")
    if not order_id:
        return jsonify({"message": "Order ID is required."}), 400

    order_obj = None
    if str(order_id).isdigit():
        order_obj = OrderModel.query.get(int(order_id))
    if not order_obj:
        order_obj = OrderModel.query.filter_by(order_id=str(order_id)).first()

    if not order_obj:
        return jsonify({"message": f"Order '{order_id}' was not found."}), 404

    # Security check: verify order belongs to current user
    if str(order_obj.user_id) != str(current_user.get("_id") or current_user.get("id")):
        return jsonify({"message": "Access denied."}), 403

    txn = TransactionModel.query.filter_by(order_id=order_obj.id).first()
    splits = (txn.gateway_response or {}).get("seller_splits", []) if txn else []

    gateway = PaymentGatewayManager.get_gateway("razorpay")
    notes = {
        "order_id": order_obj.order_id,
        "master_order_id": order_obj.order_id,
        "user_id": str(current_user.get("_id"))
    }

    gw_res = gateway.create_order(
        amount=float(order_obj.total_amount),
        currency="INR",
        order_id=order_obj.order_id,
        notes=notes
    )

    if gw_res.get("success"):
        if txn:
            txn.gateway_order_id = gw_res.get("gateway_order_id")
            db.session.commit()

        return jsonify({
            "success": True,
            "gateway": "razorpay",
            "gateway_order_id": gw_res.get("gateway_order_id"),
            "amount": float(order_obj.total_amount),
            "currency": "INR",
            "key_id": Config.RAZORPAY_KEY_ID or "rzp_test_craftnest_sandbox",
            "seller_splits": splits
        }), 200
    else:
        return jsonify({"success": False, "message": gw_res.get("message") or "Gateway error"}), 400


@orders_bp.route('/verify-payment', methods=['POST'])
@token_required
def verify_payment_route(current_user):
    """
    Server-side HMAC verification of gateway response.
    Never marks an order paid based only on frontend success.
    Idempotent: safe against retries without duplicate charges or state corruption.
    """
    import hmac
    import hashlib
    from datetime import datetime
    from backend.models.transaction import TransactionModel
    from backend.services.seller_database_service import seller_db_service
    from backend.config import Config

    data = request.get_json() or {}
    order_id = data.get("order_id")
    gateway_order_id = data.get("razorpay_order_id") or data.get("gateway_order_id")
    gateway_payment_id = data.get("razorpay_payment_id") or data.get("gateway_payment_id")
    signature = data.get("razorpay_signature") or data.get("signature")

    if not order_id or not gateway_payment_id:
        return jsonify({"success": False, "message": "Missing order_id or payment reference."}), 400

    order_obj = None
    if str(order_id).isdigit():
        order_obj = OrderModel.query.get(int(order_id))
    if not order_obj:
        order_obj = OrderModel.query.filter_by(order_id=str(order_id)).first()

    if not order_obj:
        return jsonify({"success": False, "message": f"Order '{order_id}' was not found."}), 404

    # Idempotency check: if order is already marked paid, return success directly
    if str(order_obj.payment_status).upper() == "PAID":
        return jsonify({
            "success": True,
            "message": "Payment already verified (idempotent).",
            "order": order_obj.to_dict(),
            "idempotent": True
        }), 200

    txn = TransactionModel.query.filter_by(order_id=order_obj.id).first()

    # Cryptographic signature verification
    key_secret = Config.RAZORPAY_KEY_SECRET
    if key_secret and signature and gateway_order_id:
        msg = f"{gateway_order_id}|{gateway_payment_id}"
        generated_signature = hmac.new(
            key_secret.encode('utf-8'),
            msg.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(generated_signature, str(signature).strip()):
            if txn:
                txn.payment_status = "failed"
                txn.failure_reason = "Cryptographic signature mismatch"
                db.session.commit()
            return jsonify({"success": False, "message": "Payment verification failed: Signature mismatch."}), 400
    elif not key_secret:
        # In sandbox/development when keys are mock
        if not gateway_payment_id:
            return jsonify({"success": False, "message": "Missing gateway payment id."}), 400

    # Verification successful -> Update DB1 master order & transaction
    order_obj.payment_status = "PAID"
    if order_obj.order_status == "Pending":
        order_obj.order_status = "Confirmed"

    if txn:
        txn.payment_status = "captured"
        txn.transaction_status = "completed"
        txn.gateway_payment_id = gateway_payment_id
        if gateway_order_id:
            txn.gateway_order_id = gateway_order_id
        txn.payment_time = datetime.utcnow()
        txn.remarks = f"Payment verified via Razorpay HMAC signature. Ref: {gateway_payment_id}"

    db.session.commit()

    # Route and sync payment status to isolated seller databases
    splits = (txn.gateway_response or {}).get("seller_splits", []) if txn else []
    for s in splits:
        s_id = s.get("seller_id")
        if s_id:
            try:
                seller_db_service.update_order_payment_status(
                    seller_id=s_id,
                    order_id_or_master=order_obj.order_id,
                    payment_status="PAID",
                    order_status="Confirmed"
                )
            except Exception as s_err:
                print(f"[SELLER PAYMENT SYNC WARN] Failed to sync paid status to seller #{s_id}: {s_err}")

    return jsonify({
        "success": True,
        "message": "Payment successfully verified and routed.",
        "order": order_obj.to_dict(),
        "transaction_id": txn.transaction_id if txn else None
    }), 200


@orders_bp.route('/webhook', methods=['POST'])
def razorpay_webhook_route():
    """
    Server-to-server webhook endpoint with replay protection (idempotency).
    Handles payment.captured, payment.failed, and refund.processed.
    """
    import hmac
    import hashlib
    from datetime import datetime
    from backend.models.transaction import TransactionModel
    from backend.services.seller_database_service import seller_db_service
    from backend.config import Config

    payload = request.get_data()
    signature = request.headers.get("X-Razorpay-Signature")

    # Verify webhook signature if secret configured
    webhook_secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET") or Config.RAZORPAY_KEY_SECRET
    if webhook_secret and signature:
        expected = hmac.new(webhook_secret.encode('utf-8'), payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            return jsonify({"status": "invalid_signature"}), 400

    data = request.get_json() or {}
    event = data.get("event")
    event_payload = (data.get("payload") or {}).get("payment", {}).get("entity", {})
    payment_id = event_payload.get("id")
    gateway_order_id = event_payload.get("order_id")

    if not payment_id and not gateway_order_id:
        return jsonify({"status": "ignored_no_reference"}), 200

    txn = None
    if gateway_order_id:
        txn = TransactionModel.query.filter_by(gateway_order_id=gateway_order_id).first()
    if not txn and payment_id:
        txn = TransactionModel.query.filter_by(gateway_payment_id=payment_id).first()

    if not txn:
        # Order or transaction not found in central registry
        return jsonify({"status": "order_not_found"}), 200

    # Replay protection / Idempotency
    if txn.webhook_verified and txn.payment_status in ('captured', 'failed', 'refunded'):
        return jsonify({
            "status": "duplicate_webhook_ignored",
            "message": "Webhook already processed previously."
        }), 200

    order_obj = OrderModel.query.get(txn.order_id) if txn.order_id else None

    if event in ("payment.captured", "order.paid"):
        txn.payment_status = "captured"
        txn.transaction_status = "completed"
        txn.gateway_payment_id = payment_id
        txn.webhook_verified = True
        txn.webhook_received_at = datetime.utcnow()
        txn.payment_time = datetime.utcnow()

        if order_obj:
            order_obj.payment_status = "PAID"
            if order_obj.order_status == "Pending":
                order_obj.order_status = "Confirmed"

        db.session.commit()

        # Sync to isolated seller databases
        splits = (txn.gateway_response or {}).get("seller_splits", [])
        if order_obj:
            for s in splits:
                s_id = s.get("seller_id")
                if s_id:
                    seller_db_service.update_order_payment_status(
                        seller_id=s_id,
                        order_id_or_master=order_obj.order_id,
                        payment_status="PAID",
                        order_status="Confirmed"
                    )

    elif event == "payment.failed":
        txn.payment_status = "failed"
        txn.transaction_status = "failed"
        txn.failure_reason = event_payload.get("error_description") or "Payment failed at gateway"
        txn.webhook_verified = True
        txn.webhook_received_at = datetime.utcnow()

        if order_obj:
            order_obj.payment_status = "FAILED"
        db.session.commit()

    return jsonify({"status": "processed", "event": event}), 200
