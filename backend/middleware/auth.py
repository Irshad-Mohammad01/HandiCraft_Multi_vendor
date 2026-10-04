from functools import wraps
import logging
from flask import request, jsonify
import jwt
from backend.models.user import UserModel
from backend.models.admin import AdminModel
from backend.config import Config

logger = logging.getLogger(__name__)

def is_admin_role(data):
    """
    Check an explicit role/admin field from a trusted database record.
    """
    if not data or not isinstance(data, dict):
        return False
    
    # Check boolean or truthy is_admin flag
    is_admin_flag = data.get("is_admin")
    if is_admin_flag is True or str(is_admin_flag).strip().lower() in ("true", "1", "yes"):
        return True
        
    # Check role string (case-insensitive)
    role = str(data.get("role") or "").strip().lower()
    if role in ("admin", "superadmin", "super_admin", "super admin", "owner", "master", "sub_owner", "subowner"):
        return True
        
    return False

def extract_bearer_token():
    """
    Extract token from headers, cookies, query parameters, or WSGI environment cleanly.
    Filters out invalid string literals like 'null' or 'undefined'.
    Guarantees cross-environment reliability behind reverse proxies (Render, Oracle Cloud, Nginx, Cloudflare).
    """
    token = None

    # 1. Header: Authorization / authorization
    auth_header = request.headers.get('Authorization') or request.headers.get('authorization')
    if auth_header:
        auth_header = str(auth_header).strip()
        if auth_header.lower().startswith('bearer '):
            token = auth_header[7:].strip()
        elif auth_header:
            token = auth_header

    # 2. Header: Custom Auth headers (in case Authorization header is stripped by proxy)
    if not token or token.lower() in ("null", "undefined", "none", "\"null\"", "\"undefined\""):
        token = request.headers.get('X-Access-Token') or request.headers.get('X-Auth-Token') or request.headers.get('X-Admin-Token')

    # 3. WSGI Environment HTTP_AUTHORIZATION
    if not token or token.lower() in ("null", "undefined", "none", "\"null\"", "\"undefined\""):
        http_auth = request.environ.get('HTTP_AUTHORIZATION')
        if http_auth:
            http_auth = str(http_auth).strip()
            if http_auth.lower().startswith('bearer '):
                token = http_auth[7:].strip()
            else:
                token = http_auth

    # 4. Cookie: bb_token / token / admin_token
    if not token or token.lower() in ("null", "undefined", "none", "\"null\"", "\"undefined\""):
        token = request.cookies.get('bb_token') or request.cookies.get('token') or request.cookies.get('admin_token')

    if token:
        token = str(token).strip()
        if token.lower() not in ("null", "undefined", "none", "\"null\"", "\"undefined\"") and len(token) > 10:
            return token

    return None

def decode_jwt_token(token):
    """
    Verify signature, fixed algorithm, expiration, and an expected identity claim.
    """
    if not token:
        return None, "missing"

    jwt_secret = Config.get_jwt_secret()

    # Tier 1: Decode using primary dynamic secret
    try:
        data = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            options={"require": ["exp"]},
        )
        if not any(data.get(claim) for claim in ("user_id", "admin_id", "id")):
            return None, "claims"
        return data, None
    except jwt.ExpiredSignatureError:
        return None, "expired"
    except jwt.InvalidTokenError:
        return None, "invalid"

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(None, *args, **kwargs)
            
        token = extract_bearer_token()
        if not token:
            logger.warning("[AUTH_FAILURE_401] Path=%s | Method=%s | TokenPresent=False | Reason='Bearer token missing' | Endpoint=%s",
                           request.path, request.method, request.endpoint)
            return jsonify({"message": "Authentication token is missing!"}), 401
        
        data, err = decode_jwt_token(token)
        if err == "expired":
            logger.warning("[AUTH_FAILURE_401] Path=%s | Method=%s | TokenPresent=True | Reason='JWT ExpiredSignatureError' | Endpoint=%s",
                           request.path, request.method, request.endpoint)
            return jsonify({"message": "Token has expired! Please login again."}), 401
        elif err or not data:
            logger.warning("[AUTH_FAILURE_401] Path=%s | Method=%s | TokenPresent=True | Reason='Invalid JWT Signature/Format' | Endpoint=%s",
                           request.path, request.method, request.endpoint)
            return jsonify({"message": "Invalid token! Please login again."}), 401

        user_id = data.get("user_id") or data.get("admin_id") or data.get("id")
        
        if data.get("admin_id"):
            admin_obj = None
            if user_id and str(user_id).isdigit():
                admin_obj = AdminModel.query.get(int(user_id))
            if admin_obj:
                current_user = {
                    "_id": str(admin_obj.id),
                    "id": str(admin_obj.id),
                    "name": admin_obj.username,
                    "username": admin_obj.username,
                    "is_admin": True,
                    "role": "admin"
                }
            else:
                current_user = None
        else:
            current_user = UserModel.find_by_id(user_id) if user_id else None
            
        if not current_user:
            logger.warning("[AUTH_FAILURE_401] User/Admin record not found | Path=%s | UserID=%s", request.path, user_id)
            return jsonify({"message": "User not found or disabled!"}), 401

        if isinstance(current_user, dict) and current_user.get("is_blocked"):
            logger.warning("[AUTH_FAILURE_403] Account blocked | Path=%s | UserID=%s", request.path, user_id)
            return jsonify({"message": "Your account has been suspended by the administrator."}), 403

        return f(current_user, *args, **kwargs)
        
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        token = extract_bearer_token()
        if not token:
            logger.warning("[ADMIN_AUTH_FAILURE_401] Path=%s | Method=%s | TokenPresent=False | Reason='Bearer token missing' | Headers=%s",
                           request.path, request.method, list(request.headers.keys()))
            return jsonify({"message": "Authentication token is missing!"}), 401
            
        data, err = decode_jwt_token(token)
        if err == "expired":
            logger.warning("[ADMIN_AUTH_FAILURE_401] Path=%s | Method=%s | TokenPresent=True | Reason='Admin token expired'", request.path, request.method)
            return jsonify({"message": "Admin session expired. Please log in again."}), 401
        elif err or not data:
            logger.warning("[ADMIN_AUTH_FAILURE_401] Path=%s | Method=%s | TokenPresent=True | Reason='Invalid Token Signature/Format'", request.path, request.method)
            return jsonify({"message": "Access denied! Invalid authentication token."}), 401

        user_id = data.get("user_id") or data.get("admin_id") or data.get("id")

        # Authorization is derived only from the authenticated database record.
        import inspect
        sig = inspect.signature(f)

        admin_obj = None
        if data.get("admin_id") and user_id and str(user_id).isdigit():
            admin_obj = AdminModel.query.get(int(user_id))
            
        if admin_obj:
            logger.info("[ADMIN_AUTH_SUCCESS] Authorized Path=%s | Method=%s | AdminID=%s (AdminModel DB)", request.path, request.method, admin_obj.id)
            admin_dict = {
                "_id": str(admin_obj.id),
                "id": str(admin_obj.id),
                "name": admin_obj.username,
                "username": admin_obj.username,
                "is_admin": True,
                "role": "owner"
            }
            if 'current_user' in sig.parameters and 'current_user' not in kwargs:
                return f(admin_dict, *args, **kwargs)
            return f(*args, **kwargs)

        if (data.get("user_id") or data.get("id")) and not data.get("admin_id") and user_id:
            current_user = UserModel.find_by_id(user_id)
            if current_user and is_admin_role(current_user):
                logger.info("[ADMIN_AUTH_SUCCESS] Authorized Path=%s | Method=%s | UserID=%s (UserModel DB)", request.path, request.method, user_id)
                if 'current_user' in sig.parameters and 'current_user' not in kwargs:
                    return f(current_user, *args, **kwargs)
                return f(*args, **kwargs)

        logger.warning("[ADMIN_AUTH_FAILURE_403] Path=%s | Method=%s | TokenPresent=True | Reason='Insufficient admin privileges' | UserID=%s",
                       request.path, request.method, user_id)
        return jsonify({"message": "Access denied! Admin privileges required."}), 403
        
    return decorated

def owner_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        token = extract_bearer_token()
        if not token:
            return jsonify({"message": "Authentication token is missing!"}), 401
        data, err = decode_jwt_token(token)
        if err or not data:
            return jsonify({"message": "Access denied! Invalid authentication token."}), 401
        user_id = data.get("user_id") or data.get("admin_id") or data.get("id")
        if data.get("admin_id") and user_id and str(user_id).isdigit():
            admin_obj = AdminModel.query.get(int(user_id))
            if admin_obj:
                return f(*args, **kwargs)
        if data.get("user_id") and user_id:
            current_user = UserModel.find_by_id(user_id)
            if current_user and (current_user.get("is_admin") or str(current_user.get("role") or "").lower() in ("owner", "admin", "superadmin")):
                return f(*args, **kwargs)
        return jsonify({"message": "Access denied! Owner privileges required."}), 403
    return decorated

def seller_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        token = extract_bearer_token()
        if not token:
            return jsonify({"message": "Authentication token is missing!"}), 401
        data, err = decode_jwt_token(token)
        if err or not data:
            return jsonify({"message": "Access denied! Invalid authentication token."}), 401
        user_id = data.get("user_id") or data.get("admin_id") or data.get("id")
        if data.get("admin_id") and user_id:
            return f(*args, **kwargs)
        if data.get("user_id") and user_id:
            current_user = UserModel.find_by_id(user_id)
            if current_user and (current_user.get("is_admin") or str(current_user.get("role") or "").lower() in ("seller", "owner", "admin")):
                import inspect
                sig = inspect.signature(f)
                if 'current_user' in sig.parameters and 'current_user' not in kwargs:
                    return f(current_user, *args, **kwargs)
                return f(*args, **kwargs)
        return jsonify({"message": "Access denied! Seller privileges required."}), 403
    return decorated
