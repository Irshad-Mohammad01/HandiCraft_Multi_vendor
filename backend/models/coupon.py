from backend.extensions import db
from datetime import datetime
import pytz
from backend.utils.timezone import format_iso_datetime, get_ist_time

class CouponModel(db.Model):
    __tablename__ = 'coupons'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=True)
    description = db.Column(db.Text, nullable=True)
    discount_type = db.Column(db.String(20), nullable=False) # 'percent' or 'flat'
    discount_value = db.Column(db.Numeric(10, 2), nullable=False)
    min_order_amount = db.Column(db.Numeric(10, 2), default=0.00)
    max_discount = db.Column(db.Numeric(10, 2), nullable=True)
    start_date = db.Column(db.DateTime, nullable=True)
    expiry_date = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))

    def get_status(self):
        if not self.is_active:
            return "Inactive"
        now = datetime.now(pytz.timezone('Asia/Kolkata'))
        if self.start_date:
            s_val = self.start_date if self.start_date.tzinfo else pytz.timezone('Asia/Kolkata').localize(self.start_date)
            if now < s_val:
                return "Scheduled"
        if self.expiry_date:
            e_val = self.expiry_date if self.expiry_date.tzinfo else pytz.timezone('Asia/Kolkata').localize(self.expiry_date)
            if now > e_val:
                return "Expired"
        return "Active"

    def to_dict(self):
        return {
            "id": str(self.id),
            "_id": str(self.id),
            "code": self.code,
            "title": self.title or self.code,
            "description": self.description or "",
            "discount_type": self.discount_type,
            "discount_value": float(self.discount_value),
            "min_order_amount": float(self.min_order_amount or 0.0),
            "max_discount": float(self.max_discount) if self.max_discount is not None else None,
            "start_date": format_iso_datetime(self.start_date) if self.start_date else None,
            "expiry_date": format_iso_datetime(self.expiry_date) if self.expiry_date else None,
            "is_active": bool(self.is_active),
            "status": self.get_status(),
            "created_at": format_iso_datetime(self.created_at)
        }

    @staticmethod
    def create_coupon(code, discount_type, discount_value, min_order_amount=0.0, is_active=True, title=None, description=None, max_discount=None, start_date=None, expiry_date=None):
        try:
            code = code.strip().upper()
            existing = CouponModel.query.filter_by(code=code).first()
            if existing:
                return None
                
            coupon = CouponModel(
                code=code,
                title=title or code,
                description=description or "",
                discount_type=discount_type,
                discount_value=float(discount_value),
                min_order_amount=float(min_order_amount or 0.0),
                max_discount=float(max_discount) if max_discount is not None and max_discount != '' else None,
                start_date=start_date,
                expiry_date=expiry_date,
                is_active=bool(is_active),
                created_at=get_ist_time()
            )
            db.session.add(coupon)
            db.session.commit()
            return coupon.to_dict()
        except Exception as e:
            print("Error creating coupon:", e)
            db.session.rollback()
            return None

    @staticmethod
    def find_by_code(code):
        try:
            coupon = CouponModel.query.filter_by(code=code.strip().upper(), is_active=True).first()
            if not coupon:
                return None
            # Check scheduling / expiry
            now = datetime.now(pytz.timezone('Asia/Kolkata'))
            if coupon.start_date:
                s_val = coupon.start_date if coupon.start_date.tzinfo else pytz.timezone('Asia/Kolkata').localize(coupon.start_date)
                if now < s_val:
                    return None
            if coupon.expiry_date:
                e_val = coupon.expiry_date if coupon.expiry_date.tzinfo else pytz.timezone('Asia/Kolkata').localize(coupon.expiry_date)
                if now > e_val:
                    return None
            return coupon.to_dict()
        except Exception:
            return None

    @staticmethod
    def find_all():
        try:
            coupons = CouponModel.query.order_by(CouponModel.id.desc()).all()
            return [c.to_dict() for c in coupons]
        except Exception:
            return []

    @staticmethod
    def delete_coupon(coupon_id):
        try:
            cid = int(coupon_id)
            coupon = CouponModel.query.get(cid)
            if coupon:
                db.session.delete(coupon)
                db.session.commit()
                return True
            return False
        except Exception:
            return False
