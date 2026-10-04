import unittest
import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app
from backend.extensions import db
from backend.models.user import UserModel
from backend.models.user_attempt import UserAttempt
from backend.models.otp_verification import OTPVerification
from backend.utils.timezone import get_ist_time

class TestOTPRateLimit(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

        self.app_context = self.app.app_context()
        self.app_context.push()

        # Test email and password
        self.test_email = "otptestuser@gmail.com"
        self.test_password = "TestPassword123!"

        # Cleanup existing test user and attempt records
        existing_user = UserModel.query.filter_by(email=self.test_email).first()
        if existing_user:
            UserAttempt.query.filter_by(user_id=existing_user.id).delete()
            OTPVerification.query.filter_by(email=self.test_email).delete()
            db.session.delete(existing_user)
            db.session.commit()

        # Create fresh user using UserModel.create_user
        user_dict = UserModel.create_user(
            name="OTP Test User",
            email=self.test_email,
            password=self.test_password,
            mobile="9876543210"
        )
        self.user = UserModel.query.get(int(user_dict["_id"]))

    def tearDown(self):
        if hasattr(self, 'user') and self.user and self.user.id:
            UserAttempt.query.filter_by(user_id=self.user.id).delete()
            OTPVerification.query.filter_by(email=self.test_email).delete()
            UserModel.query.filter_by(id=self.user.id).delete()
            db.session.commit()
        self.app_context.pop()

    def test_otp_request_limit_and_15min_lockout(self):
        """Test that 3 OTP requests within 15 minutes are allowed, and 4th request triggers HTTP 429 and 15-minute block."""
        # 1st request -> allowed (200)
        res1 = self.client.post('/api/auth/forgot-password', json={"email": self.test_email})
        self.assertEqual(res1.status_code, 200)
        self.assertTrue(res1.json.get("success"))

        attempt_rec = UserAttempt.query.filter_by(user_id=self.user.id).first()
        self.assertIsNotNone(attempt_rec)
        self.assertEqual(attempt_rec.otp_request_attempts, 1)

        # 2nd request -> allowed (200)
        res2 = self.client.post('/api/auth/forgot-password', json={"email": self.test_email})
        self.assertEqual(res2.status_code, 200)
        attempt_rec = UserAttempt.query.filter_by(user_id=self.user.id).first()
        self.assertEqual(attempt_rec.otp_request_attempts, 2)

        # 3rd request -> allowed (200)
        res3 = self.client.post('/api/auth/forgot-password', json={"email": self.test_email})
        self.assertEqual(res3.status_code, 200)
        attempt_rec = UserAttempt.query.filter_by(user_id=self.user.id).first()
        self.assertEqual(attempt_rec.otp_request_attempts, 3)

        # 4th request -> blocked (429)
        res4 = self.client.post('/api/auth/forgot-password', json={"email": self.test_email})
        self.assertEqual(res4.status_code, 429)
        self.assertEqual(res4.json.get("message"), "Too many OTP requests. Please try after 15 minutes.")

        attempt_rec = UserAttempt.query.filter_by(user_id=self.user.id).first()
        self.assertIsNotNone(attempt_rec.blocked_at)
        self.assertIsNotNone(attempt_rec.blocked_until)
        self.assertEqual(attempt_rec.reason, "FORGOT_PASSWORD_OTP_LIMIT")

        # 5th request (subsequent attempt while blocked) -> 429
        res5 = self.client.post('/api/auth/forgot-password', json={"email": self.test_email})
        self.assertEqual(res5.status_code, 429)
        self.assertEqual(res5.json.get("message"), "Too many OTP requests. Please try after 15 minutes.")

    def test_resend_otp_also_enforces_limit(self):
        """Test that resending password reset OTP also counts towards the 3-request limit."""
        # 1st request via forgot-password
        self.client.post('/api/auth/forgot-password', json={"email": self.test_email})
        
        # 2nd request via resend-reset-otp
        res2 = self.client.post('/api/auth/resend-reset-otp', json={"email": self.test_email})
        self.assertEqual(res2.status_code, 200)

        # 3rd request via resend-reset-otp
        res3 = self.client.post('/api/auth/resend-reset-otp', json={"email": self.test_email})
        self.assertEqual(res3.status_code, 200)

        # 4th request via resend-reset-otp -> 429 Blocked
        res4 = self.client.post('/api/auth/resend-reset-otp', json={"email": self.test_email})
        self.assertEqual(res4.status_code, 429)
        self.assertEqual(res4.json.get("message"), "Too many OTP requests. Please try after 15 minutes.")

    def test_automatic_lock_expiry(self):
        """Test that after blocked_until expires, OTP requests are allowed again and counter resets."""
        now = get_ist_time()
        past_time = now - timedelta(minutes=20)
        attempt_rec = UserAttempt(
            user_id=self.user.id,
            otp_request_attempts=3,
            first_otp_request_at=past_time,
            last_otp_request_at=past_time,
            blocked_at=past_time,
            blocked_until=past_time + timedelta(minutes=15), # Expired 5 mins ago
            reason="FORGOT_PASSWORD_OTP_LIMIT",
            updated_at=past_time
        )
        db.session.add(attempt_rec)
        db.session.commit()

        # Request OTP -> Should automatically unblock and allow (200)
        res = self.client.post('/api/auth/forgot-password', json={"email": self.test_email})
        self.assertEqual(res.status_code, 200)

        updated_rec = UserAttempt.query.filter_by(user_id=self.user.id).first()
        self.assertIsNone(updated_rec.blocked_until)
        self.assertIsNone(updated_rec.reason)
        self.assertEqual(updated_rec.otp_request_attempts, 1)

    def test_independent_login_and_otp_counters(self):
        """Test that failed password logins and OTP requests are tracked separately and use distinct reasons."""
        # Make 2 failed login attempts
        for _ in range(2):
            self.client.post('/api/auth/login', json={"email": self.test_email, "password": "WrongPassword!"})

        attempt_rec = UserAttempt.query.filter_by(user_id=self.user.id).first()
        self.assertEqual(attempt_rec.failed_login_attempts, 2)
        self.assertEqual(attempt_rec.otp_request_attempts, 0)

        # Make 2 OTP requests
        for _ in range(2):
            self.client.post('/api/auth/forgot-password', json={"email": self.test_email})

        attempt_rec = UserAttempt.query.filter_by(user_id=self.user.id).first()
        self.assertEqual(attempt_rec.failed_login_attempts, 2)
        self.assertEqual(attempt_rec.otp_request_attempts, 2)

if __name__ == '__main__':
    unittest.main()
