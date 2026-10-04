import os
import sys
import json
import requests
import bcrypt
from dotenv import load_dotenv

# Ensure backend package can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from backend.app import app
from backend.extensions import db
from backend.models.user import UserModel, DeliveryAddress
from backend.models.category import Category
from backend.models.product import ProductModel
from backend.models.order import OrderModel, OrderItem
from backend.setup_owner import setup_owner

BASE_URL = "http://127.0.0.1:5005"

def run_12_step_database_test():
    print("==================================================================")
    print("  CRAFTNEST REAL NEON POSTGRESQL 12-STEP INTEGRITY VERIFICATION   ")
    print("==================================================================")

    # -----------------------------------------------------------------
    # STEP 1: Create Main Owner using secure setup
    # -----------------------------------------------------------------
    print("\n--- STEP 1: Creating Main Owner using secure setup ---")
    owner_email = "owner@craftnest.internal"
    owner_pw = "CraftNestSecure2026!Owner"
    owner_name = "Devika Sundaram"
    owner_mobile = "+919876543210"

    # Setup owner via setup_owner function
    setup_owner(name=owner_name, email=owner_email, mobile=owner_mobile, password=owner_pw)

    with app.app_context():
        owner_record = UserModel.query.filter_by(email=owner_email).first()
        assert owner_record is not None, "Owner record not found in database!"
        assert owner_record.role == "owner", f"Expected role 'owner', got {owner_record.role}"
        assert owner_record.is_admin is True, "Owner must have is_admin=True"
        assert owner_record.password_hash != owner_pw, "Password must NOT be plaintext!"
        assert bcrypt.checkpw(owner_pw.encode('utf-8'), owner_record.password_hash.encode('utf-8')), "Password hash verification failed!"
        owner_id = owner_record.id
        print(f"STEP 1 PASSED: Owner '{owner_record.full_name}' (ID: {owner_id}) exists in Neon DB with verified bcrypt hash.")

    # Test login as Owner via API
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": owner_email, "password": owner_pw})
    assert login_res.status_code == 200, f"Owner login failed: {login_res.text}"
    owner_login_data = login_res.json()
    owner_token = owner_login_data.get("token")
    assert owner_token, "Owner token missing in login response"
    assert owner_login_data.get("user", {}).get("role") == "owner", "Owner role mismatch in login response"
    print("  Owner API authentication and JWT issuance verified successfully.")

    # -----------------------------------------------------------------
    # STEP 2: Create Seller A
    # -----------------------------------------------------------------
    print("\n--- STEP 2: Creating Seller A ---")
    seller_a_email = "artisan.ramesh@craftnest.internal"
    seller_a_pw = "ArtisanRamesh2026!"
    seller_a_name = "Ramesh Kumar Jaipur Crafts"
    seller_a_mobile = "+919811122233"

    with app.app_context():
        seller_a_rec = UserModel.query.filter_by(email=seller_a_email).first()
        if not seller_a_rec:
            UserModel.create_user(
                name=seller_a_name,
                email=seller_a_email,
                password=seller_a_pw,
                mobile=seller_a_mobile,
                role="seller"
            )
            seller_a_rec = UserModel.query.filter_by(email=seller_a_email).first()
            seller_a_rec.email_verified = True
            db.session.commit()
        seller_a_id = seller_a_rec.id
        assert seller_a_rec.role == "seller", "Seller A role must be 'seller'"
        assert seller_a_id is not None, "Seller A must have database-generated ID"
        print(f"STEP 2 PASSED: Seller A '{seller_a_name}' created in Neon DB with generated ID: {seller_a_id}")

    # -----------------------------------------------------------------
    # STEP 3: Create Seller B
    # -----------------------------------------------------------------
    print("\n--- STEP 3: Creating Seller B ---")
    seller_b_email = "artisan.lakshmi@craftnest.internal"
    seller_b_pw = "ArtisanLakshmi2026!"
    seller_b_name = "Lakshmi Devi Tanjore Guild"
    seller_b_mobile = "+919844455566"

    with app.app_context():
        seller_b_rec = UserModel.query.filter_by(email=seller_b_email).first()
        if not seller_b_rec:
            UserModel.create_user(
                name=seller_b_name,
                email=seller_b_email,
                password=seller_b_pw,
                mobile=seller_b_mobile,
                role="seller"
            )
            seller_b_rec = UserModel.query.filter_by(email=seller_b_email).first()
            seller_b_rec.email_verified = True
            db.session.commit()
        seller_b_id = seller_b_rec.id
        assert seller_b_rec.role == "seller", "Seller B role must be 'seller'"
        assert seller_b_id != seller_a_id, "Seller B must have a unique ID different from Seller A"
        print(f"STEP 3 PASSED: Seller B '{seller_b_name}' created in Neon DB with generated ID: {seller_b_id}")

    # -----------------------------------------------------------------
    # STEP 4: Create Customer A
    # -----------------------------------------------------------------
    print("\n--- STEP 4: Creating Customer A ---")
    cust_a_email = "patron.priya@gmail.com"
    cust_a_pw = "CustomerPriya2026!"
    cust_a_name = "Priya Sharma"
    cust_a_mobile = "+919777888999"

    with app.app_context():
        cust_a_rec = UserModel.query.filter_by(email=cust_a_email).first()
        if not cust_a_rec:
            UserModel.create_user(
                name=cust_a_name,
                email=cust_a_email,
                password=cust_a_pw,
                mobile=cust_a_mobile,
                role="customer"
            )
            cust_a_rec = UserModel.query.filter_by(email=cust_a_email).first()
            cust_a_rec.email_verified = True
            db.session.commit()
        cust_a_id = cust_a_rec.id
        assert cust_a_rec.role == "customer", "Customer A role must be 'customer'"
        print(f"STEP 4 PASSED: Customer A '{cust_a_name}' created in Neon DB with generated ID: {cust_a_id}")

    # Ensure Category exists in DB
    with app.app_context():
        cat = Category.query.filter_by(name="Blue Pottery").first()
        if not cat:
            cat = Category(name="Blue Pottery", name_en="Blue Pottery", image_url="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61")
            db.session.add(cat)
            db.session.commit()
        cat_id = cat.id

    # -----------------------------------------------------------------
    # STEP 5: Seller A creates Product A
    # -----------------------------------------------------------------
    print("\n--- STEP 5: Seller A creates Product A ---")
    login_a = requests.post(f"{BASE_URL}/api/auth/login", json={"email": seller_a_email, "password": seller_a_pw})
    assert login_a.status_code == 200, f"Seller A login failed: {login_a.text}"
    token_a = login_a.json()["token"]
    headers_a = {"Authorization": f"Bearer {token_a}", "Content-Type": "application/json"}

    prod_a_payload = {
        "name": "Handcrafted Jaipur Blue Pottery Floral Vase",
        "price": 2499.0,
        "stock": 15,
        "category": "Blue Pottery",
        "description": "Authentic quartz-frit glazed blue pottery vase made in Jaipur, Rajasthan.",
        "images": ["https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80"]
    }
    create_a_res = requests.post(f"{BASE_URL}/api/products", json=prod_a_payload, headers=headers_a)
    assert create_a_res.status_code == 201, f"Seller A failed to create product: {create_a_res.text}"
    prod_a_data = create_a_res.json()["product"]
    prod_a_id = int(prod_a_data["id"])

    with app.app_context():
        db_prod_a = ProductModel.query.get(prod_a_id)
        assert db_prod_a is not None, "Product A not found in database!"
        assert db_prod_a.seller_id == seller_a_id, f"Expected seller_id={seller_a_id}, got {db_prod_a.seller_id}"
        assert db_prod_a.category_id == cat_id, f"Expected category_id={cat_id}, got {db_prod_a.category_id}"
        print(f"STEP 5 PASSED: Product A '{db_prod_a.name}' (ID: {prod_a_id}) saved in Neon with Seller A ownership (seller_id={seller_a_id}).")

    # -----------------------------------------------------------------
    # STEP 6: Seller B creates Product B
    # -----------------------------------------------------------------
    print("\n--- STEP 6: Seller B creates Product B ---")
    login_b = requests.post(f"{BASE_URL}/api/auth/login", json={"email": seller_b_email, "password": seller_b_pw})
    assert login_b.status_code == 200, f"Seller B login failed: {login_b.text}"
    token_b = login_b.json()["token"]
    headers_b = {"Authorization": f"Bearer {token_b}", "Content-Type": "application/json"}

    prod_b_payload = {
        "name": "Traditional 24K Gold Foil Tanjore Saraswati Painting",
        "price": 8999.0,
        "stock": 8,
        "category": "Blue Pottery",
        "description": "Exquisite 24K real gold foil Tanjore painting handcrafted on seasoned teakwood.",
        "images": ["https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80"]
    }
    create_b_res = requests.post(f"{BASE_URL}/api/products", json=prod_b_payload, headers=headers_b)
    assert create_b_res.status_code == 201, f"Seller B failed to create product: {create_b_res.text}"
    prod_b_data = create_b_res.json()["product"]
    prod_b_id = int(prod_b_data["id"])

    with app.app_context():
        db_prod_b = ProductModel.query.get(prod_b_id)
        assert db_prod_b is not None, "Product B not found in database!"
        assert db_prod_b.seller_id == seller_b_id, f"Expected seller_id={seller_b_id}, got {db_prod_b.seller_id}"
        print(f"STEP 6 PASSED: Product B '{db_prod_b.name}' (ID: {prod_b_id}) saved in Neon with Seller B ownership (seller_id={seller_b_id}).")

    # -----------------------------------------------------------------
    # Verify Seller Modification Isolation (Seller A cannot edit Seller B's product)
    # -----------------------------------------------------------------
    unauthorized_edit = requests.put(
        f"{BASE_URL}/api/products/{prod_b_id}",
        json={"price": 999.0},
        headers=headers_a
    )
    assert unauthorized_edit.status_code == 403, f"Expected 403 when Seller A modifies Seller B product, got {unauthorized_edit.status_code}"
    print("  Cross-seller product mutation blocked: 403 Forbidden verified.")

    # -----------------------------------------------------------------
    # STEP 7: Customer A purchases Product A
    # -----------------------------------------------------------------
    print("\n--- STEP 7: Customer A purchases Product A ---")
    login_cust = requests.post(f"{BASE_URL}/api/auth/login", json={"email": cust_a_email, "password": cust_a_pw})
    assert login_cust.status_code == 200, f"Customer login failed: {login_cust.text}"
    token_cust = login_cust.json()["token"]
    headers_cust = {"Authorization": f"Bearer {token_cust}", "Content-Type": "application/json"}

    order_payload = {
        "shipping_address": {
            "name": cust_a_name,
            "phone": cust_a_mobile,
            "house_number": "Flat 402",
            "building_name": "Heritage Heights",
            "street": "MG Road",
            "area": "Civil Lines",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302001",
            "country": "India",
            "email": cust_a_email
        },
        "items": [
            {
                "product_id": prod_a_id,
                "name": "Handcrafted Jaipur Blue Pottery Floral Vase",
                "price": 2499.0,
                "quantity": 1,
                "image": "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61"
            }
        ],
        "total_amount": 2499.0,
        "terms_accepted": True
    }
    order_res = requests.post(f"{BASE_URL}/api/orders", json=order_payload, headers=headers_cust)
    assert order_res.status_code == 201, f"Customer order creation failed: {order_res.text}"
    order_data = order_res.json()["order"]
    order_id = int(order_data["id"])

    with app.app_context():
        db_order = OrderModel.query.get(order_id)
        assert db_order is not None, "Order not found in database!"
        assert len(db_order.items) == 1, "Order must have 1 order item"
        item = db_order.items[0]
        assert item.product_id == prod_a_id, f"Expected product_id={prod_a_id}, got {item.product_id}"
        assert item.seller_id == seller_a_id, f"Expected item seller_id={seller_a_id}, got {item.seller_id}"
        print(f"STEP 7 PASSED: Order #{db_order.order_id} stored in Neon with OrderItem retaining Seller A attribution (seller_id={seller_a_id}).")

    # -----------------------------------------------------------------
    # STEP 8: Login as Seller A -> Verify Seller A sees the order
    # -----------------------------------------------------------------
    print("\n--- STEP 8: Seller A queries orders ---")
    seller_a_orders_res = requests.get(f"{BASE_URL}/api/orders", headers=headers_a)
    assert seller_a_orders_res.status_code == 200, f"Seller A order fetch failed: {seller_a_orders_res.text}"
    seller_a_orders = seller_a_orders_res.json()
    order_ids_a = [o.get("id") or o.get("order_id") for o in seller_a_orders]
    assert any(str(order_id) == str(o.get("id")) or order_data["order_id"] == o.get("order_id") for o in seller_a_orders), \
        f"Seller A must see the order! Found: {order_ids_a}"
    print(f"STEP 8 PASSED: Seller A successfully retrieves order #{order_data['order_id']} via backend query.")

    # -----------------------------------------------------------------
    # STEP 9: Login as Seller B -> Verify Seller B does NOT see Seller A's order
    # -----------------------------------------------------------------
    print("\n--- STEP 9: Seller B queries orders ---")
    seller_b_orders_res = requests.get(f"{BASE_URL}/api/orders", headers=headers_b)
    assert seller_b_orders_res.status_code == 200, f"Seller B order fetch failed: {seller_b_orders_res.text}"
    seller_b_orders = seller_b_orders_res.json()
    assert not any(str(order_id) == str(o.get("id")) or order_data["order_id"] == o.get("order_id") for o in seller_b_orders), \
        f"SECURITY BREACH: Seller B saw Seller A's order! {seller_b_orders}"
    print(f"STEP 9 PASSED: Seller B does NOT see Seller A's order (returned {len(seller_b_orders)} orders). Complete isolation confirmed.")

    # -----------------------------------------------------------------
    # STEP 10: Login as Main Owner -> Verify Owner sees everything
    # -----------------------------------------------------------------
    print("\n--- STEP 10: Main Owner views full marketplace ---")
    headers_owner = {"Authorization": f"Bearer {owner_token}", "Content-Type": "application/json"}
    owner_orders_res = requests.get(f"{BASE_URL}/api/orders/all", headers=headers_owner)
    assert owner_orders_res.status_code == 200, f"Owner order fetch failed: {owner_orders_res.text}"
    owner_orders = owner_orders_res.json()
    assert any(str(order_id) == str(o.get("id")) or order_data["order_id"] == o.get("order_id") for o in owner_orders), \
        "Owner must see Customer A's order across the marketplace"

    owner_stats_res = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers_owner)
    assert owner_stats_res.status_code == 200, f"Owner stats failed: {owner_stats_res.text}"
    stats = owner_stats_res.json()
    assert stats["total_orders"] >= 1, "Stats total_orders must be >= 1"
    assert stats["active_products"] >= 2, "Stats active_products must be >= 2 (Product A + Product B)"
    assert stats["total_sellers"] >= 2, "Stats total_sellers must be >= 2 (Seller A + Seller B)"
    assert stats["total_customers"] >= 1, "Stats total_customers must be >= 1 (Customer A)"
    print(f"STEP 10 PASSED: Main Owner views complete marketplace: {stats['active_products']} products, {stats['total_sellers']} sellers, {stats['total_customers']} customers, {stats['total_orders']} orders.")

    # -----------------------------------------------------------------
    # STEP 11: Create Owner-owned Product
    # -----------------------------------------------------------------
    print("\n--- STEP 11: Creating Owner-owned Product ---")
    prod_owner_payload = {
        "name": "Heritage Master Guild Pure Silver Filigree Box",
        "price": 5400.0,
        "stock": 5,
        "category": "Blue Pottery",
        "description": "Signature filigree craft created by Main Owner master guild.",
        "images": ["https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=600&auto=format&fit=crop&q=80"]
    }
    create_owner_res = requests.post(f"{BASE_URL}/api/products", json=prod_owner_payload, headers=headers_owner)
    assert create_owner_res.status_code == 201, f"Owner product creation failed: {create_owner_res.text}"
    prod_owner_data = create_owner_res.json()["product"]
    prod_owner_id = int(prod_owner_data["id"])

    with app.app_context():
        db_prod_owner = ProductModel.query.get(prod_owner_id)
        assert db_prod_owner is not None, "Owner product not found in database!"
        assert db_prod_owner.seller_id is None, "Owner-owned product must have seller_id=None"
        print(f"STEP 11 PASSED: Owner-owned Product '{db_prod_owner.name}' (ID: {prod_owner_id}) verified with Main Owner ownership.")

    # -----------------------------------------------------------------
    # STEP 12: Customer purchases Owner-owned Product
    # -----------------------------------------------------------------
    print("\n--- STEP 12: Customer purchases Owner-owned Product ---")
    order_owner_payload = {
        "shipping_address": {
            "name": cust_a_name,
            "phone": cust_a_mobile,
            "house_number": "Flat 402",
            "building_name": "Heritage Heights",
            "street": "MG Road",
            "area": "Civil Lines",
            "city": "Jaipur",
            "state": "Rajasthan",
            "pincode": "302001",
            "country": "India",
            "email": cust_a_email
        },
        "items": [
            {
                "product_id": prod_owner_id,
                "name": "Heritage Master Guild Pure Silver Filigree Box",
                "price": 5400.0,
                "quantity": 1,
                "image": "https://images.unsplash.com/photo-1603561591411-07134e71a2a9"
            }
        ],
        "total_amount": 5400.0,
        "terms_accepted": True
    }
    order_owner_res = requests.post(f"{BASE_URL}/api/orders", json=order_owner_payload, headers=headers_cust)
    assert order_owner_res.status_code == 201, f"Customer purchase of owner product failed: {order_owner_res.text}"
    order_owner_data = order_owner_res.json()["order"]
    order_owner_id = int(order_owner_data["id"])

    with app.app_context():
        db_order_owner = OrderModel.query.get(order_owner_id)
        assert db_order_owner is not None, "Owner order not found in database!"
        assert db_order_owner.items[0].seller_id is None, "Owner-owned order item has seller_id=None"

    # Verify Owner can see this order
    owner_all_res = requests.get(f"{BASE_URL}/api/orders/all", headers=headers_owner)
    assert any(str(order_owner_id) == str(o.get("id")) for o in owner_all_res.json()), "Owner must see purchase of Owner-owned product"
    print(f"STEP 12 PASSED: Purchase of Owner-owned Product confirmed. Main Owner sees order #{order_owner_data['order_id']}.")

    print("\n==================================================================")
    print("  ALL 12 DATABASE INTEGRITY STEPS PASSED SUCCESSFULLY!            ")
    print("  NEON POSTGRESQL IS VERIFIED AS THE SINGLE SOURCE OF TRUTH.     ")
    print("==================================================================")

if __name__ == '__main__':
    run_12_step_database_test()
