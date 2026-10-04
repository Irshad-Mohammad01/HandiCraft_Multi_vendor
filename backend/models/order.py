from backend.extensions import db
from datetime import datetime, timedelta
import random
import pytz
from backend.utils.timezone import format_iso_datetime, get_ist_time
from backend.utils.security import EncryptedJSON

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='SET NULL'), nullable=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    quantity = db.Column(db.Integer, default=1)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    image = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(50), default='Pending', nullable=True)

    seller = db.relationship('UserModel', foreign_keys=[seller_id], backref='seller_order_items', lazy=True)

class OrderStatusHistory(db.Model):
    __tablename__ = 'order_status_history'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    order_number = db.Column(db.String(50), nullable=True)
    order_item_id = db.Column(db.Integer, db.ForeignKey('order_items.id', ondelete='SET NULL'), nullable=True)
    previous_status = db.Column(db.String(50), nullable=True)
    new_status = db.Column(db.String(50), nullable=False)
    updated_by = db.Column(db.String(255), nullable=True)
    user_id = db.Column(db.Integer, nullable=True)
    role = db.Column(db.String(50), nullable=True)
    tracking_number = db.Column(db.String(100), nullable=True)
    carrier = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=get_ist_time)

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "order_number": self.order_number,
            "order_item_id": self.order_item_id,
            "previous_status": self.previous_status,
            "new_status": self.new_status,
            "updated_by": self.updated_by,
            "user_id": self.user_id,
            "role": self.role,
            "tracking_number": self.tracking_number,
            "carrier": self.carrier,
            "notes": self.notes,
            "created_at": format_iso_datetime(self.created_at) if self.created_at else None
        }

from backend.models.transaction import TransactionModel
Transaction = TransactionModel

class OrderModel(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.String(50), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    order_status = db.Column(db.String(50), default='Pending')
    status = db.Column(db.String(50), default='Pending')
    delivery_date = db.Column(db.String(50), nullable=True)
    tracking_history = db.Column(db.JSON, nullable=True)
    return_request = db.Column(db.JSON, nullable=True)
    shipping_address = db.Column(EncryptedJSON, nullable=True)

    carrier = db.Column(db.String(100), nullable=True)
    tracking_id = db.Column(db.String(100), nullable=True)
    tracking_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    terms_accepted = db.Column(db.Boolean, default=False, nullable=True)
    terms_accepted_at = db.Column(db.DateTime, nullable=True)
    payment_method = db.Column(db.String(50), nullable=True, default='CASH_ON_DELIVERY')
    payment_status = db.Column(db.String(50), nullable=True, default='PENDING')
    
    # Relationships
    items = db.relationship('OrderItem', backref='order', cascade='all, delete-orphan', lazy=True)
    status_history = db.relationship('OrderStatusHistory', backref='order_ref', cascade='all, delete-orphan', order_by='OrderStatusHistory.created_at.asc()', lazy=True)
    transaction = db.relationship('TransactionModel', primaryjoin="foreign(TransactionModel.order_id) == OrderModel.id", uselist=False, viewonly=True)


    def to_dict(self):
        item_list = []
        for it in self.items:
            item_list.append({
                "id": it.id,
                "product_id": str(it.product_id) if it.product_id else "",
                "seller_id": str(it.seller_id) if it.seller_id else None,
                "name": it.name,
                "price": float(it.price),
                "quantity": int(it.quantity),
                "image": it.image or "",
                "status": it.status or self.order_status or "Pending"
            })
            
        ship_addr = self.shipping_address or {}
        cust_name = ship_addr.get("name") or ship_addr.get("full_name") or (self.user.name if self.user else "Customer")
        cust_phone = ship_addr.get("phone") or ship_addr.get("mobile_number") or (self.user.phone if self.user else "")

        history_list = []
        try:
            if self.status_history:
                history_list = [h.to_dict() for h in self.status_history]
        except Exception:
            pass

        seller_splits = []
        try:
            from backend.models.transaction import TransactionModel
            txn = TransactionModel.query.filter_by(order_id=self.id).first()
            if txn and txn.gateway_response:
                seller_splits = txn.gateway_response.get("seller_splits", [])
        except Exception:
            pass

        return {
            "id": str(self.id),
            "_id": str(self.id),
            "order_id": self.order_id,
            "user_id": str(self.user_id) if self.user_id else None,
            "user_email": self.user.email if (self.user and self.user.email) else "Not Available",
            "customer_name": cust_name,
            "customer_phone": cust_phone,
            "shipping_address": ship_addr,
            "items": item_list,
            "total_amount": float(self.total_amount),
            "order_status": self.order_status,
            "status": self.order_status,
            "payment_method": self.payment_method or "CASH_ON_DELIVERY",
            "payment_status": self.payment_status or "PENDING",
            "seller_splits": seller_splits,
            "delivery_date": self.delivery_date,
            "carrier": self.carrier,
            "tracking_id": self.tracking_id,
            "tracking_number": self.tracking_id,
            "tracking_url": self.tracking_url,
            "tracking_history": self.tracking_history or [],
            "status_history": history_list,
            "return_request": self.return_request or {
                "status": "None",
                "reason": "",
                "message": "",
                "created_at": None
            },
            "created_at": format_iso_datetime(self.created_at),
            "terms_accepted": self.terms_accepted,
            "terms_accepted_at": format_iso_datetime(self.terms_accepted_at) if self.terms_accepted_at else None,
            "invoice_number": self.invoice.invoice_number if getattr(self, 'invoice', None) else None,
            "invoice": self.invoice.to_dict() if getattr(self, 'invoice', None) else None,
            "invoice_pdf_url": f"/api/orders/{self.order_id}/invoice/pdf"
        }

    @staticmethod
    def create_order(user_id, shipping_address, items, total_amount, terms_accepted=False, payment_method='CASH_ON_DELIVERY', payment_status='PENDING', commit=True):
        # Generate clean unique Order ID
        random_num = random.randint(100000, 999999)
        order_id = f"SS-{random_num}"
        
        est_delivery = (get_ist_time() + timedelta(days=5)).strftime("%d-%m-%Y")
        
        tracking_hist = [
            {
                "status": "Pending",
                "message": "Order placed successfully and is awaiting confirmation.",
                "updated_at": format_iso_datetime(get_ist_time())
            }
        ]
        
        ret_req = {
            "status": "None",
            "reason": "",
            "message": "",
            "created_at": None
        }
        
        parsed_user_id = None
        if user_id:
            try:
                parsed_user_id = int(user_id)
            except Exception:
                pass
                
        terms_accepted_at = get_ist_time() if terms_accepted else None
        order = OrderModel(
            order_id=order_id,
            user_id=parsed_user_id,
            shipping_address=shipping_address,
            total_amount=float(total_amount),
            order_status="Pending",
            status="Pending",
            payment_method=payment_method or 'CASH_ON_DELIVERY',
            payment_status=payment_status or 'PENDING',
            delivery_date=est_delivery,
            tracking_history=tracking_hist,
            return_request=ret_req,
            created_at=get_ist_time(),
            terms_accepted=terms_accepted,
            terms_accepted_at=terms_accepted_at
        )
        db.session.add(order)
        db.session.flush()
        
        # Add initial audit record in OrderStatusHistory
        init_history = OrderStatusHistory(
            order_id=order.id,
            order_number=order.order_id,
            previous_status=None,
            new_status="Pending",
            updated_by="Customer Checkout",
            user_id=parsed_user_id,
            role="Customer",
            notes="Order placed by customer."
        )
        db.session.add(init_history)

        # Add items
        for it in items:
            p_id = None
            if it.get("product_id"):
                try:
                    p_id = int(it.get("product_id"))
                except Exception:
                    pass
            order_item = OrderItem(
                order_id=order.id,
                product_id=p_id,
                seller_id=int(it.get("seller_id")) if (it.get("seller_id") and str(it.get("seller_id")).isdigit()) else None,
                quantity=int(it.get("quantity", 1)),
                price=float(it.get("price", 0)),
                name=it.get("name", "Product"),
                image=it.get("image", ""),
                status="Pending"
            )
            db.session.add(order_item)
            
        if commit:
            db.session.commit()
        else:
            db.session.flush()
        return order.to_dict()

    @staticmethod
    def find_by_seller_id(seller_id, page=None, limit=None):
        try:
            sid = int(seller_id)
            from sqlalchemy.orm import selectinload, joinedload
            # Subquery to find order IDs containing items belonging to this seller without triggering DISTINCT on json columns
            order_ids_subquery = db.session.query(OrderItem.order_id).filter(OrderItem.seller_id == sid).distinct()
            query = OrderModel.query.filter(OrderModel.id.in_(order_ids_subquery)).options(
                selectinload(OrderModel.items),
                joinedload(OrderModel.user)
            ).order_by(OrderModel.created_at.desc())

            def order_to_seller_dict(order_obj):
                d = order_obj.to_dict()
                seller_items = [it for it in d["items"] if it.get("seller_id") == str(sid)]
                d["items"] = seller_items
                d["seller_total_amount"] = sum(float(it["price"]) * int(it["quantity"]) for it in seller_items)
                return d

            if page is not None or limit is not None:
                from backend.utils.pagination import paginate_query
                res = paginate_query(query, page=page, limit=limit)
                if isinstance(res, dict) and "items" in res:
                    res["items"] = [order_to_seller_dict(o) for o in res["items"]]
                return res

            orders = query.all()
            return [order_to_seller_dict(o) for o in orders]
        except Exception as e:
            print("Error finding orders by seller_id:", e)
            return []

    @staticmethod
    def find_by_user_id(user_id, page=None, limit=None):
        try:
            uid = int(user_id)
            from sqlalchemy.orm import selectinload, joinedload
            query = OrderModel.query.options(
                selectinload(OrderModel.items),
                joinedload(OrderModel.user)
            ).filter_by(user_id=uid).order_by(OrderModel.created_at.desc())

            if page is not None or limit is not None:
                from backend.utils.pagination import paginate_query
                return paginate_query(query, page=page, limit=limit)

            orders = query.all()
            return [o.to_dict() for o in orders]
        except Exception:
            return []

    @staticmethod
    def find_all(page=None, limit=None):
        try:
            from backend.models.user import UserModel
            from sqlalchemy.orm import selectinload, joinedload
            query = OrderModel.query.outerjoin(UserModel, OrderModel.user_id == UserModel.id).options(
                selectinload(OrderModel.items),
                joinedload(OrderModel.user)
            ).order_by(OrderModel.created_at.desc())

            if page is not None or limit is not None:
                from backend.utils.pagination import paginate_query
                return paginate_query(query, page=page, limit=limit)

            orders = query.all()
            return [o.to_dict() for o in orders]
        except Exception:
            return []

    @staticmethod
    def update_status(order_id, status, message=None, delivery_date=None, carrier=None, tracking_id=None, tracking_url=None, updated_by=None, user_id=None, role=None, item_id=None):
        try:
            order = None
            if str(order_id).isdigit():
                order = OrderModel.query.with_for_update().get(int(order_id))
            if not order:
                order = OrderModel.query.filter_by(order_id=str(order_id)).with_for_update().first()
            if not order:
                return False
                
            previous_status = order.order_status or order.status or "Pending"
            
            clean_tracking_id = str(tracking_id).strip() if (tracking_id and str(tracking_id).strip()) else order.tracking_id
            clean_carrier = str(carrier).strip() if (carrier and str(carrier).strip()) else (order.carrier or ('Standard Courier' if clean_tracking_id else None))
            clean_tracking_url = str(tracking_url).strip() if (tracking_url and str(tracking_url).strip()) else order.tracking_url

            if clean_tracking_id:
                order.tracking_id = clean_tracking_id
            if clean_carrier:
                order.carrier = clean_carrier
            if clean_tracking_url:
                order.tracking_url = clean_tracking_url
            if delivery_date:
                order.delivery_date = delivery_date

            now_iso = format_iso_datetime(get_ist_time())
            tracking_history = list(order.tracking_history or [])
            tracking_history.append({
                "status": status,
                "previous_status": previous_status,
                "message": message or f"Order status changed to {status}.",
                "updated_at": now_iso,
                "updated_by": updated_by or "Authorized Staff",
                "user_id": user_id,
                "role": role,
                "carrier": order.carrier,
                "tracking_id": order.tracking_id,
                "tracking_number": order.tracking_id
            })
            
            order.order_status = status
            order.status = status
            
            from sqlalchemy.orm.attributes import flag_modified
            order.tracking_history = tracking_history
            flag_modified(order, "tracking_history")

            # Maintain payment status integrity: For COD, payment status must remain PENDING
            if not order.payment_status:
                order.payment_status = 'PENDING'

            # Update item status
            target_item_id = None
            if item_id and str(item_id).isdigit():
                target_item_id = int(item_id)

            for it in order.items:
                if target_item_id is None or it.id == target_item_id:
                    it.status = status

            # Create persistent audit record
            history_record = OrderStatusHistory(
                order_id=order.id,
                order_number=order.order_id,
                order_item_id=target_item_id,
                previous_status=previous_status,
                new_status=status,
                updated_by=updated_by or "Authorized Staff",
                user_id=user_id,
                role=role or "Owner",
                tracking_number=order.tracking_id,
                carrier=order.carrier,
                notes=message or f"Order fulfillment milestone updated to {status}."
            )
            db.session.add(history_record)

            db.session.commit()
            print(f"[ORDER_STATUS_UPDATE] Order '{order.order_id}' (db_id={order.id}) updated: {previous_status} -> {status} by {updated_by}")

            if order.user_id:
                try:
                    from backend.routes.auth import add_user_notification
                    carrier_txt = f" via {order.carrier}" if order.carrier else ""
                    tracking_txt = f" (Tracking AWB: {order.tracking_id})" if order.tracking_id else ""
                    notif_msg = message or f"Your order #{order.order_id} is now {status}.{carrier_txt}{tracking_txt}".strip()
                    add_user_notification(
                        user_id=str(order.user_id),
                        title=f"Order {status}",
                        message=notif_msg,
                        notif_type="order_status_update",
                        order_id=order.order_id
                    )
                except Exception as notif_err:
                    print("[ORDER_STATUS_NOTIF_ERR]:", notif_err)

            return True
        except Exception as e:
            db.session.rollback()
            print("[ERROR] Error updating order status:", e)
            return False

    @staticmethod
    def update_tracking(order_id, tracking_url=None, tracking_id=None, carrier=None):
        try:
            order = None
            if str(order_id).isdigit():
                order = OrderModel.query.with_for_update().get(int(order_id))
            if not order:
                order = OrderModel.query.filter_by(order_id=str(order_id)).with_for_update().first()
            if not order:
                return False

            if tracking_url is not None:
                order.tracking_url = str(tracking_url).strip() if str(tracking_url).strip() else None
            if tracking_id is not None:
                order.tracking_id = str(tracking_id).strip() if str(tracking_id).strip() else None
            if carrier is not None:
                order.carrier = str(carrier).strip() if str(carrier).strip() else None

            print(f"[DEBUG Admin Tracking DB] Updating order '{order.order_id}' (db_id={order.id}): tracking_id='{order.tracking_id}', tracking_url='{order.tracking_url}'")
            db.session.commit()
            print(f"[DEBUG Admin Tracking DB] Commit successful for order '{order.order_id}'")
            return True
        except Exception as e:
            db.session.rollback()
            print("[DEBUG Admin Tracking DB Error] Error updating order tracking info:", e)
            return False

    @staticmethod
    def request_return(order_id, reason, message):
        try:
            order = None
            if str(order_id).isdigit():
                order = OrderModel.query.with_for_update().get(int(order_id))
            if not order:
                order = OrderModel.query.filter_by(order_id=str(order_id)).with_for_update().first()
            if not order:
                return False
                
            order.return_request = {
                "status": "Requested",
                "reason": reason,
                "message": message,
                "created_at": format_iso_datetime(get_ist_time())
            }
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(order, "return_request")
            db.session.commit()

            try:
                from backend.models.admin import add_admin_notification
                add_admin_notification(
                    title="Order Return Requested",
                    message=f"Customer has requested a return for Order ID: {order.order_id}. Reason: {reason}",
                    type="return_requested",
                    user_id=order.user_id,
                    order_id=order.id
                )
            except Exception as ex:
                print(f"Error adding admin notification: {ex}")

            return True
        except Exception:
            db.session.rollback()
            return False

    @staticmethod
    def update_return_status(order_id, return_status, admin_message=None):
        try:
            order = None
            if str(order_id).isdigit():
                order = OrderModel.query.with_for_update().get(int(order_id))
            if not order:
                order = OrderModel.query.filter_by(order_id=str(order_id)).with_for_update().first()
            if not order:
                return False
                
            ret = order.return_request or {}
            ret["status"] = return_status
            if admin_message:
                ret["admin_message"] = admin_message
            ret["updated_at"] = format_iso_datetime(get_ist_time())
            
            order.return_request = ret
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(order, "return_request")
            
            if return_status == "Approved":
                order.order_status = "Cancelled"
                order.status = "Cancelled"
                
                history = order.tracking_history or []
                history.append({
                    "status": "Cancelled",
                    "message": "Return approved. Refund processed.",
                    "updated_at": format_iso_datetime(get_ist_time())
                })
                order.tracking_history = history
                flag_modified(order, "tracking_history")
            elif return_status == "Rejected":
                history = order.tracking_history or []
                history.append({
                    "status": order.status or "Delivered",
                    "message": f"Return rejected by admin: {admin_message}",
                    "updated_at": format_iso_datetime(get_ist_time())
                })
                order.tracking_history = history
                flag_modified(order, "tracking_history")
                
            db.session.commit()
            return True
        except Exception:
            db.session.rollback()
            return False

Order = OrderModel


def ensure_tracking_columns():
    try:
        from backend.extensions import db
        from sqlalchemy import inspect, text
        inspector = inspect(db.engine)
        columns = [c['name'] for c in inspector.get_columns('orders')]
        if 'tracking_url' not in columns:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE orders ADD COLUMN tracking_url VARCHAR(500)"))
                conn.commit()
                print("[DB] Added tracking_url column to orders table.")
        if 'tracking_id' not in columns:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE orders ADD COLUMN tracking_id VARCHAR(100)"))
                conn.commit()
                print("[DB] Added tracking_id column to orders table.")
    except Exception as e:
        print("[DB] Note on ensure_tracking_columns:", e)


