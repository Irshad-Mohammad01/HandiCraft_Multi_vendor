"""
CraftNest Centralized Multi-Environment Configuration
=====================================================
Supports three fully separated environments:
 1. DEVELOPMENT (DEV) - Local testing, SMTP disabled, DEV OTP exposed on-screen.
 2. QUALITY ASSURANCE (QA) - Staging isolation, real SMTP, OTP never exposed.
 3. PRODUCTION (PROD) - Live production, strict SSL, real SMTP, strict secrets.
"""

import os
import sys
from urllib.parse import urlparse, urlunparse
from dotenv import load_dotenv

# 1. Environment Detection & Loading
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Pre-read ENVIRONMENT from environment or base .env
temp_env = (
    os.environ.get("ENVIRONMENT")
    or os.environ.get("ENV")
    or os.environ.get("APP_ENV")
    or os.environ.get("FLASK_ENV")
    or ""
).strip().lower()

if not temp_env:
    base_env_path = os.path.join(_backend_dir, '.env')
    if os.path.exists(base_env_path):
        load_dotenv(base_env_path)
        temp_env = (os.environ.get("ENVIRONMENT") or "").strip().lower()

# Normalize environment identifier
if temp_env in ("development", "dev", "local"):
    ENV_NAME = "development"
    ENVIRONMENT = "DEV"
elif temp_env in ("qa", "staging", "testing", "test"):
    ENV_NAME = "qa"
    ENVIRONMENT = "QA"
elif temp_env in ("production", "prod", "live"):
    ENV_NAME = "production"
    ENVIRONMENT = "PROD"
else:
    ENV_NAME = "development"
    ENVIRONMENT = "DEV"

# Load environment-specific file: .env.development / .env.qa / .env.production
env_specific_file = os.path.join(_backend_dir, f".env.{ENV_NAME}")
if os.path.exists(env_specific_file):
    load_dotenv(env_specific_file, override=True)

# Fallback to standard .env
load_dotenv(os.path.join(_backend_dir, '.env'), override=False)
load_dotenv(override=False)

IS_DEV = (ENVIRONMENT == "DEV")
IS_QA = (ENVIRONMENT == "QA")
IS_PROD = (ENVIRONMENT == "PROD")
IS_PRODUCTION = IS_PROD

# Import Environment Specific Config Classes
from .development import DevelopmentConfig
from .qa import QAConfig
from .production import ProductionConfig

if IS_DEV:
    _ActiveEnvClass = DevelopmentConfig
elif IS_QA:
    _ActiveEnvClass = QAConfig
else:
    _ActiveEnvClass = ProductionConfig


# 2. CORS & Origins Resolution
def _normalize_origin(origin):
    normalized = str(origin or "").strip().rstrip("/")
    if normalized == "*":
        raise ValueError("Wildcard CORS origins are not allowed with credentials")
    return normalized

def get_allowed_origins(frontend_url=None, allowed_origins=None, environment=None):
    origins = []
    frontend_value = os.environ.get("FRONTEND_URL", "") if frontend_url is None else frontend_url
    allowed_value = os.environ.get("ALLOWED_ORIGINS", "") if allowed_origins is None else allowed_origins

    for configured_value in (frontend_value, allowed_value):
        for candidate in str(configured_value or "").split(","):
            origin = _normalize_origin(candidate)
            if origin and origin not in origins:
                origins.append(origin)

    active_environment = str(environment or ENVIRONMENT).strip().upper()
    dev_defaults = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5005",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5005"
    ]
    if active_environment not in ("PROD", "PRODUCTION"):
        for default_origin in dev_defaults:
            if default_origin not in origins:
                origins.append(default_origin)

    return origins

FRONTEND_URL = _normalize_origin(
    os.environ.get("FRONTEND_URL") or ("http://localhost:5173" if not IS_PROD else "https://craftnest.in")
)


# 3. Dynamic Database URI Resolution (DEV, QA, PROD)
sqlite_dev_path = os.path.join(_backend_dir, 'dev.db').replace('\\', '/')

def _clean_db_uri(uri):
    if not uri:
        return None
    val = str(uri).strip().strip("'\"")
    if val.startswith("psql "):
        val = val[5:].strip().strip("'\"")
    if val.startswith("postgres://"):
        val = "postgresql+psycopg2://" + val[11:]
    elif val.startswith("postgresql://"):
        val = "postgresql+psycopg2://" + val[13:]
    return val if val else None

def mask_db_url(url):
    """Mask database passwords in connection URLs for safe logging without leaking secrets."""
    if not url:
        return "None"
    try:
        parsed = urlparse(str(url))
        if parsed.password:
            netloc = parsed.netloc.replace(f":{parsed.password}@", ":*****@")
            return urlunparse(parsed._replace(netloc=netloc))
        return str(url)
    except Exception:
        return "Configured"

# Resolve Owner Database URL from environment variables
_owner_db_candidates = (
    os.environ.get("NEON_OWNER_DATABASE_URL")
    or os.environ.get("OWNER_DATABASE_URL")
    or (os.environ.get("DEV_DATABASE_URL") if ENVIRONMENT == "DEV" else None)
    or (os.environ.get("QA_DATABASE_URL") if ENVIRONMENT == "QA" else None)
    or (os.environ.get("PROD_DATABASE_URL") if ENVIRONMENT == "PROD" else None)
    or os.environ.get("DATABASE_URL")
    or os.environ.get("DATABASE_URI")
)

if _owner_db_candidates:
    raw_uri = _clean_db_uri(_owner_db_candidates)
elif ENVIRONMENT in ("DEV", "QA"):
    raw_uri = f"sqlite:///{sqlite_dev_path}"
else:
    raw_uri = None

OWNER_DATABASE_URL = raw_uri


# 4. Multi-Database Dynamic Resolution for Sellers (DB2, DB3, DB4...)
def get_seller_database_url_from_env(database_id):
    """
    Dynamically resolve the connection URL for any seller database identifier (e.g. 'DB2', 'DB3', '2', '3').
    Reads strictly from environment variables without hardcoded credentials.
    """
    if not database_id:
        return None
    db_str = str(database_id).strip().upper()
    candidates = []

    # Extract numeric identifier if present
    num = None
    if db_str.startswith("DB") and db_str[2:].isdigit():
        num = db_str[2:]
    elif db_str.isdigit():
        num = db_str
    elif "SELLER" in db_str:
        digits = "".join([c for c in db_str if c.isdigit()])
        if digits:
            num = digits

    if num:
        candidates.extend([
            f"NEON_SELLER_{num}_DATABASE_URL",
            f"NEON_SELLER{num}_DATABASE_URL",
            f"SELLER_DATABASE_URL_{num}",
            f"SELLER_{num}_DATABASE_URL",
            f"DB_{num}_DATABASE_URL",
            f"DB{num}_DATABASE_URL",
            f"DATABASE_URL_DB{num}",
        ])

    # Direct match (e.g. if the full env key name was passed)
    candidates.append(db_str)

    for candidate in candidates:
        val = os.environ.get(candidate)
        if val and str(val).strip():
            clean_val = _clean_db_uri(val)
            if clean_val and OWNER_DATABASE_URL and clean_val == OWNER_DATABASE_URL:
                # Disallow reusing DB1 credentials for an isolated seller database
                return None
            if clean_val:
                return clean_val

    return None


def _get_bool_env(var_name, default_bool):
    val = os.environ.get(var_name)
    if val is None:
        return default_bool
    return str(val).strip().lower() in ("true", "1", "yes", "on", "enabled")


# Engine options: SQLite's NullPool does not support pool_size or max_overflow
_engine_opts = {
    "pool_pre_ping": True,
    "pool_recycle": 280,
}
if raw_uri and not raw_uri.startswith("sqlite"):
    _engine_opts.update({
        "pool_timeout": 30,
        "pool_size": 10,
        "max_overflow": 5,
    })


# 5. Centralized Master Config Class
class Config(_ActiveEnvClass):
    ENVIRONMENT = ENVIRONMENT
    ENV = ENV_NAME
    IS_DEV = IS_DEV
    IS_QA = IS_QA
    IS_PROD = IS_PROD
    IS_PRODUCTION = IS_PROD
    FRONTEND_URL = FRONTEND_URL

    # Database
    SQLALCHEMY_DATABASE_URI = raw_uri
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = _engine_opts

    # Secrets resolution
    JWT_SECRET = os.environ.get("JWT_SECRET") or _ActiveEnvClass.JWT_SECRET or "craftnest-production-jwt-token-secret-2026"
    SECRET_KEY = os.environ.get("SECRET_KEY") or _ActiveEnvClass.SECRET_KEY or JWT_SECRET or "craftnest-production-flask-secret-2026"
    JWT_SECRET_KEY = JWT_SECRET

    @classmethod
    def get_jwt_secret(cls):
        return os.environ.get("JWT_SECRET") or cls.JWT_SECRET

    # Feature Flags Overrides
    ENABLE_PAYMENT = _get_bool_env("ENABLE_PAYMENT", _ActiveEnvClass.ENABLE_PAYMENT)
    ENABLE_SMS = _get_bool_env("ENABLE_SMS", _ActiveEnvClass.ENABLE_SMS)
    ENABLE_OTP = _get_bool_env("ENABLE_OTP", _ActiveEnvClass.ENABLE_OTP)
    ENABLE_EMAIL = _get_bool_env("ENABLE_EMAIL", _ActiveEnvClass.ENABLE_EMAIL)
    DEV_OTP_ENABLED = _get_bool_env("DEV_OTP_ENABLED", _ActiveEnvClass.DEV_OTP_ENABLED)
    SMTP_ENABLED = _get_bool_env("SMTP_ENABLED", _ActiveEnvClass.SMTP_ENABLED)
    EXPOSE_OTP_IN_RESPONSE = IS_DEV and _get_bool_env("DEV_OTP_ENABLED", _ActiveEnvClass.DEV_OTP_ENABLED)

    # SMTP Configuration
    SMTP_HOST = os.environ.get("SMTP_HOST") or "smtp.gmail.com"
    SMTP_PORT = int(os.environ.get("SMTP_PORT") or 587)
    SMTP_TLS = True
    SMTP_EMAIL = (
        os.environ.get("SMTP_USERNAME")
        or os.environ.get("SMTP_EMAIL")
        or os.environ.get("MAIL_USERNAME")
        or os.environ.get("EMAIL_ADDRESS")
        or ("" if IS_DEV else "craftnest.system@gmail.com")
    )
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD") or os.environ.get("MAIL_PASSWORD")
    SMTP_FROM = (
        os.environ.get("SMTP_FROM_EMAIL")
        or os.environ.get("SMTP_FROM")
        or (f"CraftNest <{SMTP_EMAIL}>" if SMTP_EMAIL else None)
    )

    # Flask-Mail Compatibility
    MAIL_SERVER = SMTP_HOST
    MAIL_PORT = SMTP_PORT
    MAIL_USE_TLS = SMTP_TLS
    MAIL_USE_SSL = os.environ.get("MAIL_USE_SSL", "False").lower() in ("true", "1", "yes")
    MAIL_USERNAME = SMTP_EMAIL
    MAIL_PASSWORD = SMTP_PASSWORD
    MAIL_DEFAULT_SENDER = SMTP_FROM

    # Upload & Reporting
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_CONTENT_LENGTH", 100 * 1024 * 1024))
    REPORT_SCHEDULER_ENABLED = _get_bool_env("REPORT_SCHEDULER_ENABLED", False)

    # Payment Gateway Credentials (Razorpay)
    if IS_DEV:
        RAZORPAY_KEY_ID = None
        RAZORPAY_KEY_SECRET = None
    elif IS_QA:
        RAZORPAY_KEY_ID = os.environ.get("QA_RAZORPAY_KEY_ID") or os.environ.get("RAZORPAY_KEY_ID")
        RAZORPAY_KEY_SECRET = os.environ.get("QA_RAZORPAY_KEY_SECRET") or os.environ.get("RAZORPAY_KEY_SECRET")
    else:
        RAZORPAY_KEY_ID = os.environ.get("PROD_RAZORPAY_KEY_ID") or os.environ.get("RAZORPAY_KEY_ID")
        RAZORPAY_KEY_SECRET = os.environ.get("PROD_RAZORPAY_KEY_SECRET") or os.environ.get("RAZORPAY_KEY_SECRET")

    # Cloudinary Storage Configuration
    CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME") or os.environ.get(f"{ENVIRONMENT}_CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY") or os.environ.get(f"{ENVIRONMENT}_CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET") or os.environ.get(f"{ENVIRONMENT}_CLOUDINARY_API_SECRET")

    # RapidAPI & Mobile OTP
    ENABLE_RAPID_API = _get_bool_env("ENABLE_RAPID_API", True)
    RAPID_API_KEY = os.environ.get("RAPID_API_KEY") or os.environ.get(f"{ENVIRONMENT}_RAPID_API_KEY")
    ENABLE_MOBILE_OTP = _get_bool_env("ENABLE_MOBILE_OTP", False)
    MOBILE_OTP_PROVIDER = (os.environ.get("MOBILE_OTP_PROVIDER") or "disabled").strip().lower()

    # OAuth Credentials
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
    MICROSOFT_CLIENT_ID = os.environ.get("MICROSOFT_CLIENT_ID")
    MICROSOFT_CLIENT_SECRET = os.environ.get("MICROSOFT_CLIENT_SECRET")

    # Logging
    LOGGING_LEVEL = os.environ.get("LOG_LEVEL") or _ActiveEnvClass.LOGGING_LEVEL


# 6. Startup Environment Validation
def validate_smtp_configuration():
    if not Config.SMTP_ENABLED:
        print(f"[SMTP SYSTEM] SMTP is disabled in {ENVIRONMENT} mode (DEV_OTP_ENABLED={Config.DEV_OTP_ENABLED}).")
        return

    smtp_email = Config.SMTP_EMAIL
    smtp_password = Config.SMTP_PASSWORD
    missing_items = []
    if not smtp_email:
        missing_items.append("SMTP_USERNAME / SMTP_EMAIL")
    if not smtp_password:
        missing_items.append("SMTP_PASSWORD")

    if missing_items:
        print("\n" + "="*70)
        print(f" [SMTP CONFIGURATION NOTICE - {ENVIRONMENT}] Missing SMTP credentials:")
        for item in missing_items:
            print(f"   - {item}")
        print(" Live email transmission via SMTP will fail until credentials are provided.")
        print("="*70 + "\n")
    else:
        print(f"[SMTP SUCCESS] SMTP runtime configuration validated for {ENVIRONMENT}.")


def validate_environment():
    masked_db = mask_db_url(Config.SQLALCHEMY_DATABASE_URI)

    print("\n" + "="*75)
    print(f" [CRAFTNEST ENVIRONMENT] Active Environment: {ENVIRONMENT}")
    print(f" [DATABASE] DB1 Target: {masked_db}")
    print(f" [OTP ARCHITECTURE] DEV_OTP_ENABLED={Config.DEV_OTP_ENABLED} | SMTP_ENABLED={Config.SMTP_ENABLED}")
    print(f" [FRONTEND TARGET] {Config.FRONTEND_URL}")
    print("="*75 + "\n")

    validate_smtp_configuration()

    if IS_DEV:
        return
    if IS_QA:
        return

    # Production Strict Checks
    missing = []
    invalid = []

    env_frontend = os.environ.get("FRONTEND_URL")
    if not env_frontend:
        print(f" [NOTICE] FRONTEND_URL not set in environment; using default: {Config.FRONTEND_URL}")
    elif "localhost" in env_frontend or "127.0.0.1" in env_frontend:
        if not os.environ.get("RENDER"):
            invalid.append("FRONTEND_URL cannot point to localhost/127.0.0.1 in production mode")

    env_db = Config.SQLALCHEMY_DATABASE_URI
    if not env_db:
        missing.append("NEON_OWNER_DATABASE_URL / OWNER_DATABASE_URL / DATABASE_URL / PROD_DATABASE_URL")
    else:
        parsed_db = urlparse(env_db)
        if parsed_db.scheme not in ("postgresql", "postgresql+psycopg2"):
            invalid.append("Production database URL must use PostgreSQL")
        if parsed_db.hostname and parsed_db.hostname.endswith("neon.tech"):
            sslmode = dict(part.split("=", 1) for part in parsed_db.query.split("&") if "=" in part).get("sslmode")
            if sslmode not in ("require", "verify-ca", "verify-full"):
                invalid.append("Neon PostgreSQL connections must require SSL")

    if not Config.JWT_SECRET:
        missing.append("JWT_SECRET")
    if not Config.SECRET_KEY:
        missing.append("SECRET_KEY")

    if missing or invalid:
        err_lines = [
            "\n" + "="*75,
            " [CRITICAL DEPLOYMENT SAFETY FAILURE] Production Environment Validation Error!",
            "="*75
        ]
        if missing:
            err_lines.append(" Missing Required Production Environment Variables:")
            for m in missing:
                err_lines.append(f"   - {m}")
        if invalid:
            err_lines.append(" Invalid Production Configuration:")
            for inv in invalid:
                err_lines.append(f"   - {inv}")
        err_lines.append("="*75 + "\n")
        error_msg = "\n".join(err_lines)
        print(error_msg)
        raise RuntimeError(error_msg)
