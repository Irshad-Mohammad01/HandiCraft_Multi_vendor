"""Isolated credentialed-CORS tests with no application database access."""
import unittest

from flask import Flask, jsonify

from backend.config import get_allowed_origins
from backend.cors import configure_cors


def create_cors_test_app(frontend_url, allowed_origins, environment):
    app = Flask(__name__)
    configure_cors(
        app,
        frontend_url=frontend_url,
        allowed_origins=allowed_origins,
        environment=environment,
    )

    @app.get("/api/test")
    def test_endpoint():
        return jsonify({"success": True})

    @app.get("/api/error")
    def error_endpoint():
        return jsonify({"success": False}), 503

    return app


class CorsConfigurationTests(unittest.TestCase):
    production_frontend = "https://ssjewellry.com"
    production_allowed = (
        " https://ssjewellry.com/, "
        "https://www.ssjewellry.com/, "
        "https://ss-jewellery.vercel.app/ "
    )

    def setUp(self):
        self.production_app = create_cors_test_app(
            self.production_frontend,
            self.production_allowed,
            "PROD",
        )
        self.production_client = self.production_app.test_client()

    def assert_credentialed_origin(self, response, origin):
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), origin)
        self.assertEqual(response.headers.get("Access-Control-Allow-Credentials"), "true")

    def test_production_origin_resolution_normalizes_and_deduplicates(self):
        self.assertEqual(
            get_allowed_origins(
                self.production_frontend,
                self.production_allowed,
                "PROD",
            ),
            [
                "https://ssjewellry.com",
                "https://www.ssjewellry.com",
                "https://ss-jewellery.vercel.app",
            ],
        )

    def test_production_apex_origin(self):
        response = self.production_client.get(
            "/api/test", headers={"Origin": "https://ssjewellry.com"}
        )
        self.assert_credentialed_origin(response, "https://ssjewellry.com")

    def test_production_www_origin(self):
        response = self.production_client.get(
            "/api/test", headers={"Origin": "https://www.ssjewellry.com"}
        )
        self.assert_credentialed_origin(response, "https://www.ssjewellry.com")

    def test_optional_exact_vercel_origin(self):
        response = self.production_client.get(
            "/api/test", headers={"Origin": "https://ss-jewellery.vercel.app"}
        )
        self.assert_credentialed_origin(response, "https://ss-jewellery.vercel.app")

    def test_development_origin(self):
        app = create_cors_test_app(
            "https://dev.ssjewellry.com/",
            "https://dev.ssjewellry.com",
            "DEV",
        )
        response = app.test_client().get(
            "/api/test", headers={"Origin": "https://dev.ssjewellry.com"}
        )
        self.assert_credentialed_origin(response, "https://dev.ssjewellry.com")
        resolved = get_allowed_origins(
            "https://dev.ssjewellry.com/",
            "https://dev.ssjewellry.com",
            "DEV",
        )
        self.assertEqual(resolved[0], "https://dev.ssjewellry.com")
        self.assertIn("http://localhost:5173", resolved)
        self.assertIn("http://127.0.0.1:5173", resolved)

    def test_invalid_origin_is_not_allowed(self):
        response = self.production_client.get(
            "/api/test", headers={"Origin": "https://evil.example"}
        )
        self.assertIsNone(response.headers.get("Access-Control-Allow-Origin"))
        self.assertIsNone(response.headers.get("Access-Control-Allow-Credentials"))

    def test_preflight_allows_authorization_and_content_type(self):
        response = self.production_client.options(
            "/api/test",
            headers={
                "Origin": "https://www.ssjewellry.com",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
        self.assert_credentialed_origin(response, "https://www.ssjewellry.com")
        self.assertIn("GET", response.headers.get("Access-Control-Allow-Methods", ""))
        allowed_headers = response.headers.get("Access-Control-Allow-Headers", "").lower()
        self.assertIn("authorization", allowed_headers)
        self.assertIn("content-type", allowed_headers)

    def test_error_response_keeps_cors_headers(self):
        response = self.production_client.get(
            "/api/error", headers={"Origin": "https://ssjewellry.com"}
        )
        self.assertEqual(response.status_code, 503)
        self.assert_credentialed_origin(response, "https://ssjewellry.com")

    def test_wildcard_origin_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Wildcard CORS origins"):
            get_allowed_origins("https://ssjewellry.com", "*", "PROD")


if __name__ == "__main__":
    unittest.main()
