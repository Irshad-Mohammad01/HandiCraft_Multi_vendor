import os
import sys

# Add parent directory to sys.path to enable backend package resolution
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from flask import Flask, jsonify, request
from dotenv import load_dotenv

# Load configuration first
load_dotenv(os.path.join(current_dir, '.env'))
load_dotenv()

# Global safe print patch to prevent OSError [Errno 5] Input/output error
# when running in background with closed standard streams
import builtins
import sys
_original_print = builtins.print
def safe_print(*args, **kwargs):
    try:
        _original_print(*args, **kwargs)
    except Exception:
        try:
            sys.stderr.write(" ".join(map(str, args)) + "\n")
            sys.stderr.flush()
        except Exception:
            pass
builtins.print = safe_print

import logging
from backend.extensions import db, migrate, mail
from backend.config import Config, validate_environment, FRONTEND_URL
from backend.cors import configure_cors
from backend.models import TransactionModel
from backend.routes.auth import auth_bp
from backend.routes.products import products_bp
from backend.routes.orders import orders_bp
from backend.routes.admin import admin_bp
from backend.routes.support import support_bp
from backend.routes.coupons import coupons_bp
from backend.routes.banners import banners_bp
from backend.routes.category_banners import category_banners_bp
from backend.routes.collection_banners import collection_banners_bp
from backend.routes.collections import collections_bp
from backend.routes.maintenance import maintenance_bp
from backend.routes.high_demand import high_demand_bp
from backend.routes.payments import payments_bp
from backend.routes.lookbook import lookbook_bp
from backend.routes.invoices import invoices_bp
from backend.middleware.maintenance import check_maintenance_mode

# Run startup environment validation
validate_environment()

app = Flask(__name__)
# Load configuration
app.config.from_object(Config)

# Enable ProxyFix for reliable environment proxy header processing (Render, Oracle Cloud, Nginx)
from werkzeug.middleware.proxy_fix import ProxyFix
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)

# Configure Python logging based on active environment LOGGING_LEVEL
log_level = getattr(logging, str(Config.LOGGING_LEVEL).upper(), logging.INFO)
logging.basicConfig(level=log_level, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
app.logger.setLevel(log_level)

# Enable CORS for frontend requests with exact environment-aware origins
allowed_origins_list = configure_cors(app)
app.logger.warning(
    "[CORS] Environment=%s Allowed origins=%s",
    Config.ENVIRONMENT,
    allowed_origins_list,
)

import gzip
import io

@app.after_request
def compress_response(response):
    if Config.IS_PROD and response.status_code >= 500:
        response.set_data('{"success":false,"message":"Internal server error."}')
        response.content_type = 'application/json'

    # Gzip response payload compression for text/JSON responses
    if (
        response.status_code >= 200
        and response.status_code < 300
        and 'Content-Encoding' not in response.headers
        and not response.direct_passthrough
    ):
        accept_encoding = request.headers.get('Accept-Encoding', '')
        if 'gzip' in accept_encoding.lower():
            mimetype = response.mimetype or ''
            if any(t in mimetype for t in ['application/json', 'text/html', 'text/css', 'text/javascript', 'application/javascript']):
                response_data = response.get_data()
                if len(response_data) >= 500:
                    gzip_buffer = io.BytesIO()
                    with gzip.GzipFile(mode='wb', fileobj=gzip_buffer) as gzip_file:
                        gzip_file.write(response_data)
                    compressed_data = gzip_buffer.getvalue()
                    response.set_data(compressed_data)
                    response.headers['Content-Encoding'] = 'gzip'
                    response.headers['Content-Length'] = len(compressed_data)
                    response.headers['Vary'] = 'Accept-Encoding'

    return response

# Allow flexible trailing slashes across all blueprint routes
app.url_map.strict_slashes = False

# Register before_request maintenance middleware handler
app.before_request(check_maintenance_mode)

# Initialize extensions
try:
    db.init_app(app)
except Exception as db_init_err:
    from backend.config import mask_db_url
    print(f"\n{'='*75}")
    print(f" [DATABASE INIT ERROR] Failed to initialize database: {db_init_err}")
    print(f" [DATABASE URI]: {mask_db_url(app.config.get('SQLALCHEMY_DATABASE_URI'))}")
    print(f" [ENGINE OPTIONS]: {app.config.get('SQLALCHEMY_ENGINE_OPTIONS')}")
    print(f"{'='*75}\n")
    raise
migrate.init_app(app, db)
mail.init_app(app)

# Register API blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(products_bp, url_prefix='/api/products')
app.register_blueprint(orders_bp, url_prefix='/api/orders')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(payments_bp, url_prefix='/api/admin/payments')
app.register_blueprint(support_bp, url_prefix='/api/support')
app.register_blueprint(coupons_bp, url_prefix='/api/coupons')
app.register_blueprint(banners_bp, url_prefix='/api/banners')
app.register_blueprint(category_banners_bp, url_prefix='/api/category-banners')
app.register_blueprint(collection_banners_bp, url_prefix='/api/collection-banners')
app.register_blueprint(collections_bp, url_prefix='/api/collections')
app.register_blueprint(maintenance_bp, url_prefix='/api/maintenance')
app.register_blueprint(high_demand_bp, url_prefix='/api/high-demand')
app.register_blueprint(lookbook_bp, url_prefix='/api/lookbook')
app.register_blueprint(lookbook_bp, url_prefix='/api/lookbooks', name='lookbooks')
app.register_blueprint(invoices_bp, url_prefix='/api/invoices')

def print_registered_routes(app_instance):
    """Prints all registered routes at app startup for production route visibility."""
    with app_instance.app_context():
        routes_log = ["=== REGISTERED FLASK ROUTES AT STARTUP ==="]
        for rule in app_instance.url_map.iter_rules():
            methods = ','.join(sorted(rule.methods - {'HEAD', 'OPTIONS'}))
            routes_log.append(f"  {methods:10s} {rule.rule:45s} -> {rule.endpoint}")
        routes_log.append("============================================")
        full_log = "\n".join(routes_log)
        app_instance.logger.info(full_log)
        print(full_log)

print_registered_routes(app)




from backend.utils.helpers import generate_otp, verify_otp, is_valid_email
from backend.models.user import UserModel

@app.route('/api/send-otp', methods=['POST'])
def root_send_otp():
    data = request.get_json() or {}
    identifier = data.get("identifier") or data.get("mobile") or data.get("email")
    if not identifier:
        return jsonify({"message": "Please provide identifier, mobile, or email.", "success": False}), 400
        
    otp = generate_otp(identifier)
    
    # Placeholder for MSG91 / real SMS service integration
    # When switching to production later, replace this print/email flow with actual MSG91 SDK call
    # In DEV mode: Never call SMTP; expose dev_otp for development testing
    if Config.IS_DEV and Config.DEV_OTP_ENABLED:
        return jsonify({
            "message": "DEV MODE: OTP generated successfully.",
            "success": True,
            "dev_otp": otp,
            "otp": otp
        }), 200
    
    # In QA & PROD: Send email via SMTP if enabled
    if Config.SMTP_ENABLED and is_valid_email(identifier):
        try:
            from backend.utils.email_service import send_email
            subject = "Your CraftNest Verification Code"
            body_html = f"""
            <html>
                <body>
                    <h2>Verification Code</h2>
                    <p>Hello,</p>
                    <p>Your OTP verification code for CraftNest is: <strong>{otp}</strong></p>
                    <p>This code will expire in 5 minutes.</p>
                    <p>Thank you for choosing CraftNest!</p>
                </body>
            </html>
            """
            send_email(identifier, subject, body_html)
        except Exception as e:
            app.logger.error("Failed to send email OTP: %s", e)
            
    return jsonify({
        "message": "OTP sent successfully! Please check your email.",
        "success": True
    }), 200

@app.route('/api/verify-otp', methods=['POST'])
def root_verify_otp():
    data = request.get_json() or {}
    identifier = data.get("identifier") or data.get("mobile") or data.get("email")
    otp = data.get("otp")
    
    if not identifier or not otp:
        return jsonify({"message": "Please provide both identifier/mobile/email and OTP.", "success": False}), 400
        
    success = verify_otp(identifier, otp)
    if not success:
        return jsonify({"message": "Invalid or expired OTP. Please try again.", "success": False}), 400
        
    # Mark user as verified if they exist
    user = UserModel.query.filter((UserModel.mobile == identifier) | (UserModel.email == identifier)).first()
    if user:
        try:
            user.is_verified = True
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print("Failed to update user is_verified status:", e)
            
    return jsonify({
        "message": "OTP verified successfully!",
        "success": True
    }), 200

# Ensure static upload directory is served with long-term browser caching
@app.route('/static/uploads/<path:filename>')
def serve_uploads(filename):
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
    from flask import send_from_directory
    res = send_from_directory(upload_dir, filename)
    res.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    return res

@app.errorhandler(404)
def not_found(error):
    from flask import request
    path = request.path
    if path.startswith('/api/'):
        env_mode = os.getenv("CONFIG_ENV", "development").lower()
        debug_info = {
            "message": f"404 Route Missing: API endpoint '{path}' not found.",
            "requested_url": path,
            "status": 404,
            "error_type": "Route Missing or Blueprint Not Registered"
        }
        if env_mode in ['dev', 'development', 'local']:
            debug_info["dev_hint"] = "Verify blueprint registration in backend/app.py and route mappings."
        return jsonify(debug_info), 404
    return jsonify({"message": "API endpoint not found!", "status": 404}), 404


@app.errorhandler(500)
def server_error(error):
    logging.error(f"[GLOBAL 500 ERROR] Internal server error: {error}", exc_info=True)
    return jsonify({"success": False, "message": "Internal server error."}), 500

@app.errorhandler(Exception)
def handle_uncaught_exception(error):
    logging.error(f"[UNCAUGHT EXCEPTION] Unhandled exception occurred: {error}", exc_info=True)
    return jsonify({"success": False, "message": "An unexpected server error occurred."}), 500

@app.get('/health')
def health():
    return jsonify({"status": "healthy"}), 200

@app.get('/ready')
def ready():
    try:
        db.session.execute(db.text("SELECT 1"))
        return jsonify({"status": "ready"}), 200
    except Exception:
        db.session.rollback()
        app.logger.warning("Database readiness check failed", exc_info=True)
        return jsonify({"status": "not ready"}), 503

def seed_database():
    """
    Optional development-only helper. Production uses live Neon PostgreSQL data.
    """
    pass


@app.cli.command('bootstrap-dev')
def bootstrap_dev():
    """Explicit local-only schema bootstrap and seed command."""
    if Config.IS_PROD:
        raise RuntimeError("bootstrap-dev is disabled in production; use Alembic migrations")
    db.create_all()
    seed_database()

@app.cli.command('run-report-scheduler')
def run_report_scheduler():
    """Run reporting in a dedicated process when explicitly enabled."""
    if not Config.REPORT_SCHEDULER_ENABLED:
        raise RuntimeError("Set REPORT_SCHEDULER_ENABLED=true to run the scheduler")
    from backend.utils.report_automation import start_report_scheduler
    thread = start_report_scheduler(app)
# Customer Notification route aliases (/api/notifications -> /api/auth/notifications)
from backend.routes.auth import get_notifications, read_notification, read_all_notifications, clear_read_notifications

@app.route('/api/notifications', methods=['GET'])
def alias_get_notifications():
    return get_notifications()

@app.route('/api/notifications/<notification_id>/read', methods=['PUT'])
def alias_read_notification(notification_id):
    return read_notification(notification_id=notification_id)

@app.route('/api/notifications/read-all', methods=['PUT'])
def alias_read_all_notifications():
    return read_all_notifications()

@app.route('/api/notifications/clear-read', methods=['DELETE'])
def alias_clear_read_notifications():
    return clear_read_notifications()

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5005))
    app.run(host='0.0.0.0', port=port, debug=False)
