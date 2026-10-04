import sys
import os
import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app
from backend.extensions import db
from backend.models.user import UserModel
from backend.models.user_attempt import UserAttempt
from backend.models.user_login_attempt import UserLoginAttempt

from backend.utils.timezone import get_ist_time
from backend.update_db import run_updates

def run_tests():
    print("=== STARTING ACCOUNT LOGIN RATE LIMITING & LOCK TESTS ===")
    
    # 1. Ensure database tables exist
    run_updates()
    
    with app.app_context():
        # Setup test user
        test_email = "test_rate_limit_user@gmail.com"
        test_phone = "+919876543210"
        test_password = "SecretPassword123"
        
        # Cleanup existing test user if present
        existing_user = UserModel.query.filter_by(email=test_email).first()
        if existing_user:
            UserLoginAttempt.query.filter_by(user_id=existing_user.id).delete()
            db.session.delete(existing_user)
            db.session.commit()
            
        # Create user
        user_dict = UserModel.create_user(
            name="Test Rate Limit User",
            email=test_email,
            password=test_password,
            mobile=test_phone
        )
        user_id = int(user_dict["_id"])
        
        # Mark email verified
        user_obj = UserModel.query.get(user_id)
        user_obj.email_verified = True
        db.session.commit()
        
        client = app.test_client()
        
        print(f"Created test user ID: {user_id}")

        # ----------------------------------------------------
        # TEST 1: Wrong password once
        # ----------------------------------------------------
        res = client.post('/api/auth/login', json={"email": test_email, "password": "WrongPassword"})
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        assert res.get_json()["message"] == "Incorrect password. Please try again."
        attempt = UserLoginAttempt.query.filter_by(user_id=user_id).first()
        assert attempt is not None
        assert attempt.failed_attempts == 1
        assert attempt.blocked_until is None
        print("✓ TEST 1 PASSED: Wrong password once -> failed_attempts = 1, account available")

        # ----------------------------------------------------
        # TEST 2: Wrong password 4 times total
        # ----------------------------------------------------
        for i in range(2, 5):
            res = client.post('/api/auth/login', json={"email": test_email, "password": "WrongPassword"})
            assert res.status_code == 401
        attempt = UserLoginAttempt.query.filter_by(user_id=user_id).first()
        assert attempt.failed_attempts == 4
        assert attempt.blocked_until is None
        print("✓ TEST 2 PASSED: Wrong password 4 times -> failed_attempts = 4, account available")

        # ----------------------------------------------------
        # TEST 3: Wrong password 5th time
        # ----------------------------------------------------
        res = client.post('/api/auth/login', json={"email": test_email, "password": "WrongPassword"})
        assert res.status_code == 429, f"Expected 429 on 5th failed attempt, got {res.status_code}"
        json_data = res.get_json()
        expected_msg = "Too many failed login attempts. Please try again after 15 minutes."
        assert json_data["message"] == expected_msg, f"Expected '{expected_msg}', got '{json_data['message']}'"
        attempt = UserLoginAttempt.query.filter_by(user_id=user_id).first()
        assert attempt.failed_attempts == 5
        assert attempt.blocked_at is not None
        assert attempt.blocked_until is not None
        assert attempt.blocked_until > get_ist_time()
        print("✓ TEST 3 PASSED: Wrong password 5th time -> account locked for 15 mins with exact message")

        # ----------------------------------------------------
        # TEST 4: Try correct password while account is locked
        # ----------------------------------------------------
        res = client.post('/api/auth/login', json={"email": test_email, "password": test_password})
        assert res.status_code == 429
        assert res.get_json()["message"] == expected_msg
        print("✓ TEST 4 PASSED: Correct password while locked is STILL rejected with lock message")

        # ----------------------------------------------------
        # TEST 5 & 6: Try login from another browser/device (simulated via user-login endpoint or clean client)
        # ----------------------------------------------------
        client2 = app.test_client()
        res = client2.post('/api/auth/user-login', json={"name": test_email, "password": test_password})
        assert res.status_code == 429
        assert res.get_json()["message"] == expected_msg
        print("✓ TEST 5 & 6 PASSED: Login from another browser/device/endpoint while locked is rejected")

        # ----------------------------------------------------
        # TEST 7: Wait until blocked_until expires (simulate time shift)
        # ----------------------------------------------------
        attempt.blocked_until = get_ist_time() - datetime.timedelta(seconds=1)
        db.session.commit()
        # Next attempt should see lock expired automatically
        res = client.post('/api/auth/login', json={"email": test_email, "password": "WrongPassword"})
        # Since lock expired, it allows login attempt again. Wrong password becomes attempt 1 in new cycle.
        assert res.status_code == 401
        attempt = UserLoginAttempt.query.filter_by(user_id=user_id).first()
        assert attempt.failed_attempts == 1
        assert attempt.blocked_until is None
        print("✓ TEST 7 PASSED: Expired lock automatically unblocks account")

        # ----------------------------------------------------
        # TEST 8 & 9: Correct password after lock expiration / resets counter to 0
        # ----------------------------------------------------
        res = client.post('/api/auth/login', json={"email": test_email, "password": test_password})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        attempt = UserLoginAttempt.query.filter_by(user_id=user_id).first()
        assert attempt.failed_attempts == 0
        assert attempt.blocked_until is None
        print("✓ TEST 8 & 9 PASSED: Correct password succeeds and resets failed_attempts to 0")

        # ----------------------------------------------------
        # TEST 10: Wrong password 5 more times after previous unlock -> locks again
        # ----------------------------------------------------
        for i in range(1, 5):
            res = client.post('/api/auth/login', json={"email": test_email, "password": "WrongPassword"})
            assert res.status_code == 401
        res = client.post('/api/auth/login', json={"email": test_email, "password": "WrongPassword"})
        assert res.status_code == 429
        attempt = UserLoginAttempt.query.filter_by(user_id=user_id).first()
        assert attempt.failed_attempts == 5
        assert attempt.blocked_until > get_ist_time()
        print("✓ TEST 10 PASSED: Account locks again for another 15 minutes after 5 new failures")

        # ----------------------------------------------------
        # TEST 11: Reset lock, then wrong password 3 times + correct password
        # ----------------------------------------------------
        attempt.blocked_until = get_ist_time() - datetime.timedelta(seconds=1)
        db.session.commit()
        
        # 3 wrong attempts
        for i in range(3):
            res = client.post('/api/auth/login', json={"email": test_email, "password": "WrongPassword"})
            assert res.status_code == 401
        attempt = UserLoginAttempt.query.filter_by(user_id=user_id).first()
        assert attempt.failed_attempts == 3
        
        # 4th attempt: correct password
        res = client.post('/api/auth/login', json={"email": test_email, "password": test_password})
        assert res.status_code == 200
        attempt = UserLoginAttempt.query.filter_by(user_id=user_id).first()
        assert attempt.failed_attempts == 0
        print("✓ TEST 11 PASSED: 3 wrong + correct password -> login successful & counter reset to 0")

        # ----------------------------------------------------
        # TEST 12: Email login and mobile login for the same user affect same user_id
        # ----------------------------------------------------
        # Attempt 1 via email
        res = client.post('/api/auth/login', json={"email": test_email, "password": "WrongPassword"})
        assert res.status_code == 401
        attempt = UserLoginAttempt.query.filter_by(user_id=user_id).first()
        assert attempt.failed_attempts == 1
        
        # Attempt 2 via mobile number
        res = client.post('/api/auth/login', json={"name": test_phone, "password": "WrongPassword"})
        assert res.status_code == 401
        attempt = UserLoginAttempt.query.filter_by(user_id=user_id).first()
        assert attempt.failed_attempts == 2
        
        # Attempt 3 via user-login route with mobile number
        res = client.post('/api/auth/user-login', json={"name": test_phone, "password": "WrongPassword"})
        assert res.status_code == 401
        attempt = UserLoginAttempt.query.filter_by(user_id=user_id).first()
        assert attempt.failed_attempts == 3
        
        print("✓ TEST 12 PASSED: Email and mobile logins affect the exact same user_id security record")

        # Cleanup test user
        UserLoginAttempt.query.filter_by(user_id=user_id).delete()
        db.session.delete(user_obj)
        db.session.commit()
        print("\n=== ALL 12 TEST CASES PASSED SUCCESSFULLY! ===")

if __name__ == '__main__':
    run_tests()
