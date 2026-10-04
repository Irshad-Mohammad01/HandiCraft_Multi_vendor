"""
Production Environment Configuration (PROD)
-------------------------------------------
Live production environment with strict security checks, real SMTP,
and strictly isolated Neon PostgreSQL database.
NEVER exposes OTP on-screen, in API responses, or in logs.
"""

import os

class ProductionConfig:
    ENVIRONMENT = "PROD"
    ENV = "production"
    IS_DEV = False
    IS_QA = False
    IS_PROD = True
    IS_PRODUCTION = True

    # OTP & Email Behavior for Production
    DEV_OTP_ENABLED = False
    SMTP_ENABLED = True
    EMAIL_PROVIDER = "smtp"
    EXPOSE_OTP_IN_RESPONSE = False  # Strict security: NEVER exposed

    # Feature Flags
    ENABLE_PAYMENT = True
    ENABLE_SMS = True
    ENABLE_OTP = True
    ENABLE_EMAIL = True
    ENABLE_ORDER_CONFIRMATION = True
    ENABLE_EMAIL_FORGOT_PASSWORD_OTP = True
    ENABLE_EMAIL_ORDER_CONFIRMATION = True
    ENABLE_EMAIL_BUY_REQUEST_CONFIRMATION = True
    ENABLE_EMAIL_REGISTRATION_OTP = True
    ENABLE_MOBILE_OTP = True
    ENABLE_PUSH_NOTIFICATIONS = True
    ENABLE_WEBHOOKS = True
    ENABLE_ANALYTICS = True
    ENABLE_RAPID_API = True

    # Security & Cookie Settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "None"
    REMEMBER_COOKIE_SECURE = True
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SAMESITE = "None"
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_SAMESITE = "None"
    JWT_COOKIE_CSRF_PROTECT = False

    # Secrets (Must be supplied in environment variables)
    JWT_SECRET = os.environ.get("JWT_SECRET")
    SECRET_KEY = os.environ.get("SECRET_KEY")
    JWT_SECRET_KEY = JWT_SECRET

    # Logging
    LOGGING_LEVEL = os.environ.get("LOG_LEVEL") or "WARNING"
    SQLALCHEMY_ECHO = False
