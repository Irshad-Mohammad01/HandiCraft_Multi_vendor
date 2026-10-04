import requests
import sys
import jwt
from datetime import datetime, timedelta
from backend.config import Config
from backend.app import app
from backend.models.user import UserModel
from backend.models.support import SupportModel

BASE_URL = "http://localhost:5005"

def run_tests():
    print("=== STARTING COMPREHENSIVE VERIFICATION ===")
    
    with app.app_context():
        customer = UserModel.query.filter_by(role='customer').first()
        owner = UserModel.query.filter_by(role='owner').first()
        seller = UserModel.query.filter_by(role='seller').first()
        
        jwt_secret = Config.get_jwt_secret()
        
        # 1. Customer token
        cust_payload = {
            "user_id": customer.id,
            "_id": str(customer.id),
            "id": customer.id,
            "role": "customer",
            "email": customer.email,
            "name": customer.name or "Patron Priya",
            "exp": datetime.utcnow() + timedelta(days=1)
        }
        cust_token = jwt.encode(cust_payload, jwt_secret, algorithm="HS256")
        cust_headers = {"Authorization": f"Bearer {cust_token}"}
        print(f"1. Customer Authenticated: ID={customer.id}, Email={customer.email}")

        # 2. Owner token
        owner_payload = {
            "user_id": owner.id,
            "_id": str(owner.id),
            "id": owner.id,
            "role": "owner",
            "email": owner.email,
            "is_admin": True,
            "exp": datetime.utcnow() + timedelta(days=1)
        }
        owner_token = jwt.encode(owner_payload, jwt_secret, algorithm="HS256")
        owner_headers = {"Authorization": f"Bearer {owner_token}"}
        print(f"2. Owner Authenticated: ID={owner.id}, Email={owner.email}")

        # 3. Seller token
        seller_payload = {
            "user_id": seller.id,
            "_id": str(seller.id),
            "id": seller.id,
            "role": "seller",
            "email": seller.email,
            "exp": datetime.utcnow() + timedelta(days=1)
        }
        seller_token = jwt.encode(seller_payload, jwt_secret, algorithm="HS256")
        seller_headers = {"Authorization": f"Bearer {seller_token}"}
        print(f"3. Seller Authenticated: ID={seller.id}, Email={seller.email}")

    # 4. Customer submits a support inquiry
    print("\n--- 4. Customer submits support inquiry ---")
    inquiry_payload = {
        "name": customer.name or "Patron Priya",
        "email": customer.email,
        "subject": "Inquiry regarding customized blue pottery vase",
        "category": "Customization & Bespoke",
        "order_id": "ORD-BLUE-99",
        "priority": "Medium",
        "message": "Hello CraftNest! Can I request a 12-inch version of the floral blue pottery vase?"
    }
    submit_res = requests.post(f"{BASE_URL}/api/support", json=inquiry_payload, headers=cust_headers)
    print("Support inquiry submit status:", submit_res.status_code)
    assert submit_res.status_code == 201, f"Expected 201, got {submit_res.status_code}: {submit_res.text}"
    ticket = submit_res.json().get("ticket")
    ticket_id = ticket.get("id") or ticket.get("_id")
    print(f"Created Support Ticket: ID={ticket_id}, TicketRef={ticket.get('ticket_id')}")

    # 5. Inquiry appears in Owner Support Inbox
    print("\n--- 5. Owner Support Inbox Verification ---")
    owner_inbox_res = requests.get(f"{BASE_URL}/api/support/all", headers=owner_headers)
    print("Owner inbox status:", owner_inbox_res.status_code)
    assert owner_inbox_res.status_code == 200
    res_data = owner_inbox_res.json()
    inbox_items = res_data.get("items") if isinstance(res_data, dict) else res_data
    found_ticket = next((t for t in inbox_items if str(t.get("id")) == str(ticket_id)), None)
    assert found_ticket is not None, f"Ticket {ticket_id} not found in Owner Support inbox"
    print(f"Successfully verified ticket {ticket_id} in Owner inbox. Status: {found_ticket.get('status')}")

    # 6. Owner replies to the inquiry
    print("\n--- 6. Owner replies to inquiry ---")
    owner_reply_msg = "Namaste! Yes, our Jaipur master artisans can craft a custom 12-inch vase. We will prepare a blueprint for you."
    reply_res = requests.post(f"{BASE_URL}/api/support/{ticket_id}/reply", json={
        "message": owner_reply_msg,
        "status": "Replied"
    }, headers=owner_headers)
    print("Owner reply status:", reply_res.status_code)
    assert reply_res.status_code == 201, f"Failed owner reply: {reply_res.text}"

    # 7. Customer views Support Messages & replies
    print("\n--- 7. Customer checks Support Messages & ticket conversation ---")
    cust_tickets_res = requests.get(f"{BASE_URL}/api/support/my-tickets", headers=cust_headers)
    print("Customer my-tickets status:", cust_tickets_res.status_code)
    assert cust_tickets_res.status_code == 200
    my_tickets = cust_tickets_res.json()
    cust_ticket = next((t for t in my_tickets if str(t.get("id")) == str(ticket_id)), None)
    assert cust_ticket is not None, f"Ticket {ticket_id} not returned in customer's tickets"
    print(f"Customer ticket status: {cust_ticket.get('status')}, replies count: {len(cust_ticket.get('replies', []))}")
    assert cust_ticket.get("status") == "Replied"
    assert len(cust_ticket.get("replies", [])) >= 1
    assert cust_ticket.get("replies")[-1]["message"] == owner_reply_msg
    print("Owner reply is successfully verified in Customer's ticket conversation!")

    # 8. Customer receives unread notification for Owner reply
    print("\n--- 8. Customer receives unread notification ---")
    notif_res = requests.get(f"{BASE_URL}/api/auth/notifications", headers=cust_headers)
    print("Customer notifications status:", notif_res.status_code)
    assert notif_res.status_code == 200
    notifs = notif_res.json()
    reply_notif = next((n for n in notifs if str(n.get("ticket_id")) == str(ticket_id)), None)
    assert reply_notif is not None, "Notification for support ticket reply not found in customer notifications!"
    print(f"Notification Found: ID={reply_notif['id']}, Title={reply_notif['title']}, Read={reply_notif['read']}, TicketID={reply_notif.get('ticket_id')}")
    assert reply_notif["read"] is False, "Notification should be unread"

    # Also test /api/notifications alias
    alias_res = requests.get(f"{BASE_URL}/api/notifications", headers=cust_headers)
    assert alias_res.status_code == 200, "Direct /api/notifications alias route failed"
    print("Direct /api/notifications alias route passed!")

    # 9. Customer marks notification as read
    print("\n--- 9. Mark notification as read ---")
    read_res = requests.put(f"{BASE_URL}/api/auth/notifications/{reply_notif['id']}/read", headers=cust_headers)
    print("Mark read status:", read_res.status_code)
    assert read_res.status_code == 200

    notif_after = requests.get(f"{BASE_URL}/api/auth/notifications", headers=cust_headers).json()
    target_after = next((n for n in notif_after if n["id"] == reply_notif["id"]), None)
    assert target_after and target_after["read"] is True, "Notification read status did not persist"
    print("Notification marked as read successfully!")

    # 10. Customer sends follow-up in the same conversation
    print("\n--- 10. Customer sends follow-up message ---")
    followup_msg = "Thank you so much! Please let me know the expected completion timeline."
    followup_res = requests.post(f"{BASE_URL}/api/support/{ticket_id}/reply", json={
        "message": followup_msg
    }, headers=cust_headers)
    print("Customer follow-up status:", followup_res.status_code)
    assert followup_res.status_code == 201

    # Check ticket status reopened to Open
    ticket_reopened = requests.get(f"{BASE_URL}/api/support/{ticket_id}", headers=cust_headers).json()
    print("Reopened ticket status:", ticket_reopened.get("status"))
    assert ticket_reopened.get("status") == "Open"
    assert len(ticket_reopened.get("replies", [])) >= 2
    print(f"Conversation now has {len(ticket_reopened.get('replies', []))} replies in chronological order.")

    # 11. Security & RBAC: Seller must be denied access to Owner support and customer notifications
    print("\n--- 11. RBAC & Data Isolation ---")
    seller_support_res = requests.get(f"{BASE_URL}/api/support/all", headers=seller_headers)
    print("Seller access to owner support /all status:", seller_support_res.status_code)
    assert seller_support_res.status_code == 403, f"Expected 403 for seller, got {seller_support_res.status_code}"

    seller_reply_res = requests.post(f"{BASE_URL}/api/support/{ticket_id}/reply", json={"message": "hacked"}, headers=seller_headers)
    print("Seller reply status:", seller_reply_res.status_code)
    assert seller_reply_res.status_code == 403

    # 12. Support Ticket status update notification
    print("\n--- 12. Owner updates status to Resolved ---")
    resolve_res = requests.put(f"{BASE_URL}/api/support/{ticket_id}/status", json={"status": "Resolved"}, headers=owner_headers)
    print("Resolve ticket status:", resolve_res.status_code)
    assert resolve_res.status_code == 200

    notifs_resolved = requests.get(f"{BASE_URL}/api/auth/notifications", headers=cust_headers).json()
    resolved_notif = next((n for n in notifs_resolved if "Resolved" in n.get("title", "") and str(n.get("ticket_id")) == str(ticket_id)), None)
    assert resolved_notif is not None, "Notification for ticket resolved was not created!"
    print(f"Resolved Notification: Title={resolved_notif['title']}, Message={resolved_notif['message']}")

    print("\n=== ALL TEST SCENARIOS PASSED WITH 100% SUCCESS ===")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print("TEST FAILED:", e)
        import traceback
        traceback.print_exc()
        sys.exit(1)
