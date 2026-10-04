from backend.extensions import db
from datetime import datetime, timedelta
from backend.utils.timezone import format_iso_datetime, get_ist_time

class UserAttempt(db.Model):
    __tablename__ = 'user_attempts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False, index=True)
    failed_login_attempts = db.Column(db.Integer, default=0, nullable=False)
    otp_request_attempts = db.Column(db.Integer, default=0, nullable=False)
    first_failed_at = db.Column(db.DateTime, nullable=True)
    last_failed_at = db.Column(db.DateTime, nullable=True)
    first_otp_request_at = db.Column(db.DateTime, nullable=True)
    last_otp_request_at = db.Column(db.DateTime, nullable=True)
    blocked_at = db.Column(db.DateTime, nullable=True)
    blocked_until = db.Column(db.DateTime, nullable=True)
    reason = db.Column(db.String(50), nullable=True)  # 'LOGIN_FAILED_ATTEMPTS' or 'FORGOT_PASSWORD_OTP_LIMIT'
    updated_at = db.Column(db.DateTime, default=get_ist_time, onupdate=get_ist_time, nullable=False)

    @property
    def failed_attempts(self):
        """Backward compatibility alias for failed_login_attempts."""
        return self.failed_login_attempts

    @failed_attempts.setter
    def failed_attempts(self, value):
        self.failed_login_attempts = value

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "failed_login_attempts": self.failed_login_attempts,
            "otp_request_attempts": self.otp_request_attempts,
            "first_failed_at": format_iso_datetime(self.first_failed_at),
            "last_failed_at": format_iso_datetime(self.last_failed_at),
            "first_otp_request_at": format_iso_datetime(self.first_otp_request_at),
            "last_otp_request_at": format_iso_datetime(self.last_otp_request_at),
            "blocked_at": format_iso_datetime(self.blocked_at),
            "blocked_until": format_iso_datetime(self.blocked_until),
            "reason": self.reason,
            "updated_at": format_iso_datetime(self.updated_at)
        }

    @classmethod
    def check_and_get_lock(cls, user_id):
        """
        Retrieves or initializes the login security record for user_id with for_update lock.
        Checks if account is locked for password login.
        Returns tuple: (is_locked: bool, attempt_record: UserAttempt)
        """
        now = get_ist_time()
        record = cls.query.filter_by(user_id=user_id).with_for_update().first()
        
        if record:
            if record.blocked_until and record.blocked_until > now:
                # Account is currently locked
                return True, record
            elif record.blocked_until and record.blocked_until <= now:
                # Lock has expired! Reset lock state automatically
                record.blocked_at = None
                record.blocked_until = None
                record.reason = None
                if record.failed_login_attempts >= 5:
                    record.failed_login_attempts = 0
                    record.first_failed_at = None
                    record.last_failed_at = None
                if record.otp_request_attempts >= 3:
                    record.otp_request_attempts = 0
                    record.first_otp_request_at = None
                    record.last_otp_request_at = None
                record.updated_at = now
                db.session.flush()
                return False, record
        return False, record

    @classmethod
    def record_failed_attempt(cls, user_id, record=None):
        """
        Increments failed_login_attempts counter atomically.
        If failed_login_attempts reaches >= 5, sets blocked_at, blocked_until (now + 15 minutes), and reason='LOGIN_FAILED_ATTEMPTS'.
        Returns True if account is now locked, False otherwise.
        """
        now = get_ist_time()
        if record is None:
            record = cls.query.filter_by(user_id=user_id).with_for_update().first()
            
        if not record:
            record = cls(
                user_id=user_id,
                failed_login_attempts=1,
                first_failed_at=now,
                last_failed_at=now,
                updated_at=now
            )
            db.session.add(record)
        else:
            if record.failed_login_attempts == 0 or not record.first_failed_at:
                record.failed_login_attempts = 1
                record.first_failed_at = now
            else:
                record.failed_login_attempts += 1
            record.last_failed_at = now
            record.updated_at = now

        if record.failed_login_attempts >= 5:
            record.blocked_at = now
            record.blocked_until = now + timedelta(minutes=15)
            record.reason = "LOGIN_FAILED_ATTEMPTS"
            record.updated_at = now
            db.session.commit()
            return True
        else:
            db.session.commit()
            return False

    @classmethod
    def record_successful_login(cls, user_id, record=None):
        """
        Resets failed_login_attempts and clears login lock state upon successful password login.
        """
        now = get_ist_time()
        if record is None:
            record = cls.query.filter_by(user_id=user_id).with_for_update().first()
            
        if record:
            record.failed_login_attempts = 0
            record.first_failed_at = None
            record.last_failed_at = None
            if record.reason == "LOGIN_FAILED_ATTEMPTS":
                record.blocked_at = None
                record.blocked_until = None
                record.reason = None
            record.updated_at = now
            db.session.flush()

    @classmethod
    def check_and_record_otp_request(cls, user_id):
        """
        Checks and records a Forgot Password OTP request for user_id atomically with row locking.
        Enforces a 3-request limit per 15-minute window per account.
        
        Returns tuple: (is_allowed: bool, is_blocked: bool, message: str or None)
        """
        now = get_ist_time()
        record = cls.query.filter_by(user_id=user_id).with_for_update().first()
        
        if not record:
            record = cls(
                user_id=user_id,
                failed_login_attempts=0,
                otp_request_attempts=1,
                first_otp_request_at=now,
                last_otp_request_at=now,
                updated_at=now
            )
            db.session.add(record)
            db.session.commit()
            return True, False, None

        # Check existing active block
        if record.blocked_until and record.blocked_until > now:
            db.session.commit()
            return False, True, "Too many OTP requests. Please try after 15 minutes."

        # If previous block has expired, clear block state automatically
        if record.blocked_until and record.blocked_until <= now:
            record.blocked_at = None
            record.blocked_until = None
            record.reason = None

        # Check 15-minute window for OTP requests
        if not record.first_otp_request_at or (now - record.first_otp_request_at) > timedelta(minutes=15):
            record.otp_request_attempts = 0
            record.first_otp_request_at = now

        # Check if attempt limit reached (already 3 attempts made in current 15-min window)
        if record.otp_request_attempts >= 3:
            record.blocked_at = now
            record.blocked_until = now + timedelta(minutes=15)
            record.reason = "FORGOT_PASSWORD_OTP_LIMIT"
            record.updated_at = now
            db.session.commit()
            return False, True, "Too many OTP requests. Please try after 15 minutes."

        # Allow request & increment counter
        record.otp_request_attempts += 1
        record.last_otp_request_at = now
        record.updated_at = now
        db.session.commit()
        return True, False, None
