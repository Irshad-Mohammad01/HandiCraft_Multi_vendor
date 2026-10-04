"""
Quality Assurance Environment Configuration (QA)
------------------------------------------------
Behaves like production with real SMTP and isolated staging database.
NEVER exposes OTP on-screen or in API responses.
"""

import os

class QAConfig:
    ENVIRONMENT = "QA"
    ENV = "qa"
    IS_DEV = False
    IS_QA = True
    IS_PROD = False
    IS_PRODUCTION = False

    # OTP & Email Behavior for QA
    DEV_OTP_ENABLED = False
    SMTP_ENABLED = True
    EMAIL_PROVIDER = "smtp"
    EXPOSE_OTP_IN_RESPONSE = False  # Strict security: NEVER exposed

    # Feature Flags
    ENABLE_PAYMENT = True
    ENABLE_SMS = False
    ENABLE_OTP = True
    ENABLE_EMAIL = True
    ENABLE_ORDER_CONFIRMATION = True
    ENABLE_EMAIL_FORGOT_PASSWORD_OTP = True
    ENABLE_EMAIL_ORDER_CONFIRMATION = True
    ENABLE_EMAIL_BUY_REQUEST_CONFIRMATION = True
    ENABLE_EMAIL_REGISTRATION_OTP = True
    ENABLE_MOBILE_OTP = False
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

    # Secrets
    JWT_SECRET = os.environ.get("JWT_SECRET") or "qa-craftnest-jwt-secret-staging-environment-2026"
    SECRET_KEY = os.environ.get("SECRET_KEY") or "qa-craftnest-flask-secret-staging-environment-2026"
    JWT_SECRET_KEY = JWT_SECRET

    # Logging
    LOGGING_LEVEL = os.environ.get("LOG_LEVEL") or "INFO"
    SQLALCHEMY_ECHO = False
