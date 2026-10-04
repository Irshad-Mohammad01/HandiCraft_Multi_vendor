"""
Development Environment Configuration (DEV)
-------------------------------------------
Configured for rapid local development and testing.
DEV MUST NOT depend on SMTP. Exposes OTP on-screen in DEV mode.
"""

import os

class DevelopmentConfig:
    ENVIRONMENT = "DEV"
    ENV = "development"
    IS_DEV = True
    IS_QA = False
    IS_PROD = False
    IS_PRODUCTION = False

    # OTP & Email Behavior for DEV
    DEV_OTP_ENABLED = True
    SMTP_ENABLED = False
    EMAIL_PROVIDER = "console"
    EXPOSE_OTP_IN_RESPONSE = True  # Used to render DEV OTP in UI

    # Feature Flags
    ENABLE_PAYMENT = False
    ENABLE_SMS = False
    ENABLE_OTP = True
    ENABLE_EMAIL = False
    ENABLE_ORDER_CONFIRMATION = True
    ENABLE_EMAIL_FORGOT_PASSWORD_OTP = False
    ENABLE_EMAIL_ORDER_CONFIRMATION = False
    ENABLE_EMAIL_BUY_REQUEST_CONFIRMATION = False
    ENABLE_EMAIL_REGISTRATION_OTP = False
    ENABLE_MOBILE_OTP = False
    ENABLE_PUSH_NOTIFICATIONS = False
    ENABLE_WEBHOOKS = False
    ENABLE_ANALYTICS = False
    ENABLE_RAPID_API = True

    # Security & Cookie Settings (Local Dev Relaxed)
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    REMEMBER_COOKIE_SECURE = False
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SAMESITE = "Lax"
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_COOKIE_CSRF_PROTECT = False

    # Secrets
    JWT_SECRET = os.environ.get("JWT_SECRET") or "dev-craftnest-jwt-secret-key-local-testing-2026"
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-craftnest-flask-secret-key-local-testing-2026"
    JWT_SECRET_KEY = JWT_SECRET

    # Logging
    LOGGING_LEVEL = os.environ.get("LOG_LEVEL") or "DEBUG"
    SQLALCHEMY_ECHO = False
