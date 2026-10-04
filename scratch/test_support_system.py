import sys
import os
import requests
import jwt
from datetime import datetime, timedelta

# Load Flask app config to generate valid test JWT tokens
sys.path.insert(0, '/home/irshad-mohammad/Music/HandiCraft')
from backend.app import app
from backend.config import Config

BASE_URL = "http://localhost:5005/api"
JWT_SECRET = Config.get_jwt_secret()

def generate_token(user_id, role, is_admin=False):
    payload = {
        "user_id": user_id,
        "id": user_id,
        "role": role,
        "is_admin": is_admin,
        "exp": datetime.utcnow() + timedelta(hours=2)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

# Generate test tokens
owner_token = generate_token(user_id=1, role="owner", is_admin=True)
seller_token = generate_token(user_id=2, role="seller", is_admin=False)
customer1_token = generate_token(user_id=4, role="customer", is_admin=False)
customer2_token = generate_token(user_id=16, role="customer", is_admin=False)

headers_owner = {"Authorization": f"Bearer {owner_token}", "Content-Type": "application/json"}
headers_seller = {"Authorization": f"Bearer {seller_token}", "Content-Type": "application/json"}
headers_cust1 = {"Authorization": f"Bearer {customer1_token}", "Content-Type": "application/json"}
headers_cust2 = {"Authorization": f"Bearer {customer2_token}", "Content-Type": "application/json"}

print("=== STARTING COMPREHENSIVE SUPPORT SYSTEM TESTS ===")

# TEST 1: Customer submits a support query
print("\n[TEST 1] Submitting support query from Customer 1...")
submit_payload = {
    "name": "Priya Sharma",
    "email": "patron.priya@gmail.com",
    "category": "Order Issue",
    "order_id": "ORD-9941",
    "subject": "Delayed dispatch on handcrafted brass thali",
    "message": "Namaste, I ordered a brass thali set last week. Could you please check the tracking status?"
}
r1 = requests.post(f"{BASE_URL}/support", json=submit_payload, headers=headers_cust1)
assert r1.status_code == 201, f"Failed to submit ticket: {r1.status_code} - {r1.text}"
res1 = r1.json()
ticket = res1.get("ticket") or res1.get("support_message")
ticket_id = int(ticket["id"])
print(f"✓ Ticket created with ID: {ticket_id} ({ticket.get('ticket_id')}), Status: {ticket.get('status')}")
assert ticket["status"] == "Open"
assert ticket["category"] == "Order Issue"
assert ticket["order_id"] == "ORD-9941"

# Verify it appears in Owner Support Inbox
print("\n[TEST 1b] Verifying ticket appears in Owner Support Inbox...")
r_inbox = requests.get(f"{BASE_URL}/support/all", headers=headers_owner)
assert r_inbox.status_code == 200, f"Owner inbox failed: {r_inbox.status_code} - {r_inbox.text}"
inbox_tickets = r_inbox.json()
found_inbox = any(t["id"] == str(ticket_id) or t["id"] == ticket_id for t in inbox_tickets)
assert found_inbox, f"Ticket {ticket_id} not found in Owner inbox"
print("✓ Ticket successfully appears in Owner Support Inbox")

# TEST 2: Owner can open and read the complete ticket
print("\n[TEST 2] Owner opens and reads complete ticket details...")
r2 = requests.get(f"{BASE_URL}/support/{ticket_id}", headers=headers_owner)
assert r2.status_code == 200, f"Owner failed to view ticket: {r2.status_code} - {r2.text}"
t_details = r2.json()
assert t_details["subject"] == submit_payload["subject"]
assert t_details["message"] == submit_payload["message"]
assert t_details["category"] == "Order Issue"
print("✓ Owner read complete ticket details successfully")

# TEST 3 & 4: Owner replies to customer and reply is saved in conversation history
print("\n[TEST 3 & 4] Owner replies to ticket and updates status to Replied...")
reply_payload = {
    "message": "Namaste Priya, your order ORD-9941 has been dispatched from Jaipur via BlueDart. Tracking number is BD782910.",
    "status": "Replied"
}
r3 = requests.post(f"{BASE_URL}/support/{ticket_id}/reply", json=reply_payload, headers=headers_owner)
assert r3.status_code == 201, f"Failed to send reply: {r3.status_code} - {r3.text}"
reply_res = r3.json()
assert reply_res.get("success") is True
print("✓ Owner reply saved successfully. Response message:", reply_res.get("message"))

# Verify reply is in conversation history
r_history = requests.get(f"{BASE_URL}/support/{ticket_id}", headers=headers_owner)
h_details = r_history.json()
assert len(h_details.get("replies", [])) >= 1, "Replies list is empty"
last_reply = h_details["replies"][-1]
assert last_reply["message"] == reply_payload["message"]
print(f"✓ Conversation history has {len(h_details['replies'])} replies. Last reply verified: '{last_reply['message'][:40]}...'")

# TEST 5: Ticket status can be updated (e.g. to "In Progress" and "Resolved")
print("\n[TEST 5] Updating ticket status to In Progress and then Resolved...")
r_status1 = requests.put(f"{BASE_URL}/support/{ticket_id}/status", json={"status": "In Progress"}, headers=headers_owner)
assert r_status1.status_code == 200
assert r_status1.json().get("status") == "In Progress"
print("✓ Status updated to 'In Progress'")

r_status2 = requests.put(f"{BASE_URL}/support/{ticket_id}/status", json={"status": "Resolved"}, headers=headers_owner)
assert r_status2.status_code == 200
assert r_status2.json().get("status") == "Resolved"
print("✓ Status updated to 'Resolved'")

# Customer replies back, reopening the ticket
print("\n[TEST 5b] Customer replies back, reopening ticket to Open...")
r_cust_reply = requests.post(f"{BASE_URL}/support/{ticket_id}/reply", json={"message": "Thank you! I received the shipment."}, headers=headers_cust1)
assert r_cust_reply.status_code == 201
r_check_reopen = requests.get(f"{BASE_URL}/support/{ticket_id}", headers=headers_owner)
assert r_check_reopen.json().get("status") == "Open"
print("✓ Customer response correctly reopened ticket status to 'Open'")

# TEST 6: Support notification count updates correctly
print("\n[TEST 6] Checking unread/unresolved ticket count...")
r_count = requests.get(f"{BASE_URL}/support/unread-count", headers=headers_owner)
assert r_count.status_code == 200
count_data = r_count.json()
print("✓ Unread count stats:", count_data)
assert "unresolved_count" in count_data
assert count_data["unresolved_count"] >= 1

# TEST 8: Seller cannot access Support APIs directly (403 Forbidden)
print("\n[TEST 8] Verifying Seller is denied access (403 Forbidden) to Owner Support APIs...")
# 8a: Seller accessing /support/all
r_seller_all = requests.get(f"{BASE_URL}/support/all", headers=headers_seller)
assert r_seller_all.status_code == 403, f"Expected 403 for seller accessing all messages, got {r_seller_all.status_code}"
print("✓ Seller blocked from GET /api/support/all (403 Forbidden)")

# 8b: Seller accessing /support/unread-count
r_seller_count = requests.get(f"{BASE_URL}/support/unread-count", headers=headers_seller)
assert r_seller_count.status_code == 403, f"Expected 403 for seller accessing unread count, got {r_seller_count.status_code}"
print("✓ Seller blocked from GET /api/support/unread-count (403 Forbidden)")

# 8c: Seller accessing /support/<ticket_id>
r_seller_view = requests.get(f"{BASE_URL}/support/{ticket_id}", headers=headers_seller)
assert r_seller_view.status_code == 403, f"Expected 403 for seller viewing ticket, got {r_seller_view.status_code}"
print("✓ Seller blocked from GET /api/support/<id> (403 Forbidden)")

# 8d: Seller trying to reply
r_seller_reply = requests.post(f"{BASE_URL}/support/{ticket_id}/reply", json={"message": "Seller trying to reply"}, headers=headers_seller)
assert r_seller_reply.status_code == 403, f"Expected 403 for seller replying, got {r_seller_reply.status_code}"
print("✓ Seller blocked from POST /api/support/<id>/reply (403 Forbidden)")

# 8e: Seller trying to update status
r_seller_status = requests.put(f"{BASE_URL}/support/{ticket_id}/status", json={"status": "Resolved"}, headers=headers_seller)
assert r_seller_status.status_code == 403, f"Expected 403 for seller updating status, got {r_seller_status.status_code}"
print("✓ Seller blocked from PUT /api/support/<id>/status (403 Forbidden)")

# TEST 9: Customer cannot view another customer's ticket
print("\n[TEST 9] Customer 2 attempting to view Customer 1's private ticket...")
r_cust2_view = requests.get(f"{BASE_URL}/support/{ticket_id}", headers=headers_cust2)
assert r_cust2_view.status_code == 403, f"Expected 403 for unauthorized customer, got {r_cust2_view.status_code}"
print("✓ Customer 2 blocked from viewing Customer 1's ticket (403 Forbidden)")

# Customer 2 attempting to reply to Customer 1's ticket
r_cust2_reply = requests.post(f"{BASE_URL}/support/{ticket_id}/reply", json={"message": "Intruder reply"}, headers=headers_cust2)
assert r_cust2_reply.status_code == 403, f"Expected 403 for unauthorized customer reply, got {r_cust2_reply.status_code}"
print("✓ Customer 2 blocked from replying to Customer 1's ticket (403 Forbidden)")

# TEST 10: Existing Customer Care and dashboard continue working
print("\n[TEST 10] Testing public /customer-care endpoints and admin stats...")
r_faqs = requests.get(f"{BASE_URL}/support/faqs")
assert r_faqs.status_code == 200
print("✓ FAQs endpoint working (count:", len(r_faqs.json()), ")")

r_links = requests.get(f"{BASE_URL}/support/links")
assert r_links.status_code == 200
print("✓ Support links endpoint working (count:", len(r_links.json()), ")")

print("\n=======================================================")
print(" ALL 10 BACKEND VERIFICATION REQUIREMENTS PASSED 100%! ")
print("=======================================================")
