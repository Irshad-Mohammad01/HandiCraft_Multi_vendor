"""Shared Flask-CORS application configuration.

Origin resolution remains centralized in backend.config. This module only applies
that resolved policy to a Flask application.
"""
from flask_cors import CORS

from backend.config import get_allowed_origins


def configure_cors(app, *, frontend_url=None, allowed_origins=None, environment=None):
    """Apply the application's credentialed exact-origin CORS policy."""
    origins = get_allowed_origins(
        frontend_url=frontend_url,
        allowed_origins=allowed_origins,
        environment=environment,
    )
    CORS(
        app,
        origins=origins,
        supports_credentials=True,
        allow_headers=[
            "Content-Type",
            "Authorization",
            "X-Access-Token",
            "X-Auth-Token",
            "X-Admin-Token",
            "Idempotency-Key",
            "idempotency-key",
            "X-Requested-With",
            "Accept",
            "Origin",
        ],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )
    return origins
