from backend.extensions import db
from datetime import datetime
import pytz
from backend.utils.timezone import format_iso_datetime, get_ist_time

class InvoiceModel(db.Model):
    __tablename__ = 'invoices'

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id', ondelete='CASCADE'), unique=True, nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    
    invoice_date = db.Column(db.DateTime, default=get_ist_time, nullable=False)
    order_date = db.Column(db.DateTime, nullable=True)
    
    subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    discount_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    tax_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    cgst_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    sgst_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    igst_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    shipping_charges = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    grand_total = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    
    payment_method = db.Column(db.String(50), nullable=False, default='CASH_ON_DELIVERY')
    payment_status = db.Column(db.String(50), nullable=False, default='PENDING')
    
    customer_name = db.Column(db.String(255), nullable=True)
    customer_email = db.Column(db.String(255), nullable=True)
    customer_phone = db.Column(db.String(50), nullable=True)
    
    billing_address_snapshot = db.Column(db.JSON, nullable=True)
    shipping_address_snapshot = db.Column(db.JSON, nullable=True)
    items_snapshot = db.Column(db.JSON, nullable=True)
    
    invoice_pdf_path = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=get_ist_time, nullable=False)

    # Relationships
    order = db.relationship('OrderModel', backref=db.backref('invoice', uselist=False, cascade='all, delete-orphan'), lazy=True)
    customer = db.relationship('UserModel', foreign_keys=[customer_id], lazy=True)

    def to_dict(self):
        order_code = self.order.order_id if self.order else f"ORD-{self.order_id}"
        return {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "order_id": self.order_id,
            "order_number": order_code,
            "customer_id": self.customer_id,
            "invoice_date": format_iso_datetime(self.invoice_date) if self.invoice_date else None,
            "order_date": format_iso_datetime(self.order_date) if self.order_date else None,
            "subtotal": float(self.subtotal or 0.0),
            "discount_amount": float(self.discount_amount or 0.0),
            "tax_amount": float(self.tax_amount or 0.0),
            "cgst_amount": float(self.cgst_amount or 0.0),
            "sgst_amount": float(self.sgst_amount or 0.0),
            "igst_amount": float(self.igst_amount or 0.0),
            "shipping_charges": float(self.shipping_charges or 0.0),
            "grand_total": float(self.grand_total or 0.0),
            "payment_method": self.payment_method or "CASH_ON_DELIVERY",
            "payment_status": self.payment_status or "PENDING",
            "customer_name": self.customer_name or "Valued Customer",
            "customer_email": self.customer_email or "",
            "customer_phone": self.customer_phone or "",
            "billing_address": self.billing_address_snapshot or {},
            "shipping_address": self.shipping_address_snapshot or {},
            "items": self.items_snapshot or [],
            "invoice_pdf_path": self.invoice_pdf_path,
            "pdf_url": f"/api/orders/{order_code}/invoice/pdf",
            "created_at": format_iso_datetime(self.created_at) if self.created_at else None
        }

Invoice = InvoiceModel
