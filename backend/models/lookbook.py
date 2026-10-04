import json
from backend.extensions import db
from datetime import datetime
import pytz
from backend.utils.timezone import format_iso_datetime

class LookbookModel(db.Model):
    __tablename__ = 'lookbooks'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    tag = db.Column(db.String(100), nullable=True)
    image = db.Column(db.String(512), nullable=True)
    description = db.Column(db.Text, nullable=True)
    details = db.Column(db.Text, nullable=True)
    link = db.Column(db.String(255), nullable=True)
    display_order = db.Column(db.Integer, default=0, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Asia/Kolkata')), onupdate=lambda: datetime.now(pytz.timezone('Asia/Kolkata')))

    def to_dict(self):
        parsed_details = []
        if self.details:
            try:
                if isinstance(self.details, str):
                    parsed_details = json.loads(self.details)
                elif isinstance(self.details, list):
                    parsed_details = self.details
            except Exception:
                parsed_details = [self.details]

        return {
            "id": self.id,
            "title": self.title,
            "tag": self.tag or "",
            "image": self.image or "",
            "image_url": self.image or "",
            "description": self.description or "",
            "details": parsed_details,
            "link": self.link or "",
            "display_order": self.display_order or 0,
            "is_active": self.is_active,
            "created_at": format_iso_datetime(self.created_at) if self.created_at else None,
            "updated_at": format_iso_datetime(self.updated_at) if self.updated_at else None
        }
