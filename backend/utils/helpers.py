import re
import random
import os
from datetime import datetime, timedelta
import pytz
from backend.extensions import db
from backend.models.otp_verification import OTPVerification
from backend.utils.timezone import get_ist_time
from backend.config import Config

def safe_print(*args, **kwargs):
    try:
        print(*args, **kwargs)
    except Exception:
        pass

def generate_otp(identifier):
    """
    Generates a 6-digit OTP, stores it in the database with 5 minutes validity, and returns it.
    Respects Config.ENABLE_OTP and Config.ENABLE_SMS feature flags.
    """
    if not Config.ENABLE_OTP and Config.IS_DEV:
        safe_print("[OTP SYSTEM] OTP feature flag is off; generating a development OTP.")

    otp = str(random.randint(100000, 999999))
    expires_at = get_ist_time() + timedelta(minutes=5)
    
    # Check if there is an existing OTP for this identifier
    record = OTPVerification.query.filter_by(identifier=identifier).first()
    if record:
        record.otp = otp
        record.expires_at = expires_at
        record.status = 'pending'
    else:
        record = OTPVerification(
            identifier=identifier,
            otp=otp,
            expires_at=expires_at,
            status='pending'
        )
        db.session.add(record)
        
    db.session.commit()
    
    if Config.IS_DEV:
        safe_print("[OTP SYSTEM] Development OTP generated (value intentionally not logged).")
    if not Config.ENABLE_SMS:
        safe_print(f"[SMS SYSTEM] SMS delivery disabled by feature flag (ENABLE_SMS=False in {Config.ENVIRONMENT} mode).")
    
    return otp

def verify_otp(identifier, submitted_otp):
    """
    Verifies if the submitted OTP matches the stored OTP in the database and is not expired.
    """
    record = OTPVerification.query.filter_by(identifier=identifier).first()
    if not record:
        return False
        
    # Check expiry (comparing naive datetimes in IST)
    current_time_ist_naive = get_ist_time().replace(tzinfo=None)
    if current_time_ist_naive > record.expires_at:
        try:
            db.session.delete(record)
            db.session.commit()
        except Exception:
            db.session.rollback()
        return False
        
    if record.otp == str(submitted_otp):
        try:
            record.status = 'verified'
            db.session.commit()
        except Exception:
            db.session.rollback()
            return False
        return True
        
    return False


def normalize_email(email):
    """
    Normalizes an email address by stripping leading/trailing whitespace and converting to lowercase.
    If input is None or not a string, returns as is.
    """
    if not email or not isinstance(email, str):
        return email
    return email.strip().lower()

def is_valid_email(email):
    """
    Simple email validation.
    """
    if not email or not isinstance(email, str):
        return False
    clean_email = email.strip().lower()
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, clean_email) is not None

def is_allowed_email_domain(email):
    """
    Validates if an email address belongs to an allowed domain.
    Supports standard web providers (Gmail, Outlook, Yahoo) and platform domains.
    """
    if not email or not isinstance(email, str):
        return False
    clean_email = email.strip().lower()
    parts = clean_email.split('@')
    if len(parts) != 2:
        return False
    domain = '@' + parts[1]
    if domain in ('@gmail.com', '@outlook.com', '@craftnest.com', '@craftnest.internal', '@yahoo.com', '@hotmail.com', '@icloud.com'):
        return True
    # Allow any domain with standard TLDs for registered artisan businesses
    if '.' in parts[1] and len(parts[1].split('.')[-1]) >= 2:
        return True
    return False


