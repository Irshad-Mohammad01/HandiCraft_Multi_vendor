import requests
import json
import sys

BASE_URL = 'http://127.0.0.1:5005/api'

def run_tests():
    print("==================================================")
    print("STARTING ORDER FULFILLMENT & TRACKING TEST SUITE")
    print("==================================================")

    # 1. Login all parties
    print("\n[Step 1] Authenticating users...")
    
    owner_login = requests.post(f'{BASE_URL}/auth/login', json={
        'email': 'owner@craftnest.internal',
        'password': 'CraftNestSecure2026!Owner'
    }).json()
    owner_token = owner_login['token']
    owner_headers = {'Authorization': f'Bearer {owner_token}'}
    print("  ✓ Owner authenticated")

    seller_a_login = requests.post(f'{BASE_URL}/auth/login', json={
        'email': 'artisan.ramesh@craftnest.internal',
        'password': 'ArtisanRamesh2026!'
    }).json()
    seller_a_token = seller_a_login['token']
    seller_a_headers = {'Authorization': f'Bearer {seller_a_token}'}
    print("  ✓ Seller A (Ramesh) authenticated")

    seller_b_login = requests.post(f'{BASE_URL}/auth/login', json={
        'email': 'artisan.lakshmi@craftnest.internal',
        'password': 'ArtisanLakshmi2026!'
    }).json()
    seller_b_token = seller_b_login['token']
    seller_b_headers = {'Authorization': f'Bearer {seller_b_token}'}
    print("  ✓ Seller B (Lakshmi) authenticated")

    customer_login = requests.post(f'{BASE_URL}/auth/login', json={
        'email': 'patron.priya@gmail.com',
        'password': 'CustomerPriya2026!'
    }).json()
    customer_token = customer_login['token']
    customer_headers = {'Authorization': f'Bearer {customer_token}'}
    print("  ✓ Customer (Priya) authenticated")

    # 2. Customer places a fresh COD Order with Seller A's product
    print("\n[Step 2] Customer placing fresh COD order...")
    # Find a product belonging to Seller A (seller_id = 2)
    products_res = requests.get(f'{BASE_URL}/products').json()
    all_products = products_res.get('products', products_res) if isinstance(products_res, dict) else products_res
    seller_a_prod = next((p for p in all_products if str(p.get('seller_id')) == '2'), None)
    if not seller_a_prod:
        # Fallback to any product
        seller_a_prod = all_products[0]
    
    print(f"  Selected Product: '{seller_a_prod.get('name')}' (ID: {seller_a_prod.get('id')}, Seller: {seller_a_prod.get('seller_id')})")

    # Place order
    order_payload = {
        "items": [
            {
                "product_id": seller_a_prod.get("id"),
                "quantity": 1,
                "price": float(seller_a_prod.get("price")),
                "name": seller_a_prod.get("name")
            }
        ],
        "shipping_address": {
            "name": "Priya Sharma",
            "full_name": "Priya Sharma",
            "phone": "9876543210",
            "mobile_number": "9876543210",
            "house_number": "Flat 402, Lotus Towers",
            "street": "MG Road",
            "landmark": "Near Central Mall",
            "city": "Jaipur",
            "state": "Rajasthan",
            "postal_code": "302001",
            "pincode": "302001"
        },
        "payment_method": "CASH_ON_DELIVERY",
        "terms_accepted": True
    }

    create_res = requests.post(f'{BASE_URL}/orders', json=order_payload, headers=customer_headers)
    assert create_res.status_code == 201, f"Failed to create order: {create_res.status_code} {create_res.text}"
    created_data = create_res.json()
    order_id = created_data.get("id") or created_data.get("order_id")
    order_num = created_data.get("order_id")
    print(f"  ✓ Order created successfully: ID={order_id}, OrderNumber={order_num}")

    # Verify initial customer view: Status is Pending, Payment is PENDING
    cust_view = requests.get(f'{BASE_URL}/orders/{order_id}', headers=customer_headers).json()
    assert cust_view.get("order_status") == "Pending" or cust_view.get("status") == "Pending"
    assert cust_view.get("payment_method") == "CASH_ON_DELIVERY"
    assert cust_view.get("payment_status") == "PENDING"
    print("  ✓ Verified initial customer order: Status='Pending', Payment='PENDING'")

    # 3. Test Scenario 1: Pending -> Confirmed
    print("\n[Step 3] Testing Milestone 1: Pending -> Confirmed...")
    conf_res = requests.put(f'{BASE_URL}/orders/{order_id}/status', json={
        "status": "Confirmed"
    }, headers=owner_headers)
    assert conf_res.status_code == 200, f"Pending -> Confirmed failed: {conf_res.status_code} {conf_res.text}"
    conf_data = conf_res.json()
    assert conf_data["status"] == "Confirmed"
    assert conf_data["order"]["payment_status"] == "PENDING", "COD payment status should remain PENDING"
    print("  ✓ Pending -> Confirmed succeeded! COD payment status remains PENDING.")

    # 4. Test Scenario 2: Confirmed -> Packed
    print("\n[Step 4] Testing Milestone 2: Confirmed -> Packed...")
    pack_res = requests.put(f'{BASE_URL}/orders/{order_id}/status', json={
        "status": "Packed"
    }, headers=owner_headers)
    assert pack_res.status_code == 200, f"Confirmed -> Packed failed: {pack_res.status_code} {pack_res.text}"
    pack_data = pack_res.json()
    assert pack_data["status"] == "Packed"
    assert pack_data["order"]["payment_status"] == "PENDING", "COD payment status should remain PENDING"
    print("  ✓ Confirmed -> Packed succeeded! COD payment status remains PENDING.")

    # 5. Test Scenario 3: Packed -> Shipped with Carrier & AWB Tracking Number
    print("\n[Step 5] Testing Milestone 3: Packed -> Shipped (with Tracking AWB)...")
    awb_number = "BLUEDART-IND-778219"
    carrier_name = "BlueDart Express"
    ship_res = requests.put(f'{BASE_URL}/orders/{order_id}/status', json={
        "status": "Shipped",
        "tracking_number": awb_number,
        "carrier": carrier_name
    }, headers=owner_headers)
    assert ship_res.status_code == 200, f"Packed -> Shipped failed: {ship_res.status_code} {ship_res.text}"
    ship_data = ship_res.json()
    assert ship_data["status"] == "Shipped"
    assert ship_data["order"]["tracking_id"] == awb_number
    assert ship_data["order"]["tracking_number"] == awb_number
    assert ship_data["order"]["carrier"] == carrier_name
    assert ship_data["order"]["payment_status"] == "PENDING", "COD payment status should remain PENDING after shipment"
    print(f"  ✓ Packed -> Shipped succeeded! AWB '{awb_number}' and carrier '{carrier_name}' recorded.")

    # 6. Test Scenario 4: Shipped -> Delivered
    print("\n[Step 6] Testing Milestone 4: Shipped -> Delivered...")
    deliv_res = requests.put(f'{BASE_URL}/orders/{order_id}/status', json={
        "status": "Delivered"
    }, headers=owner_headers)
    assert deliv_res.status_code == 200, f"Shipped -> Delivered failed: {deliv_res.status_code} {deliv_res.text}"
    deliv_data = deliv_res.json()
    assert deliv_data["status"] == "Delivered"
    print("  ✓ Shipped -> Delivered succeeded!")

    # 7. Test Customer View & Tracking Real-time
    print("\n[Step 7] Verifying Customer My Orders / Order Details view...")
    cust_get = requests.get(f'{BASE_URL}/orders/{order_id}', headers=customer_headers)
    assert cust_get.status_code == 200
    cust_order = cust_get.json()
    assert cust_order.get("order_status") == "Delivered" or cust_order.get("status") == "Delivered"
    assert cust_order.get("tracking_id") == awb_number
    assert cust_order.get("tracking_number") == awb_number
    assert cust_order.get("carrier") == carrier_name
    assert len(cust_order.get("tracking_history", [])) >= 4
    print("  ✓ Customer sees latest status 'Delivered' from PostgreSQL database.")
    print(f"  ✓ Customer sees AWB: '{cust_order.get('tracking_id')}' and Carrier: '{cust_order.get('carrier')}'.")
    print(f"  ✓ Customer order tracking history contains {len(cust_order.get('tracking_history', []))} milestone events.")

    # 8. Test Invalid Transition (Delivered -> Pending must be rejected)
    print("\n[Step 8] Testing Invalid Status Transition (Delivered -> Pending)...")
    invalid_res = requests.put(f'{BASE_URL}/orders/{order_id}/status', json={
        "status": "Pending"
    }, headers=owner_headers)
    assert invalid_res.status_code == 400, f"Expected 400 for invalid transition, got {invalid_res.status_code}"
    print(f"  ✓ Invalid transition properly rejected: {invalid_res.json().get('message')}")

    # 9. Test Seller Permissions & RBAC
    print("\n[Step 9] Testing Seller Permissions & RBAC...")
    # Create an order with Seller A's product
    order_a_res = requests.post(f'{BASE_URL}/orders', json=order_payload, headers=customer_headers)
    order_a_id = order_a_res.json().get("id")

    # Seller A should be able to update their own order
    seller_a_update = requests.put(f'{BASE_URL}/orders/{order_a_id}/status', json={
        "status": "Confirmed"
    }, headers=seller_a_headers)
    assert seller_a_update.status_code == 200, f"Authorized seller update failed: {seller_a_update.status_code} {seller_a_update.text}"
    print("  ✓ Seller A successfully updated fulfillment for their own product's order.")

    # Seller B (unauthorized) must NOT be able to update Seller A's order
    seller_b_unauth = requests.put(f'{BASE_URL}/orders/{order_a_id}/status', json={
        "status": "Packed"
    }, headers=seller_b_headers)
    assert seller_b_unauth.status_code == 403, f"Expected 403 Forbidden for unauthorized seller, got {seller_b_unauth.status_code}"
    print(f"  ✓ Unauthorized Seller B was blocked with HTTP 403: {seller_b_unauth.json().get('message')}")

    # 10. Audit Trail / Order Status History in PostgreSQL
    print("\n[Step 10] Verifying Audit Trail / Order Status History records in DB...")
    # Check status_history on order
    final_order = requests.get(f'{BASE_URL}/orders/{order_id}', headers=owner_headers).json()
    history = final_order.get("status_history", [])
    print(f"  Total OrderStatusHistory records recorded: {len(history)}")
    for h in history:
        print(f"    - {h.get('previous_status')} -> {h.get('new_status')} by {h.get('updated_by')} at {h.get('created_at')} (AWB: {h.get('tracking_number')})")

    assert len(history) >= 4, "Expected at least 4 audit records in OrderStatusHistory"
    print("  ✓ OrderStatusHistory audit records correctly recorded and verified!")

    print("\n==================================================")
    print("ALL 13 TEST SCENARIOS PASSED SUCCESSFULLY! ✓✓✓")
    print("==================================================")

if __name__ == '__main__':
    run_tests()
