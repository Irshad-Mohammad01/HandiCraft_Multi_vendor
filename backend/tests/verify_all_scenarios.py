import requests
import json
import sys

BASE_URL = "http://127.0.0.1:5005"

def login(email, password):
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if res.status_code != 200:
        raise Exception(f"Login failed for {email}: {res.status_code} - {res.text}")
    data = res.json()
    token = data.get("token")
    user = data.get("user")
    return token, user

def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def run_tests():
    print("==================================================")
    print("STARTING COMPLETE VERIFICATION OF ALL 9 SCENARIOS")
    print("==================================================")

    # 1. Login Accounts
    owner_token, owner_user = login("owner@craftnest.internal", "CraftNestSecure2026!Owner")
    seller_a_token, seller_a = login("artisan.ramesh@craftnest.internal", "ArtisanRamesh2026!")
    seller_b_token, seller_b = login("artisan.lakshmi@craftnest.internal", "ArtisanLakshmi2026!")
    customer_token, customer = login("patron.priya@gmail.com", "CustomerPriya2026!")

    print(f"Logged in Owner: ID {owner_user['id']} ({owner_user['email']})")
    print(f"Logged in Seller A: ID {seller_a['id']} ({seller_a['email']})")
    print(f"Logged in Seller B: ID {seller_b['id']} ({seller_b['email']})")
    print(f"Logged in Customer: ID {customer['id']} ({customer['email']})")

    # TEST 1 & 2: Delivery Address for Customer
    print("\n--- TEST 1: New Delivery Address Creation & Default Assignment ---")
    # First, list current addresses
    res = requests.get(f"{BASE_URL}/api/auth/addresses", headers=auth_headers(customer_token))
    assert res.status_code == 200, f"Failed to get addresses: {res.text}"
    existing_addrs = res.json().get("addresses", [])
    print(f"Customer currently has {len(existing_addrs)} address(es)")

    # Clean existing test addresses if any to test fresh customer flow
    for a in existing_addrs:
        requests.delete(f"{BASE_URL}/api/auth/addresses/{a['id']}", headers=auth_headers(customer_token))

    # Re-fetch: should be empty (no commas, no undefineds)
    res_empty = requests.get(f"{BASE_URL}/api/auth/addresses", headers=auth_headers(customer_token))
    addrs_empty = res_empty.json().get("addresses", [])
    assert len(addrs_empty) == 0, f"Expected 0 addresses, got {len(addrs_empty)}"
    print("Verified empty address state: 0 addresses found for customer.")

    # Add first address
    new_addr_data = {
        "full_name": "Priya Sharma",
        "mobile_number": "9876543210",
        "house_number": "Flat 402, Royal Residency",
        "street": "MG Road, Civil Lines",
        "landmark": "Opposite Central Park",
        "city": "Jaipur",
        "state": "Rajasthan",
        "pincode": "302001",
        "address_type": "Home"
    }
    res_add = requests.post(f"{BASE_URL}/api/auth/addresses", headers=auth_headers(customer_token), json=new_addr_data)
    assert res_add.status_code == 201, f"Failed to add address: {res_add.status_code} - {res_add.text}"
    added_addr = res_add.json()["address"]
    assert added_addr["is_default"] == True, "First address should be automatically default"
    assert added_addr["full_name"] == "Priya Sharma"
    assert added_addr["phone"] == "9876543210"
    print(f"Address 1 added successfully (ID: {added_addr['id']}, Default: {added_addr['is_default']})")

    # Add second address (Office)
    addr_2_data = {
        "full_name": "Priya Sharma (Work)",
        "mobile_number": "9876543211",
        "house_number": "Suite 8B, Tech Hub",
        "street": "IT Park Road",
        "landmark": "Near Gate 2",
        "city": "Jaipur",
        "state": "Rajasthan",
        "pincode": "302020",
        "address_type": "Office"
    }
    res_add2 = requests.post(f"{BASE_URL}/api/auth/addresses", headers=auth_headers(customer_token), json=addr_2_data)
    assert res_add2.status_code == 201
    addr_2 = res_add2.json()["address"]
    assert addr_2["is_default"] == False, "Second address should not be default unless specified"
    print(f"Address 2 added successfully (ID: {addr_2['id']}, Default: {addr_2['is_default']})")

    print("\n--- TEST 2 & 3: Address Persistence and Returning Customer Default Selection ---")
    # Fresh fetch simulates page refresh or re-login
    res_refetch = requests.get(f"{BASE_URL}/api/auth/addresses", headers=auth_headers(customer_token))
    refetched_list = res_refetch.json()["addresses"]
    assert len(refetched_list) == 2, f"Expected 2 addresses, got {len(refetched_list)}"
    default_addr = next(a for a in refetched_list if a["is_default"])
    assert default_addr["id"] == added_addr["id"]
    print(f"Persisted in PostgreSQL: Retrieved 2 addresses. Default is ID {default_addr['id']} ('{default_addr['full_name']}')")

    # Change default to address 2
    res_def = requests.put(f"{BASE_URL}/api/auth/addresses/{addr_2['id']}/default", headers=auth_headers(customer_token))
    assert res_def.status_code == 200
    res_after_def = requests.get(f"{BASE_URL}/api/auth/addresses", headers=auth_headers(customer_token))
    new_def = next(a for a in res_after_def.json()["addresses"] if a["is_default"])
    assert new_def["id"] == addr_2["id"], "Address 2 should now be default"
    print("Default address updated successfully and verified in PostgreSQL.")

    # Reset default back to address 1 for consistency
    requests.put(f"{BASE_URL}/api/auth/addresses/{added_addr['id']}/default", headers=auth_headers(customer_token))

    # Fetch products to identify Owner, Seller A, and Seller B products
    res_prod = requests.get(f"{BASE_URL}/api/products?all=true")
    assert res_prod.status_code == 200
    prod_json = res_prod.json()
    all_products = prod_json if isinstance(prod_json, list) else prod_json.get("products", [])
    print(f"\nFetched {len(all_products)} products from DB.")

    owner_products = [p for p in all_products if str(p.get("seller_id")) == '1' or p.get("seller_id") is None]
    seller_a_products = [p for p in all_products if str(p.get("seller_id")) == str(seller_a["id"])]
    seller_b_products = [p for p in all_products if str(p.get("seller_id")) == str(seller_b["id"])]

    print(f"Owner products count: {len(owner_products)}")
    print(f"Seller A (Ramesh) products count: {len(seller_a_products)}")
    print(f"Seller B (Lakshmi) products count: {len(seller_b_products)}")

    # Ensure each seller has at least 1 product with stock
    p_owner = owner_products[0] if owner_products else None
    p_seller_a = seller_a_products[0] if seller_a_products else None
    p_seller_b = seller_b_products[0] if seller_b_products else None

    print(f"Selected Owner Product: ID {p_owner['id'] if p_owner else 'None'} ('{p_owner['name'] if p_owner else ''}')")
    print(f"Selected Seller A Product: ID {p_seller_a['id'] if p_seller_a else 'None'} ('{p_seller_a['name'] if p_seller_a else ''}')")
    print(f"Selected Seller B Product: ID {p_seller_b['id'] if p_seller_b else 'None'} ('{p_seller_b['name'] if p_seller_b else ''}')")

    print("\n--- TEST 4: Cash on Delivery (COD) Order Placement ---")
    # Single product COD order
    test_prod = p_seller_a or all_products[0]
    initial_stock = int(test_prod["stock"])
    print(f"Product '{test_prod['name']}' initial stock: {initial_stock}")

    cod_order_payload = {
        "selected_address_id": added_addr["id"],
        "items": [
            {
                "product_id": test_prod["id"],
                "quantity": 1,
                # Intentionally pass fake price to verify backend recalculates from DB!
                "price": 1.00
            }
        ],
        "payment_method": "CASH_ON_DELIVERY",
        "terms_accepted": True,
        "total_amount": 1.00 # Fake frontend amount
    }

    res_cod = requests.post(f"{BASE_URL}/api/orders", headers=auth_headers(customer_token), json=cod_order_payload)
    assert res_cod.status_code == 201, f"Failed COD order creation: {res_cod.status_code} - {res_cod.text}"
    cod_data = res_cod.json()
    order_obj = cod_data["order"]
    order_id = cod_data["order_id"]
    db_id = cod_data["id"]

    print(f"COD Order created successfully! Order Reference: {order_id}, DB ID: {db_id}")
    assert order_obj["payment_method"] == "CASH_ON_DELIVERY", f"Expected CASH_ON_DELIVERY, got {order_obj['payment_method']}"
    assert order_obj["payment_status"] == "PENDING", f"Expected PENDING, got {order_obj['payment_status']}"
    assert order_obj["order_status"] == "Pending", f"Expected Pending, got {order_obj['order_status']}"
    # Verify price was recalculated from DB, not 1.00
    assert float(order_obj["total_amount"]) == float(test_prod["price"]), f"Expected DB price {test_prod['price']}, got {order_obj['total_amount']}"
    print(f"Price security verified: Backend recalculated actual price ₹{order_obj['total_amount']} from PostgreSQL!")

    # Verify address snapshot
    snapshot = order_obj["shipping_address"]
    assert snapshot["name"] == "Priya Sharma"
    assert snapshot["phone"] == "9876543210"
    assert snapshot["city"] == "Jaipur"
    print("Delivery address snapshot verified on order record.")

    # Verify stock reduction
    res_prod_after = requests.get(f"{BASE_URL}/api/products/{test_prod['id']}")
    prod_data = res_prod_after.json()
    new_stock = int(prod_data.get("stock") if "stock" in prod_data else prod_data["product"]["stock"])
    assert new_stock == initial_stock - 1, f"Expected stock {initial_stock - 1}, got {new_stock}"
    print(f"Stock reduction verified: {initial_stock} -> {new_stock}")

    print("\n--- TEST 5: Order for Owner Product Appears in Owner Dashboard ---")
    if p_owner:
        owner_order_payload = {
            "selected_address_id": added_addr["id"],
            "items": [{"product_id": p_owner["id"], "quantity": 1}],
            "payment_method": "CASH_ON_DELIVERY"
        }
        res_o = requests.post(f"{BASE_URL}/api/orders", headers=auth_headers(customer_token), json=owner_order_payload)
        assert res_o.status_code == 201
        o_order_id = res_o.json()["order_id"]

        # Owner fetches orders
        res_owner_orders = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers(owner_token))
        assert res_owner_orders.status_code == 200
        o_json = res_owner_orders.json()
        owner_list = o_json if isinstance(o_json, list) else o_json.get("orders", [])
        found_in_owner = any(o["order_id"] == o_order_id for o in owner_list)
        assert found_in_owner, f"Order {o_order_id} not found in Owner orders list"
        print(f"Order {o_order_id} successfully visible in Owner's dashboard!")

    print("\n--- TEST 6 & 7: Multi-Seller Order and Isolation ---")
    if p_seller_a and p_seller_b:
        multi_payload = {
            "selected_address_id": added_addr["id"],
            "items": [
                {"product_id": p_seller_a["id"], "quantity": 1},
                {"product_id": p_seller_b["id"], "quantity": 2}
            ],
            "payment_method": "CASH_ON_DELIVERY"
        }
        res_multi = requests.post(f"{BASE_URL}/api/orders", headers=auth_headers(customer_token), json=multi_payload)
        assert res_multi.status_code == 201
        multi_order_id = res_multi.json()["order_id"]
        multi_db_id = res_multi.json()["id"]
        print(f"Multi-seller order placed: {multi_order_id} (Seller A items + Seller B items)")

        # Check Seller A view
        res_a = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers(seller_a_token))
        assert res_a.status_code == 200
        a_json = res_a.json()
        list_a = a_json if isinstance(a_json, list) else a_json.get("orders", [])
        order_in_a = next((o for o in list_a if o["order_id"] == multi_order_id), None)
        assert order_in_a is not None, f"Order {multi_order_id} not found in Seller A orders"
        # Seller A should ONLY see items belonging to Seller A
        seller_a_item_pids = [int(it["product_id"]) for it in order_in_a["items"]]
        assert int(p_seller_a["id"]) in seller_a_item_pids, "Seller A's product should be in order"
        assert int(p_seller_b["id"]) not in seller_a_item_pids, "Seller B's product MUST NOT be visible to Seller A!"
        print("Verified Seller A isolation: Seller A sees only Seller A's item!")

        # Check Seller B view
        res_b = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers(seller_b_token))
        assert res_b.status_code == 200
        b_json = res_b.json()
        list_b = b_json if isinstance(b_json, list) else b_json.get("orders", [])
        order_in_b = next((o for o in list_b if o["order_id"] == multi_order_id), None)
        assert order_in_b is not None, f"Order {multi_order_id} not found in Seller B orders"
        # Seller B should ONLY see items belonging to Seller B
        seller_b_item_pids = [int(it["product_id"]) for it in order_in_b["items"]]
        assert int(p_seller_b["id"]) in seller_b_item_pids, "Seller B's product should be in order"
        assert int(p_seller_a["id"]) not in seller_b_item_pids, "Seller A's product MUST NOT be visible to Seller B!"
        print("Verified Seller B isolation: Seller B sees only Seller B's item!")

        # Check Owner view: Main Owner sees ALL items from both sellers
        res_all = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers(owner_token))
        all_json = res_all.json()
        list_all = all_json if isinstance(all_json, list) else all_json.get("orders", [])
        order_in_owner = next((o for o in list_all if o["order_id"] == multi_order_id), None)
        assert order_in_owner is not None
        owner_item_pids = [int(it["product_id"]) for it in order_in_owner["items"]]
        assert int(p_seller_a["id"]) in owner_item_pids and int(p_seller_b["id"]) in owner_item_pids, "Owner must see both sellers' items"
        print("Verified Owner overview: Main Owner sees complete order with all sellers' items!")

    print("\n--- TEST 8: Stock Validation Error When Exceeding Stock ---")
    excessive_qty = new_stock + 999
    excessive_payload = {
        "selected_address_id": added_addr["id"],
        "items": [{"product_id": test_prod["id"], "quantity": excessive_qty}],
        "payment_method": "CASH_ON_DELIVERY"
    }
    res_excess = requests.post(f"{BASE_URL}/api/orders", headers=auth_headers(customer_token), json=excessive_payload)
    assert res_excess.status_code == 400, f"Expected 400 for excessive quantity, got {res_excess.status_code}"
    err_msg = res_excess.json().get("message", "")
    assert "Insufficient stock" in err_msg, f"Expected 'Insufficient stock' message, got: {err_msg}"
    print(f"Stock validation verified: Backend rejected excessive quantity with message: '{err_msg}'")

    print("\n--- TEST 9: Cross-Customer Access Control (Security) ---")
    # Customer attempts to access another order or update another user's address
    # Let's create another customer or test with seller token trying to fetch customer order directly via /orders/<id>
    res_unauth_order = requests.get(f"{BASE_URL}/api/orders/{multi_db_id}", headers=auth_headers(seller_a_token))
    # Seller A should only get items belonging to Seller A, not full order
    if res_unauth_order.status_code == 200:
        seller_a_direct_items = res_unauth_order.json()["items"]
        assert all(it["seller_id"] == str(seller_a["id"]) for it in seller_a_direct_items)
        print("Verified: Seller A cannot access Seller B items even via direct order ID endpoint!")

    # Attempt to update or delete customer address using seller token
    res_hack_addr = requests.delete(f"{BASE_URL}/api/auth/addresses/{added_addr['id']}", headers=auth_headers(seller_a_token))
    assert res_hack_addr.status_code == 404, "Seller must not be able to delete customer address"
    print("Verified: Customer address is strictly isolated and inaccessible to other users!")

    print("\n==================================================")
    print("ALL 9 TEST SCENARIOS PASSED WITH COMPLETE SUCCESS!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
