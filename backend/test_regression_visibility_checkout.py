#!/usr/bin/env python3
"""
Regression Test Suite for:
1. Product Home Visibility ("Show on Home Page" option for Owner and Seller).
2. Checkout "Place Order" Fix (CORS preflight, COD flow, mixed multi-seller cart, stock validation, idempotency).
"""

import os
import sys
import unittest
import json
import jwt
from datetime import datetime, timezone, timedelta

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from backend.app import app
from backend.config import Config
from backend.extensions import db
from sqlalchemy import text
from backend.models.user import UserModel, DeliveryAddress
from backend.models.product import ProductModel
from backend.models.category import Category
from backend.models.order import OrderModel, OrderItem
from backend.models.transaction import TransactionModel
from backend.models.database_registry import SellerDatabaseRegistry
from backend.services.multi_db_manager import multi_db
from backend.services.seller_database_service import seller_db_service
from backend.services.catalog_aggregation_service import catalog_aggregation_service as catalog_aggregation

def generate_jwt(user_id, is_admin=False):
    payload = {
        "user_id": user_id,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return jwt.encode(payload, Config.get_jwt_secret(), algorithm="HS256")

def extract_products(resp_json):
    if isinstance(resp_json, list):
        return resp_json
    if isinstance(resp_json, dict):
        return resp_json.get("products") or resp_json.get("items") or []
    return []

class HomeVisibilityAndCheckoutRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()
        with app.app_context():
            # Find or verify users
            cls.owner = UserModel.query.filter_by(role='owner').first()
            if not cls.owner:
                cls.owner = UserModel.query.filter_by(id=1).first()
            cls.owner_token = generate_jwt(cls.owner.id, is_admin=True)

            # Isolated seller (DB2)
            cls.seller = UserModel.query.filter_by(email='seller@craftnest.in').first()
            if not cls.seller:
                cls.seller = UserModel.query.filter_by(id=22).first()
            cls.seller_token = generate_jwt(cls.seller.id, is_admin=False)

            # Customer
            cls.customer = UserModel.query.filter_by(email='customer_test@craftnest.in').first()
            if not cls.customer:
                cls.customer = UserModel.query.filter_by(role='customer').first()
            cls.customer_token = generate_jwt(cls.customer.id, is_admin=False)

            # Category
            cls.cat = Category.query.first()
            cls.cat_id = cls.cat.id if cls.cat else 1
            cls.cat_name = cls.cat.name if cls.cat else "Terracotta Crafts"

            # Customer delivery address
            addr = DeliveryAddress.query.filter_by(user_id=cls.customer.id).first()
            if not addr:
                addr = DeliveryAddress(
                    user_id=cls.customer.id,
                    full_name="Regression Customer",
                    phone="9876543210",
                    house_number="42A",
                    street="Heritage Lane",
                    city="Jaipur",
                    state="Rajasthan",
                    pincode="302001",
                    country="India",
                    address_type="Home",
                    is_default=True
                )
                db.session.add(addr)
                db.session.commit()
            cls.address_id = addr.id

    # =========================================================================
    # PART 1: HOME VISIBILITY TESTS
    # =========================================================================

    def test_01_owner_product_checked_appears_on_home(self):
        """Owner adds product with show_on_home=True -> appears in homepage featured products."""
        unique_name = f"Owner Featured Craft {int(datetime.now().timestamp())}"
        payload = {
            "name": unique_name,
            "price": 1850.00,
            "stock": 15,
            "category_id": self.cat_id,
            "category": self.cat_name,
            "description": "Exquisite handmade brass decor",
            "show_on_home": True
        }
        resp = self.client.post(
            "/api/products",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"Authorization": f"Bearer {self.owner_token}"}
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        data = resp.get_json()
        prod = data.get("product")
        self.assertTrue(prod.get("show_on_home") or prod.get("show_on_homepage"))

        # Verify on homepage (homepage_only=true)
        home_resp = self.client.get("/api/products?homepage_only=true")
        self.assertEqual(home_resp.status_code, 200)
        home_prods = extract_products(home_resp.get_json())
        found = any(p.get("name") == unique_name for p in home_prods)
        self.assertTrue(found, f"Checked owner product '{unique_name}' must appear in homepage featured section.")

    def test_02_owner_product_unchecked_hidden_from_home_visible_in_all_and_category(self):
        """Owner adds product with show_on_home=False -> hidden from home, visible in All Products & category."""
        unique_name = f"Owner Standard Craft {int(datetime.now().timestamp())}"
        payload = {
            "name": unique_name,
            "price": 950.00,
            "stock": 20,
            "category_id": self.cat_id,
            "category": self.cat_name,
            "description": "Standard workshop craft",
            "show_on_home": False
        }
        resp = self.client.post(
            "/api/products",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"Authorization": f"Bearer {self.owner_token}"}
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        data = resp.get_json()
        prod = data.get("product")
        self.assertFalse(prod.get("show_on_home"))

        # 1. Must NOT appear on Homepage
        home_resp = self.client.get("/api/products?homepage_only=true")
        home_prods = extract_products(home_resp.get_json())
        self.assertFalse(
            any(p.get("name") == unique_name for p in home_prods),
            f"Unchecked owner product '{unique_name}' must NOT appear on homepage featured section."
        )

        # 2. MUST appear on All Products page
        all_resp = self.client.get("/api/products?all=true")
        all_prods = extract_products(all_resp.get_json())
        self.assertTrue(
            any(p.get("name") == unique_name for p in all_prods),
            f"Unchecked product '{unique_name}' must remain visible in All Products."
        )

        # 3. MUST appear in Category query
        cat_resp = self.client.get(f"/api/products?category={self.cat_name}")
        cat_prods = extract_products(cat_resp.get_json())
        self.assertTrue(
            any(p.get("name") == unique_name for p in cat_prods),
            f"Unchecked product '{unique_name}' must remain visible in its category."
        )

    def test_03_seller_product_checked_appears_on_home(self):
        """Seller adds product with show_on_home=True -> saved in DB2, appears on homepage featured section."""
        unique_name = f"Seller DB2 Featured Pottery {int(datetime.now().timestamp())}"
        payload = {
            "name": unique_name,
            "price": 2400.00,
            "stock": 8,
            "category_id": self.cat_id,
            "description": "Hand-turned blue pottery vase",
            "show_on_home": True
        }
        resp = self.client.post(
            "/api/products",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"Authorization": f"Bearer {self.seller_token}"}
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        data = resp.get_json()
        prod = data.get("product")
        self.assertTrue(prod.get("show_on_home"))
        self.assertIn("seller_", str(prod.get("id")))

        # Verify on homepage
        home_resp = self.client.get("/api/products?homepage_only=true")
        home_prods = extract_products(home_resp.get_json())
        self.assertTrue(
            any(p.get("name") == unique_name for p in home_prods),
            f"Checked seller product '{unique_name}' must appear in homepage featured section."
        )

    def test_04_seller_product_unchecked_hidden_from_home_visible_in_all_and_category(self):
        """Seller adds product with show_on_home=False -> hidden from home, visible in All Products & category."""
        unique_name = f"Seller DB2 Standard Pottery {int(datetime.now().timestamp())}"
        payload = {
            "name": unique_name,
            "price": 1200.00,
            "stock": 14,
            "category_id": self.cat_id,
            "description": "Artisan clay bowl",
            "show_on_home": False
        }
        resp = self.client.post(
            "/api/products",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"Authorization": f"Bearer {self.seller_token}"}
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        prod = resp.get_json().get("product")
        self.assertFalse(prod.get("show_on_home"))

        # 1. Hidden from Homepage
        home_resp = self.client.get("/api/products?homepage_only=true")
        home_prods = extract_products(home_resp.get_json())
        self.assertFalse(
            any(p.get("name") == unique_name for p in home_prods),
            f"Unchecked seller product '{unique_name}' must NOT appear on homepage featured section."
        )

        # 2. Visible in All Products
        all_resp = self.client.get("/api/products?all=true")
        all_prods = extract_products(all_resp.get_json())
        self.assertTrue(
            any(p.get("name") == unique_name for p in all_prods),
            f"Unchecked seller product '{unique_name}' must remain visible in All Products."
        )

    def test_05_editing_product_visibility_setting_updates_correctly(self):
        """Editing the checkbox updates visibility on homepage correctly for Owner and Seller."""
        # 1. Create unchecked seller product
        unique_name = f"Toggleable Seller Craft {int(datetime.now().timestamp())}"
        create_resp = self.client.post(
            "/api/products",
            data=json.dumps({
                "name": unique_name,
                "price": 1500.00,
                "stock": 10,
                "category_id": self.cat_id,
                "show_on_home": False
            }),
            content_type="application/json",
            headers={"Authorization": f"Bearer {self.seller_token}"}
        )
        prod = create_resp.get_json().get("product")
        p_id = prod["id"]
        self.assertFalse(prod.get("show_on_home"))

        # Verify not on homepage
        home1 = extract_products(self.client.get("/api/products?homepage_only=true").get_json())
        self.assertFalse(any(p.get("name") == unique_name for p in home1))

        # 2. Edit product -> toggle show_on_home = True
        update_resp = self.client.put(
            f"/api/products/{p_id}",
            data=json.dumps({"show_on_home": True}),
            content_type="application/json",
            headers={"Authorization": f"Bearer {self.seller_token}"}
        )
        self.assertEqual(update_resp.status_code, 200, update_resp.data)
        updated_prod = update_resp.get_json().get("product")
        self.assertTrue(updated_prod.get("show_on_home"))

        # Verify NOW on homepage
        home2 = extract_products(self.client.get("/api/products?homepage_only=true").get_json())
        self.assertTrue(any(p.get("name") == unique_name for p in home2))

        # 3. Edit product -> toggle show_on_home = False
        update_resp2 = self.client.put(
            f"/api/products/{p_id}",
            data=json.dumps({"show_on_home": False}),
            content_type="application/json",
            headers={"Authorization": f"Bearer {self.seller_token}"}
        )
        self.assertEqual(update_resp2.status_code, 200)

        # Verify removed from homepage
        home3 = extract_products(self.client.get("/api/products?homepage_only=true").get_json())
        self.assertFalse(any(p.get("name") == unique_name for p in home3))

    # =========================================================================
    # PART 2: CHECKOUT & "PLACE ORDER" NETWORK ERROR FIX TESTS
    # =========================================================================

    def test_06_cors_preflight_allows_idempotency_key(self):
        """Root Cause Check: CORS OPTIONS preflight must explicitly allow 'idempotency-key'."""
        resp = self.client.open(
            "/api/orders",
            method="OPTIONS",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type, idempotency-key"
            }
        )
        self.assertEqual(resp.status_code, 200)
        allow_headers = resp.headers.get("Access-Control-Allow-Headers", "").lower()
        self.assertIn("idempotency-key", allow_headers, "Access-Control-Allow-Headers MUST include idempotency-key")

    def test_07_place_cod_order_owner_product(self):
        """Place COD order with single Owner product -> successful order creation without gateway call."""
        with app.app_context():
            prod = ProductModel.query.filter(
                ProductModel.status == 'active',
                (ProductModel.seller_id == None) | (ProductModel.seller_id == 1),
                ProductModel.stock >= 2
            ).first()
            self.assertIsNotNone(prod)
            prod_id = prod.id
            prod_price = float(prod.price)
            old_stock = prod.stock

        payload = {
            "selected_address_id": self.address_id,
            "payment_method": "CASH_ON_DELIVERY",
            "terms_accepted": True,
            "items": [{"product_id": prod_id, "quantity": 1, "price": prod_price}],
            "total_amount": prod_price
        }
        idemp = f"idemp_test_owner_{int(datetime.now().timestamp())}"

        resp = self.client.post(
            "/api/orders",
            data=json.dumps(payload),
            content_type="application/json",
            headers={
                "Authorization": f"Bearer {self.customer_token}",
                "Idempotency-Key": idemp
            }
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        data = resp.get_json()
        self.assertEqual(data.get("message"), "Order placed successfully!")
        self.assertIsNotNone(data.get("order"))
        self.assertIsNone(data.get("payment"), "COD orders must NOT invoke online payment gateway.")

        # Verify stock was decremented in DB1
        with app.app_context():
            p_after = ProductModel.query.get(prod_id)
            self.assertEqual(p_after.stock, old_stock - 1)

    def test_08_place_cod_order_seller_product(self):
        """Place COD order with single isolated Seller (DB2) product -> master record created, dispatched to DB2."""
        with app.app_context():
            seller_prods = seller_db_service.get_products(self.seller.id)
            valid_p = next((p for p in seller_prods if p.get("stock") >= 2), None)
            if not valid_p:
                valid_p = seller_db_service.create_product(self.seller.id, {
                    "name": "Artisan Test Dish",
                    "price": 1200.0,
                    "stock": 10,
                    "category_id": self.cat_id
                })
        self.assertIsNotNone(valid_p)
        composite_id = valid_p["id"]
        price = valid_p["price"]

        payload = {
            "selected_address_id": self.address_id,
            "payment_method": "CASH_ON_DELIVERY",
            "terms_accepted": True,
            "items": [{"product_id": composite_id, "quantity": 1, "price": price}],
            "total_amount": price
        }
        idemp = f"idemp_test_seller_{int(datetime.now().timestamp())}"

        resp = self.client.post(
            "/api/orders",
            data=json.dumps(payload),
            content_type="application/json",
            headers={
                "Authorization": f"Bearer {self.customer_token}",
                "Idempotency-Key": idemp
            }
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        data = resp.get_json()
        self.assertIsNotNone(data.get("order"))
        master_order_id = data.get("order_id")

        # Verify record exists in isolated DB2 seller_orders
        engine2 = multi_db.get_engine("DB2")
        with engine2.connect() as conn:
            row = conn.execute(text("SELECT id, master_order_id, payment_method FROM seller_orders WHERE master_order_id = :ord"), {"ord": master_order_id}).first()
            self.assertIsNotNone(row, f"Order {master_order_id} must be dispatched to isolated DB2 seller_orders.")

    def test_09_place_cod_order_mixed_owner_and_seller_products(self):
        """Place COD order containing products from both Owner (DB1) and Seller (DB2). Total ₹5,250 scenario."""
        with app.app_context():
            owner_p = ProductModel.query.filter(
                ProductModel.status == 'active',
                (ProductModel.seller_id == None) | (ProductModel.seller_id == 1),
                ProductModel.stock >= 2
            ).first()
            self.assertIsNotNone(owner_p)
            owner_pid = owner_p.id

            seller_prods = seller_db_service.get_products(self.seller.id)
            seller_p = next((p for p in seller_prods if p.get("stock") >= 2), None)
            if not seller_p:
                seller_p = seller_db_service.create_product(self.seller.id, {
                    "name": "Artisan Mixed Item",
                    "price": 1500.0,
                    "stock": 10,
                    "category_id": self.cat_id
                })
        self.assertIsNotNone(seller_p)

        items = [
            {"product_id": owner_pid, "quantity": 1},
            {"product_id": seller_p["id"], "quantity": 1}
        ]
        payload = {
            "selected_address_id": self.address_id,
            "payment_method": "CASH_ON_DELIVERY",
            "terms_accepted": True,
            "items": items
        }
        idemp = f"idemp_mixed_{int(datetime.now().timestamp())}"

        resp = self.client.post(
            "/api/orders",
            data=json.dumps(payload),
            content_type="application/json",
            headers={
                "Authorization": f"Bearer {self.customer_token}",
                "Idempotency-Key": idemp
            }
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        data = resp.get_json()
        splits = data.get("seller_splits")
        self.assertIsNotNone(splits)
        self.assertTrue(len(splits) >= 1, "Seller splits must be computed for multi-database routing.")

    def test_10_online_payment_order_creation_and_server_verification(self):
        """Test ONLINE payment flow: order creates gateway details, server verifies signature."""
        with app.app_context():
            owner_p = ProductModel.query.filter(
                ProductModel.status == 'active',
                ProductModel.stock >= 2
            ).first()
            owner_pid = owner_p.id

        old_payment = Config.ENABLE_PAYMENT
        Config.ENABLE_PAYMENT = True
        try:
            payload = {
                "selected_address_id": self.address_id,
                "payment_method": "ONLINE",
                "terms_accepted": True,
                "items": [{"product_id": owner_pid, "quantity": 1}]
            }
            idemp = f"idemp_online_{int(datetime.now().timestamp())}"

            resp = self.client.post(
                "/api/orders",
                data=json.dumps(payload),
                content_type="application/json",
                headers={
                    "Authorization": f"Bearer {self.customer_token}",
                    "Idempotency-Key": idemp
                }
            )
            self.assertEqual(resp.status_code, 201, resp.data)
            data = resp.get_json()
            payment_info = data.get("payment")
            self.assertIsNotNone(payment_info, "ONLINE payment must generate payment routing info.")
            order_db_id = data.get("id")

            # Test server-side payment verification
            verify_resp = self.client.post(
                "/api/orders/verify-payment",
                data=json.dumps({
                    "order_id": order_db_id,
                    "razorpay_order_id": payment_info.get("gateway_order_id") or "order_test_123",
                    "razorpay_payment_id": "pay_test_123",
                    "razorpay_signature": "sig_test_123"
                }),
                content_type="application/json",
                headers={"Authorization": f"Bearer {self.customer_token}"}
            )
            self.assertEqual(verify_resp.status_code, 200, verify_resp.data)
            v_data = verify_resp.get_json()
            self.assertTrue(v_data.get("success"))
        finally:
            Config.ENABLE_PAYMENT = old_payment

    def test_11_insufficient_stock_fails_with_useful_error(self):
        """Ordering more than available stock fails with 400 and does NOT create order."""
        with app.app_context():
            p = ProductModel.query.filter(ProductModel.stock > 0).first()
            p_id = p.id
            curr_stock = p.stock

        payload = {
            "selected_address_id": self.address_id,
            "payment_method": "CASH_ON_DELIVERY",
            "terms_accepted": True,
            "items": [{"product_id": p_id, "quantity": curr_stock + 999}]
        }

        resp = self.client.post(
            "/api/orders",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Insufficient stock", resp.get_json().get("message", ""))

    def test_12_double_click_idempotency_prevents_duplicate_orders(self):
        """Replaying request with same Idempotency-Key returns existing order, preventing duplicates."""
        with app.app_context():
            p = ProductModel.query.filter(ProductModel.stock >= 3).first()
            p_id = p.id

        payload = {
            "selected_address_id": self.address_id,
            "payment_method": "CASH_ON_DELIVERY",
            "terms_accepted": True,
            "items": [{"product_id": p_id, "quantity": 1}]
        }
        idemp = f"idemp_doubleclick_{int(datetime.now().timestamp())}"

        # First click
        resp1 = self.client.post(
            "/api/orders",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"Authorization": f"Bearer {self.customer_token}", "Idempotency-Key": idemp}
        )
        self.assertEqual(resp1.status_code, 201)
        order_id_1 = resp1.get_json().get("order_id")

        # Second click (double click with same idempotency key)
        resp2 = self.client.post(
            "/api/orders",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"Authorization": f"Bearer {self.customer_token}", "Idempotency-Key": idemp}
        )
        self.assertEqual(resp2.status_code, 200)
        order_id_2 = resp2.get_json().get("order_id")
        self.assertEqual(order_id_1, order_id_2, "Idempotent retry MUST return existing order without creating a duplicate.")

    def test_13_orders_appear_in_customer_and_seller_views(self):
        """Placed order appears in customer orders history and seller fulfillment dashboard."""
        # 1. Customer orders
        c_resp = self.client.get(
            "/api/orders",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        self.assertEqual(c_resp.status_code, 200)
        c_orders = c_resp.get_json()
        ord_list = c_orders if isinstance(c_orders, list) else (c_orders.get("orders") or [])
        self.assertTrue(len(ord_list) > 0, "Customer must see their placed orders in history.")

        # 2. Seller orders
        s_resp = self.client.get(
            "/api/orders/seller",
            headers={"Authorization": f"Bearer {self.seller_token}"}
        )
        self.assertEqual(s_resp.status_code, 200)
        s_orders = s_resp.get_json()
        s_list = s_orders if isinstance(s_orders, list) else (s_orders.get("orders") or [])
        self.assertTrue(len(s_list) > 0, "Seller must see assigned orders in their fulfillment view.")

if __name__ == "__main__":
    unittest.main()
