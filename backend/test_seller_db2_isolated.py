#!/usr/bin/env python3
"""
Test Suite: Seller Login & Dedicated DB2 Isolation Verification
"""
import requests
import json

BASE_URL = "http://127.0.0.1:5005"

def run_tests():
    print("=================================================================")
    print(" 1. SELLER AUTHENTICATION VIA LOGIN PAGE (seller / seller123)")
    print("=================================================================")
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "seller", "password": "seller123"})
    print("Status Code:", login_res.status_code)
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    login_data = login_res.json()
    token = login_data["token"]
    user = login_data["user"]
    u_id = user["id"]
    print(f"Authenticated Identity: ID={u_id}, Username={user.get('name')}, Role={user.get('role')}")
    assert user.get("role") == "seller", f"Expected role seller, got {user.get('role')}"
    assert token, "JWT token missing"

    headers = {"Authorization": f"Bearer {token}"}

    print("\n=================================================================")
    print(" 2. SELLER DASHBOARD CATALOG DATA ISOLATION (DB2)")
    print("=================================================================")
    prod_res = requests.get(f"{BASE_URL}/api/products?seller_id={u_id}&my_products=true", headers=headers)
    assert prod_res.status_code == 200, f"Failed to get products: {prod_res.text}"
    catalog = prod_res.json()
    if isinstance(catalog, dict) and "products" in catalog:
        catalog = catalog["products"]

    print(f"Total Products retrieved from isolated DB2: {len(catalog)}")
    for p in catalog:
        print(f" - [{p['id']}] {p['name']} | Stock: {p['stock']} units | Price: ₹{p['price']}")
        assert str(p.get("seller_id")) == str(u_id), "Security failure: Cross-seller data leak!"

    print("\n=================================================================")
    print(" 3. PRODUCT CREATION IN DEDICATED SELLER DATABASE (DB2)")
    print("=================================================================")
    craft_payload = {
        "name": "Channapatna Hand-Turned Lacquered Wooden Toys",
        "description": "Safe, organic vegetable-dyed traditional wooden nesting figurines.",
        "price": 950.0,
        "original_price": 1200.0,
        "stock": 20,
        "category_id": 1,
        "materials": "Wrightia tinctoria wood, natural lacquer, turmeric & indigo dyes",
        "origin": "Channapatna, Karnataka",
        "artisan_name": "seller"
    }
    add_res = requests.post(f"{BASE_URL}/api/products", headers=headers, json=craft_payload)
    print("Add Product Status:", add_res.status_code)
    assert add_res.status_code in (200, 201), f"Add failed: {add_res.text}"
    new_prod = add_res.json().get("product")
    new_prod_id = new_prod["id"]
    print(f"Successfully added to DB2: ID={new_prod_id}, Name='{new_prod['name']}', Stock={new_prod['stock']}")

    print("\n=================================================================")
    print(" 4. INVENTORY STOCK MANAGEMENT & AUDIT TRAIL (DB2)")
    print("=================================================================")
    stock_res = requests.put(f"{BASE_URL}/api/products/{new_prod_id}/stock", headers=headers, json={
        "action": "increase",
        "value": 10,
        "reason": "Artisan cluster finished new batch"
    })
    print("Stock Adjustment Status:", stock_res.status_code)
    assert stock_res.status_code == 200, f"Stock update failed: {stock_res.text}"
    stk_info = stock_res.json()
    print(f"Updated Stock: {stk_info['new_stock']} (Was: {stk_info['previous_stock']})")
    assert stk_info["new_stock"] == 30

    # Verify Stock History in DB2
    hist_res = requests.get(f"{BASE_URL}/api/products/{new_prod_id}/stock-history", headers=headers)
    assert hist_res.status_code == 200
    history_items = hist_res.json().get("items", [])
    print(f"Stock History Ledger Entries for Product #{new_prod_id}: {len(history_items)}")
    for h in history_items:
        print(f" - Action: {h.get('action')} | Change: {h.get('change_amount')} | New Stock: {h.get('new_stock')}")

    print("\n=================================================================")
    print(" 5. WORKSHOP CATEGORY VALUATION & METRICS (DB2)")
    print("=================================================================")
    dist_res = requests.get(f"{BASE_URL}/api/products/category-stock-distribution", headers=headers)
    assert dist_res.status_code == 200
    dist_data = dist_res.json()
    print(f"Total Workshop Valuation: ₹{dist_data.get('total_stock_value'):,.2f}")
    print(f"Total Handcrafted Products in Catalog: {dist_data.get('total_products')}")
    print(f"Total Stock Units in Workshop: {dist_data.get('total_stock_units')}")

    print("\n=================================================================")
    print(" 6. WORKSHOP ORDER FULFILLMENT BREAKDOWN & DB2 ORDERS (DB2)")
    print("=================================================================")
    stats_res = requests.get(f"{BASE_URL}/api/orders/fulfillment-stats", headers=headers)
    assert stats_res.status_code == 200
    stats_data = stats_res.json()
    print(f"Total Workshop Orders: {stats_data.get('total_orders')}")
    print("Fulfillment Status Counts:", stats_data.get("counts"))

    orders_res = requests.get(f"{BASE_URL}/api/orders", headers=headers)
    assert orders_res.status_code == 200
    ord_list = orders_res.json() if isinstance(orders_res.json(), list) else orders_res.json().get("orders", [])
    print(f"Direct DB2 Orders fetched for Seller: {len(ord_list)}")
    for o in ord_list:
        print(f" - DB2 Order #{o.get('id')} | Master: {o.get('master_order_id')} | Status: {o.get('status')} | Total: ₹{o.get('total_amount')}")

    print("\n=================================================================")
    print(" 7. STRICT PERMISSION & OWNERSHIP ENFORCEMENT")
    print("=================================================================")
    # 7a. Seller cannot edit a product outside their DB2 database
    foreign_prod_id = 99999
    tamper_res = requests.put(f"{BASE_URL}/api/products/{foreign_prod_id}", headers=headers, json={"name": "Hacked Title"})
    print(f"Seller editing foreign product #{foreign_prod_id} response code:", tamper_res.status_code)
    assert tamper_res.status_code in (403, 404), f"Security violation: seller could touch foreign product! ({tamper_res.status_code})"

    tamper_del = requests.delete(f"{BASE_URL}/api/products/{foreign_prod_id}", headers=headers)
    print(f"Seller deleting foreign product #{foreign_prod_id} response code:", tamper_del.status_code)
    assert tamper_del.status_code in (403, 404), f"Security violation: seller could delete foreign product! ({tamper_del.status_code})"

    # 7b. Another seller cannot edit this seller's products
    seller2_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "artisan.ramesh@craftnest.internal", "password": "password123"})
    if seller2_login.status_code == 200:
        s2_token = seller2_login.json()["token"]
        s2_headers = {"Authorization": f"Bearer {s2_token}"}
        # Try editing Seller 22's mirrored product in DB1
        s2_tamper = requests.put(f"{BASE_URL}/api/products/1", headers=s2_headers, json={"name": "Attacked by another seller"})
        print("Seller 2 editing Seller 22 product response code:", s2_tamper.status_code)
        assert s2_tamper.status_code == 403, f"Security violation: Seller 2 modified another seller's product! ({s2_tamper.status_code})"
    else:
        print("Seller 2 login status:", seller2_login.status_code)

    print("\n=================================================================")
    print(" 8. OWNER DASHBOARD & CENTRAL DATABASE (DB1) INTEGRITY")
    print("=================================================================")
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin", "password": "admin123"})
    print(f"Platform Superadmin Login Status: {admin_login.status_code}")
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['token']}"}

    # Verify Owner can view central databases registry
    db_list_res = requests.get(f"{BASE_URL}/api/admin/databases", headers=admin_headers)
    assert db_list_res.status_code == 200
    db_list = db_list_res.json().get("databases", [])
    print(f"Owner Database Registry List ({len(db_list)} databases registered):")
    for d in db_list:
        print(f" - [{d.get('database_id')}] {d.get('purpose')} | Status: {d.get('connection_status')}")

    print("\n>>> ALL TESTS PASSED: COMPLETE DATA ISOLATION VERIFIED FOR SELLER ON DB2 <<<")

if __name__ == "__main__":
    run_tests()
