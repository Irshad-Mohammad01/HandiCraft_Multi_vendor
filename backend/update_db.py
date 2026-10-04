import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app
from backend.extensions import db

def run_updates():
    with app.app_context():
        # Execute ALTER TABLE queries to add columns if not exist
        try:
            db.session.execute(db.text("ALTER TABLE delivery_addresses ADD COLUMN alternate_mobile_number VARCHAR(15) DEFAULT NULL"))
            db.session.commit()
            print("Successfully added alternate_mobile_number column to delivery_addresses.")
        except Exception as e:
            db.session.rollback()
            print("alternate_mobile_number column might already exist or failed:", e)

        try:
            db.session.execute(db.text("ALTER TABLE products ADD COLUMN created_by VARCHAR(255) DEFAULT 'admin'"))
            db.session.commit()
            print("Successfully added created_by column to products.")
        except Exception as e:
            db.session.rollback()
            print("created_by column might already exist or failed:", e)

        try:
            db.session.execute(db.text("ALTER TABLE products ADD COLUMN modified_by VARCHAR(255) DEFAULT 'admin'"))
            db.session.commit()
            print("Successfully added modified_by column to products.")
        except Exception as e:
            db.session.rollback()
            print("modified_by column might already exist or failed:", e)

        try:
            db.session.execute(db.text("ALTER TABLE products ADD COLUMN show_on_homepage BOOLEAN NOT NULL DEFAULT FALSE"))
            db.session.commit()
            print("Successfully added show_on_homepage column to products.")
        except Exception as e:
            db.session.rollback()
            print("show_on_homepage column might already exist or failed:", e)

        try:
            db.session.execute(db.text("ALTER TABLE users ADD COLUMN last_login DATETIME DEFAULT NULL"))
            db.session.commit()
            print("Successfully added last_login column to users.")
        except Exception as e:
            db.session.rollback()
            print("last_login column might already exist or failed:", e)

        try:
            db.session.execute(db.text("ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en'"))
            db.session.commit()
            print("Successfully added preferred_language column to users.")
        except Exception as e:
            db.session.rollback()
            print("preferred_language column might already exist or failed:", e)

        try:
            db.session.execute(db.text("ALTER TABLE users ADD COLUMN first_login BOOLEAN DEFAULT TRUE"))
            db.session.commit()
            print("Successfully added first_login column to users.")
        except Exception as e:
            db.session.rollback()
            print("first_login column might already exist or failed:", e)

        try:
            db.session.execute(db.text("ALTER TABLE categories ADD COLUMN name_en VARCHAR(100) DEFAULT NULL"))
            db.session.commit()
            print("Successfully added name_en column to categories.")
        except Exception as e:
            db.session.rollback()
            print("name_en column might already exist or failed:", e)

        try:
            db.session.execute(db.text("ALTER TABLE categories ADD COLUMN name_hi VARCHAR(100) DEFAULT NULL"))
            db.session.commit()
            print("Successfully added name_hi column to categories.")
        except Exception as e:
            db.session.rollback()
            print("name_hi column might already exist or failed:", e)

        try:
            db.session.execute(db.text("ALTER TABLE categories ADD COLUMN image_url VARCHAR(500) DEFAULT NULL"))
            db.session.commit()
            print("Successfully added image_url column to categories.")
        except Exception as e:
            db.session.rollback()
            print("image_url column might already exist or failed:", e)

        # Backpopulate translations for existing categories and clean hardcoded image paths
        try:
            translations = {
                "Rings": {"en": "Rings", "hi": "अंगूठियाँ"},
                "Necklaces": {"en": "Necklaces", "hi": "हार"},
                "Earrings": {"en": "Earrings", "hi": "झुमके"},
                "Bracelets": {"en": "Bracelets", "hi": "कंगन"},
                "Bangles": {"en": "Bangles", "hi": "चूड़ियाँ"},
                "Bridal Collection": {"en": "Bridal Collection", "hi": "ब्राइडल कलेक्शन"}
            }
            for name, trans in translations.items():
                db.session.execute(
                    db.text("UPDATE categories SET name_en = :en, name_hi = :hi WHERE name = :name"),
                    {"en": trans["en"], "hi": trans["hi"], "name": name}
                )
            db.session.execute(db.text("UPDATE categories SET name_en = name WHERE name_en IS NULL"))
            db.session.execute(db.text("UPDATE categories SET image_url = NULL WHERE image_url LIKE '/cat_%' OR image_url = '/logo.svg'"))
            db.session.commit()
            print("Successfully backpopulated category translations and cleaned hardcoded image paths.")
        except Exception as e:
            db.session.rollback()
            print("Failed to backpopulate category translations and clean images:", e)


        # Migrate user_login_attempts table -> user_attempts and add OTP rate limiting columns
        try:
            engine = db.engine
            dialect_name = engine.dialect.name
            inspector = db.inspect(engine)
            tables = inspector.get_table_names()

            # 1. Rename table user_login_attempts -> user_attempts if user_attempts does not exist
            if 'user_login_attempts' in tables and 'user_attempts' not in tables:
                print("[MIGRATION] Renaming table 'user_login_attempts' to 'user_attempts'...")
                db.session.execute(db.text("ALTER TABLE user_login_attempts RENAME TO user_attempts"))
                db.session.commit()
                print("[MIGRATION] Table renamed to 'user_attempts' successfully.")

            # Re-inspect table names and columns
            inspector = db.inspect(engine)
            tables = inspector.get_table_names()
            if 'user_attempts' in tables:
                columns = [c['name'] for c in inspector.get_columns('user_attempts')]
                
                # 2. Rename failed_attempts -> failed_login_attempts if needed
                if 'failed_attempts' in columns and 'failed_login_attempts' not in columns:
                    print("[MIGRATION] Renaming column 'failed_attempts' to 'failed_login_attempts'...")
                    db.session.execute(db.text("ALTER TABLE user_attempts RENAME COLUMN failed_attempts TO failed_login_attempts"))
                    db.session.commit()
                    print("[MIGRATION] Column renamed to 'failed_login_attempts' successfully.")

                # Re-fetch columns
                columns = [c['name'] for c in inspector.get_columns('user_attempts')]

                # 3. Add missing columns
                if 'otp_request_attempts' not in columns:
                    print("[MIGRATION] Adding column 'otp_request_attempts' to user_attempts...")
                    db.session.execute(db.text("ALTER TABLE user_attempts ADD COLUMN otp_request_attempts INTEGER DEFAULT 0"))
                    db.session.commit()

                if 'first_otp_request_at' not in columns:
                    print("[MIGRATION] Adding column 'first_otp_request_at' to user_attempts...")
                    col_type = "TIMESTAMP" if dialect_name in ('postgresql', 'sqlite') else "DATETIME"
                    db.session.execute(db.text(f"ALTER TABLE user_attempts ADD COLUMN first_otp_request_at {col_type} DEFAULT NULL"))
                    db.session.commit()

                if 'last_otp_request_at' not in columns:
                    print("[MIGRATION] Adding column 'last_otp_request_at' to user_attempts...")
                    col_type = "TIMESTAMP" if dialect_name in ('postgresql', 'sqlite') else "DATETIME"
                    db.session.execute(db.text(f"ALTER TABLE user_attempts ADD COLUMN last_otp_request_at {col_type} DEFAULT NULL"))
                    db.session.commit()

                if 'reason' not in columns:
                    print("[MIGRATION] Adding column 'reason' to user_attempts...")
                    db.session.execute(db.text("ALTER TABLE user_attempts ADD COLUMN reason VARCHAR(50) DEFAULT NULL"))
                    db.session.commit()
        except Exception as mig_err:
            db.session.rollback()
            print("[MIGRATION WARNING] user_attempts table migration notice:", mig_err)

        # Import all models to ensure they are registered with SQLAlchemy metadata
        from backend.models.product import ProductModel, ProductImageModel, StockHistoryModel, ProductAuditLogModel, ProductVariantModel, BuyRequestModel
        from backend.models.user import UserModel, DeliveryAddress, UserStatusAuditLog
        from backend.models.category import Category
        from backend.models.order import OrderModel, OrderItem, Transaction, OrderStatusHistory
        from backend.models.review import ReviewModel
        from backend.models.support import SupportModel, FAQModel, SupportLinkModel
        from backend.models.admin import AdminModel, AdminAuditLog, AdminNotification
        from backend.models.coupon import CouponModel
        from backend.models.otp_verification import OTPVerification
        from backend.models.banner import BannerModel
        from backend.models.notification import NotificationModel
        from backend.models.settings import SiteSettingModel
        from backend.models.user_attempt import UserAttempt
        from backend.models.user_login_attempt import UserLoginAttempt

        # Create all tables (will create product_audit_logs, user_status_audit_logs, site_settings, user_attempts)
        db.create_all()
        print("db.create_all() executed successfully.")

        # Seed default site settings
        try:
            import json
            default_settings = {
                "owner_image": "/owner.png",
                "owner_name": "Shri Suresh Soni",
                "owner_title": "Founder & Master Craftsman",
                "owner_est": "Est. 1999 · Jaipur, India",
                "owner_bio_1": "With over 25 years of dedication to the ancient art of Indian jewellery, Shri Suresh Soni has transformed SS Jewellery into a hallmark of excellence trusted by families across India.",
                "owner_bio_2": "A third-generation goldsmith trained in the royal ateliers of Jaipur, he brings Kundan, Meenakari, and Jadau traditions into every handcrafted piece — blending timeless heritage with contemporary elegance.",
                "owner_quote": "Every jewel we craft carries a piece of our soul — because true luxury is not just about gold, it is about the love and legacy it carries forever.",
                "video_showcase_url": "/golden-stage.mp4",
                "owner_stats": json.dumps([
                    {"label": "Years of Craft", "value": 25, "suffix": "+"},
                    {"label": "Unique Designs", "value": 1200, "suffix": "+"},
                    {"label": "Happy Clients", "value": 8500, "suffix": "+"},
                    {"label": "Awards Won", "value": 18, "suffix": ""}
                ]),
                "owners_list": json.dumps([
                    {
                        "id": 1,
                        "name": "Shri Suresh Soni",
                        "title": "Founder & Master Craftsman",
                        "est": "Est. 1999 · Jaipur, India",
                        "bio1": "With over 25 years of dedication to the ancient art of Indian jewellery, Shri Suresh Soni has transformed SS Jewellery into a hallmark of excellence trusted by families across India.",
                        "bio2": "A third-generation goldsmith trained in the royal ateliers of Jaipur, he brings Kundan, Meenakari, and Jadau traditions into every handcrafted piece — blending timeless heritage with contemporary elegance.",
                        "quote": "Every jewel we craft carries a piece of our soul — because true luxury is not just about gold, it is about the love and legacy it carries forever.",
                        "image": "/owner.png",
                        "stats": [
                            {"label": "Years of Craft", "value": 25, "suffix": "+"},
                            {"label": "Unique Designs", "value": 1200, "suffix": "+"},
                            {"label": "Happy Clients", "value": 8500, "suffix": "+"},
                            {"label": "Awards Won", "value": 18, "suffix": ""}
                        ],
                        "badges": ["BIS Hallmark Certified", "ISO 9001:2015", "Rajasthan Ratna Awardee", "GIA Member"]
                    }
                ])
            }
            for key, val in default_settings.items():
                existing = SiteSettingModel.query.filter_by(key=key).first()
                if not existing:
                    setting = SiteSettingModel(key=key, value=val)
                    db.session.add(setting)
            db.session.commit()
            print("Successfully seeded site settings.")
        except Exception as e:
            db.session.rollback()
            print("Failed to seed site settings:", e)

if __name__ == '__main__':
    run_updates()

