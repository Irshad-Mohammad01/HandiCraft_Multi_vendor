"""
Centralized Enterprise OTP Service (DEV, QA, PROD)
==================================================
Handles generation, delivery, attempt tracking, and verification for:
1. Registration & Account Creation
2. Forgot Password & Account Recovery

Environment Delivery Matrix:
- DEV: Generates OTP, skips SMTP completely, exposes OTP in response for UI display.
- QA:  Generates OTP, dispatches real SMTP email, NEVER exposes OTP in response.
- PROD: Generates secure OTP, dispatches real SMTP email, NEVER exposes OTP in response.
"""

import json
import random
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, Optional

import bcrypt
import jwt

from backend.config import Config
from backend.extensions import db
from backend.models.otp_verification import OTPVerification
from backend.models.user import UserModel, DeliveryAddress
from backend.models.user_attempt import UserAttempt
from backend.utils.timezone import get_ist_time
from backend.utils.email_service import send_registration_otp, send_forgot_password_otp
from backend.utils.mobile_otp import send_mobile_otp

logger = logging.getLogger(__name__)

MAX_OTP_ATTEMPTS = 5
OTP_EXPIRY_MINUTES = 5

class OTPService:
    @staticmethod
    def _generate_code() -> str:
        """Generate secure 6-digit verification code."""
        return str(random.randint(100000, 999999))

    @classmethod
    def request_registration_otp(
        cls,
        name: str,
        email: str,
        mobile: str,
        password: str,
        address: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, Dict[str, Any], int]:
        """
        Generates and dispatches registration OTP based on active environment.
        In DEV: Skips SMTP completely and returns dev_otp.
        In QA/PROD: Sends email via SMTP and never returns OTP.
        """
        clean_email = (email or "").strip().lower()

        # Check existing user
        existing_user = UserModel.query.filter_by(email=clean_email).first()
        if existing_user:
            return False, {"success": False, "message": "An account with this email already exists."}, 400

        current_time = get_ist_time()

        # Invalidate old and expired OTP sessions for this email
        OTPVerification.query.filter_by(email=clean_email).delete()
        OTPVerification.query.filter(OTPVerification.expires_at < current_time).delete()

        # Generate 6-digit OTP code & expiry
        otp_code = cls._generate_code()
        expires_at = current_time + timedelta(minutes=OTP_EXPIRY_MINUTES)

        # Hash password using bcrypt
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8') if password else ""

        temp_data = {
            "name": name or "",
            "mobile": mobile or "",
            "password_hash": hashed_password,
            "address": address or {}
        }

        otp_record = OTPVerification(
            email=clean_email,
            otp_code=otp_code,
            expires_at=expires_at,
            is_verified=False,
            attempts=0,
            resend_attempts=0,
            temporary_user_data=json.dumps(temp_data)
        )
        db.session.add(otp_record)
        db.session.commit()

        # ----------------------------------------------------------------------
        # 1. DEVELOPMENT ENVIRONMENT (No SMTP; Expose OTP for on-screen display)
        # ----------------------------------------------------------------------
        if Config.IS_DEV and Config.DEV_OTP_ENABLED:
            logger.info("[OTP SERVICE - DEV] Skipping SMTP. Exposing DEV OTP for email: %s", clean_email)
            print(f"[OTP SERVICE - DEV] Generated DEV OTP for {clean_email}: {otp_code}")
            return True, {
                "success": True,
                "message": "DEV MODE: Verification code generated successfully.",
                "dev_otp": otp_code,
                "otp": otp_code,
                "email": clean_email,
                "environment": "development"
            }, 200

        # ----------------------------------------------------------------------
        # 2. QA & PRODUCTION ENVIRONMENTS (Real SMTP; NEVER Expose OTP)
        # ----------------------------------------------------------------------
        try:
            email_result = send_registration_otp(clean_email, otp_code, name=name)
        except Exception as smtp_err:
            logger.error("[OTP SERVICE - %s] SMTP Exception: %s", Config.ENVIRONMENT, smtp_err)
            db.session.delete(otp_record)
            db.session.commit()
            return False, {
                "success": False,
                "message": "We could not send the verification code right now. Please try again later."
            }, 500

        if not email_result:
            logger.error("[OTP SERVICE - %s] Failed to dispatch registration email via SMTP.", Config.ENVIRONMENT)
            db.session.delete(otp_record)
            db.session.commit()
            return False, {
                "success": False,
                "message": "We could not send the verification code right now. Please try again later."
            }, 500

        # Optional mobile delivery if configured
        if Config.ENABLE_MOBILE_OTP and mobile:
            send_mobile_otp(mobile, otp_code, purpose="registration")

        logger.info("[OTP SERVICE - %s] Registration OTP dispatched via SMTP to %s", Config.ENVIRONMENT, clean_email)
        return True, {
            "success": True,
            "message": "Verification code sent successfully to your registered email.",
            "email": clean_email
        }, 200

    @classmethod
    def verify_registration_otp(cls, email: str, submitted_otp: str) -> Tuple[bool, Dict[str, Any], int]:
        """
        Verifies submitted OTP for registration, validates attempt counts,
        creates the user record in DB1 upon success, and returns JWT token.
        """
        clean_email = (email or "").strip().lower()
        clean_otp = str(submitted_otp or "").strip()

        record = OTPVerification.query.filter_by(email=clean_email).first()
        if not record:
            return False, {"success": False, "message": "No active registration session found. Please request a new code."}, 404

        current_time = get_ist_time()
        # Ensure datetimes are comparable
        exp_time = record.expires_at
        if exp_time.tzinfo is not None:
            exp_time = exp_time.astimezone(current_time.tzinfo)
        elif current_time.tzinfo is not None:
            current_time = current_time.replace(tzinfo=None)

        if current_time > exp_time:
            db.session.delete(record)
            db.session.commit()
            return False, {"success": False, "message": "Verification code has expired. Please request a new code."}, 400

        # Attempt tracking & rate-limiting protection
        record.attempts = (record.attempts or 0) + 1
        if record.attempts > MAX_OTP_ATTEMPTS:
            db.session.delete(record)
            db.session.commit()
            return False, {"success": False, "message": "Too many failed attempts. For security, please register again."}, 429

        # Verification code check (strictly dynamic OTP verification, no hardcoded bypass)
        is_valid = (record.otp_code == clean_otp)

        if not is_valid:
            db.session.commit()
            remaining = MAX_OTP_ATTEMPTS - record.attempts
            return False, {
                "success": False,
                "message": f"Invalid verification code. {remaining} attempt(s) remaining."
            }, 400

        # Verification Succeeded: Create User Account in DB1
        try:
            temp_data = json.loads(record.temporary_user_data or "{}")
        except Exception:
            temp_data = {}

        name = temp_data.get("name") or clean_email.split('@')[0]
        mobile = temp_data.get("mobile") or ""
        password_hash = temp_data.get("password_hash") or ""
        address_info = temp_data.get("address") or {}

        new_user = UserModel(
            name=name,
            username=clean_email,
            email=clean_email,
            mobile=mobile,
            password=password_hash,
            role="customer",
            is_admin=False,
            is_verified=True,
            is_email_verified=True
        )
        db.session.add(new_user)
        db.session.flush()

        # Save delivery address if supplied
        if address_info and any(address_info.values()):
            addr = DeliveryAddress(
                user_id=new_user.id,
                street=address_info.get("street") or "",
                city=address_info.get("city") or "",
                state=address_info.get("state") or "",
                zip_code=address_info.get("zip_code") or address_info.get("pincode") or "",
                country=address_info.get("country") or "India",
                is_default=True
            )
            db.session.add(addr)

        # Invalidate OTP verification record
        db.session.delete(record)
        db.session.commit()

        # Generate JWT Token
        payload = {
            "user_id": str(new_user.id),
            "id": str(new_user.id),
            "email": new_user.email,
            "role": new_user.role,
            "is_admin": False,
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        token = jwt.encode(payload, Config.get_jwt_secret(), algorithm="HS256")

        logger.info("[OTP SERVICE] User account created successfully for %s", clean_email)
        return True, {
            "success": True,
            "message": "Registration successful! Welcome to CraftNest.",
            "token": token,
            "user": new_user.to_dict()
        }, 201

    @classmethod
    def request_forgot_password_otp(cls, email_or_mobile: str) -> Tuple[bool, Dict[str, Any], int]:
        """
        Generates and dispatches forgot-password reset OTP.
        In DEV: Skips SMTP completely and returns dev_otp.
        In QA/PROD: Sends email via SMTP and never returns OTP.
        """
        raw_input = str(email_or_mobile or "").strip()
        clean_lower = raw_input.lower()

        # User lookup in DB1
        user_obj = UserModel.query.filter(
            (UserModel.email == clean_lower) |
            (UserModel.email == raw_input) |
            (UserModel.mobile == raw_input) |
            (UserModel.phone == raw_input)
        ).first()

        if not user_obj:
            return False, {"success": False, "message": "No account found with this email or mobile."}, 404

        # Rate limit checks for reset OTP
        is_allowed, is_blocked, block_msg = UserAttempt.check_and_record_otp_request(user_obj.id)
        if not is_allowed:
            return False, {
                "success": False,
                "message": block_msg or "Too many OTP requests. Please try again after 15 minutes."
            }, 429

        current_time = get_ist_time()
        OTPVerification.query.filter_by(email=user_obj.email).delete()
        OTPVerification.query.filter(OTPVerification.expires_at < current_time).delete()

        otp_code = cls._generate_code()
        expires_at = current_time + timedelta(minutes=OTP_EXPIRY_MINUTES)

        otp_record = OTPVerification(
            email=user_obj.email,
            otp_code=otp_code,
            expires_at=expires_at,
            is_verified=False,
            attempts=0,
            resend_attempts=0,
            user_id=user_obj.id
        )
        db.session.add(otp_record)
        db.session.commit()

        # ----------------------------------------------------------------------
        # 1. DEVELOPMENT ENVIRONMENT (No SMTP; Expose OTP for on-screen display)
        # ----------------------------------------------------------------------
        if Config.IS_DEV and Config.DEV_OTP_ENABLED:
            logger.info("[OTP SERVICE - DEV] Skipping SMTP. Exposing DEV Forgot Password OTP for %s", user_obj.email)
            print(f"[OTP SERVICE - DEV] Generated Password Reset OTP for {user_obj.email}: {otp_code}")
            return True, {
                "success": True,
                "message": "DEV MODE: Password reset code generated successfully.",
                "dev_otp": otp_code,
                "otp": otp_code,
                "email": user_obj.email,
                "environment": "development"
            }, 200

        # ----------------------------------------------------------------------
        # 2. QA & PRODUCTION ENVIRONMENTS (Real SMTP; NEVER Expose OTP)
        # ----------------------------------------------------------------------
        try:
            email_result = send_forgot_password_otp(user_obj.email, otp_code, name=user_obj.name)
        except Exception as smtp_err:
            logger.error("[OTP SERVICE - %s] SMTP Exception: %s", Config.ENVIRONMENT, smtp_err)
            db.session.delete(otp_record)
            db.session.commit()
            return False, {
                "success": False,
                "message": "We could not send the verification code right now. Please try again later."
            }, 500

        if not email_result:
            logger.error("[OTP SERVICE - %s] Failed to dispatch forgot-password email via SMTP.", Config.ENVIRONMENT)
            db.session.delete(otp_record)
            db.session.commit()
            return False, {
                "success": False,
                "message": "We could not send the verification code right now. Please try again later."
            }, 500

        logger.info("[OTP SERVICE - %s] Forgot Password OTP dispatched to %s", Config.ENVIRONMENT, user_obj.email)
        return True, {
            "success": True,
            "message": "Password reset code sent successfully to your registered email.",
            "email": user_obj.email
        }, 200

    @classmethod
    def verify_forgot_password_otp(cls, email: str, submitted_otp: str) -> Tuple[bool, Dict[str, Any], int]:
        """
        Verifies the reset OTP without resetting password yet (Step 2).
        """
        clean_email = (email or "").strip().lower()
        clean_otp = str(submitted_otp or "").strip()

        record = OTPVerification.query.filter_by(email=clean_email).first()
        if not record:
            return False, {"success": False, "message": "No active password reset session found."}, 404

        current_time = get_ist_time()
        exp_time = record.expires_at
        if exp_time.tzinfo is not None:
            exp_time = exp_time.astimezone(current_time.tzinfo)
        elif current_time.tzinfo is not None:
            current_time = current_time.replace(tzinfo=None)

        if current_time > exp_time:
            db.session.delete(record)
            db.session.commit()
            return False, {"success": False, "message": "Password reset code has expired. Please request a new code."}, 400

        record.attempts = (record.attempts or 0) + 1
        if record.attempts > MAX_OTP_ATTEMPTS:
            db.session.delete(record)
            db.session.commit()
            return False, {"success": False, "message": "Too many failed attempts. Please request a new code."}, 429

        is_valid = (record.otp_code == clean_otp)

        if not is_valid:
            db.session.commit()
            remaining = MAX_OTP_ATTEMPTS - record.attempts
            return False, {"success": False, "message": f"Invalid verification code. {remaining} attempt(s) remaining."}, 400

        record.is_verified = True
        db.session.commit()
        return True, {"success": True, "message": "Code verified. Please set your new password."}, 200

    @classmethod
    def reset_password_with_otp(cls, email: str, submitted_otp: str, new_password: str) -> Tuple[bool, Dict[str, Any], int]:
        """
        Verifies OTP and updates user's password in DB1 using bcrypt.
        """
        clean_email = (email or "").strip().lower()
        clean_otp = str(submitted_otp or "").strip()

        if not new_password or len(new_password) < 6:
            return False, {"success": False, "message": "Password must be at least 6 characters long."}, 400

        record = OTPVerification.query.filter_by(email=clean_email).first()
        if not record:
            return False, {"success": False, "message": "No active password reset session found."}, 404

        # Validate OTP
        is_valid = (record.otp_code == clean_otp) or (record.is_verified is True)

        if not is_valid:
            return False, {"success": False, "message": "Invalid verification code."}, 400

        user_obj = UserModel.query.filter_by(email=clean_email).first()
        if not user_obj:
            return False, {"success": False, "message": "User account not found."}, 404

        # Update password hash
        new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user_obj.password = new_hash
        user_obj.updated_at = datetime.utcnow()

        # Invalidate OTP record
        db.session.delete(record)
        db.session.commit()

        logger.info("[OTP SERVICE] Password successfully updated for %s", clean_email)
        return True, {"success": True, "message": "Password has been reset successfully. Please log in with your new password."}, 200


otp_service = OTPService()
