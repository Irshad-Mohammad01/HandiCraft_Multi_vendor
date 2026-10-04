from datetime import datetime
import pytz
from backend.extensions import db
from backend.utils.timezone import format_iso_datetime, get_ist_time
from backend.utils.security import EncryptedString

class SellerDatabaseRegistry(db.Model):
    __tablename__ = 'seller_database_registry'

    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False, index=True)
    database_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    database_provider = db.Column(db.String(50), default='neon', nullable=False)
    connection_secret_reference = db.Column(db.String(100), nullable=True)
    encrypted_connection_url = db.Column(EncryptedString(512), nullable=True)
    provisioning_status = db.Column(db.String(50), default='pending_configuration', nullable=False)
    connection_status = db.Column(db.String(50), default='not_configured', nullable=False)
    schema_version = db.Column(db.String(50), default='1.0.0', nullable=False)
    last_verified_at = db.Column(db.DateTime, nullable=True)
    payment_account_id = db.Column(db.String(100), nullable=True)
    settlement_status = db.Column(db.String(50), default='pending_kyc', nullable=False)
    created_at = db.Column(db.DateTime, default=get_ist_time, nullable=False)
    updated_at = db.Column(db.DateTime, default=get_ist_time, onupdate=get_ist_time, nullable=False)

    # Relationship to user
    seller = db.relationship('UserModel', backref=db.backref('database_registry', uselist=False, cascade='all, delete-orphan'))

    def to_dict(self, include_secret_ref=True):
        seller_name = "Unknown Seller"
        seller_email = "unknown"
        if self.seller:
            seller_name = getattr(self.seller, 'name', None) or getattr(self.seller, 'full_name', None) or "Artisan"
            seller_email = getattr(self.seller, 'email', None) or ""

        # NEVER expose passwords or complete connection strings
        res = {
            "id": self.id,
            "seller_id": self.seller_id,
            "seller_name": seller_name,
            "seller_email": seller_email,
            "database_id": self.database_id,
            "database_provider": self.database_provider,
            "provisioning_status": self.provisioning_status,
            "connection_status": self.connection_status,
            "schema_version": self.schema_version,
            "payment_account_id": self.payment_account_id or "",
            "settlement_status": self.settlement_status or "pending_kyc",
            "is_configured": bool(self.connection_secret_reference or self.encrypted_connection_url),
            "last_verified_at": format_iso_datetime(self.last_verified_at) if self.last_verified_at else None,
            "created_at": format_iso_datetime(self.created_at) if self.created_at else None,
            "updated_at": format_iso_datetime(self.updated_at) if self.updated_at else None
        }

        if include_secret_ref:
            res["connection_secret_reference"] = self.connection_secret_reference or f"SELLER_DATABASE_URL_{self.database_id.replace('DB', '')}"

        return res
