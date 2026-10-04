from backend.extensions import db
from datetime import datetime
import pytz
from backend.utils.timezone import format_iso_datetime

class BannerModel(db.Model):
    __tablename__ = 'banners'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    subtitle = db.Column(db.String(255), nullable=True)
    description = db.Column(db.Text, nullable=True)
    button_text = db.Column(db.String(100), nullable=True)
    button_link = db.Column(db.String(255), nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    mobile_image_url = db.Column(db.String(500), nullable=True)
    background_style = db.Column(db.String(255), nullable=True)
    bg_color = db.Column(db.String(50), nullable=True, default='#2B2523')
    text_color = db.Column(db.String(50), nullable=True, default='#FFFFFF')
    display_location = db.Column(db.String(100), nullable=True, default='homepage_hero')
    category = db.Column(db.String(100), nullable=True)
    start_date = db.Column(db.DateTime, nullable=True)
    expiry_date = db.Column(db.DateTime, nullable=True)
    display_order = db.Column(db.Integer, default=0, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')), onupdate=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))

    def get_status(self):
        if not self.is_active:
            return "Inactive"
        now = datetime.now(pytz.timezone('Asia/Kolkata'))
        if self.start_date:
            start_val = self.start_date
            if start_val.tzinfo is None:
                start_val = pytz.timezone('Asia/Kolkata').localize(start_val)
            if now < start_val:
                return "Scheduled"
        if self.expiry_date:
            expiry_val = self.expiry_date
            if expiry_val.tzinfo is None:
                expiry_val = pytz.timezone('Asia/Kolkata').localize(expiry_val)
            if now > expiry_val:
                return "Expired"
        return "Active"

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "subtitle": self.subtitle or "",
            "description": self.description or "",
            "button_text": self.button_text or "",
            "button_link": self.button_link or "",
            "image_url": self.image_url or "",
            "mobile_image_url": self.mobile_image_url or "",
            "background_style": self.background_style or "from-slate-900 via-indigo-950 to-slate-900",
            "bg_color": self.bg_color or "#2B2523",
            "text_color": self.text_color or "#FFFFFF",
            "display_location": self.display_location or "homepage_hero",
            "category": self.category or "",
            "start_date": format_iso_datetime(self.start_date) if self.start_date else None,
            "expiry_date": format_iso_datetime(self.expiry_date) if self.expiry_date else None,
            "display_order": self.display_order,
            "is_active": self.is_active,
            "status": self.get_status(),
            "created_at": format_iso_datetime(self.created_at) if self.created_at else None,
            "updated_at": format_iso_datetime(self.updated_at) if self.updated_at else None
        }
