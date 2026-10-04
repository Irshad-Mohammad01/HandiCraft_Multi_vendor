"""Isolated tests for the disabled-by-default mobile OTP provider boundary."""

import unittest
from unittest.mock import patch

from backend.utils.mobile_otp import send_mobile_otp


class MobileOTPDeliveryTests(unittest.TestCase):
    @patch("backend.utils.mobile_otp.Config.ENABLE_MOBILE_OTP", False)
    def test_disabled_feature_is_a_safe_noop(self):
        result = send_mobile_otp("9999999999", "123456", "registration")
        self.assertTrue(result)
        self.assertEqual(result["status"], "disabled")

    @patch("backend.utils.mobile_otp.Config.MOBILE_OTP_PROVIDER", "future-vendor")
    @patch("backend.utils.mobile_otp.Config.ENABLE_MOBILE_OTP", True)
    def test_unknown_paid_provider_fails_closed(self):
        result = send_mobile_otp("9999999999", "123456", "registration")
        self.assertFalse(result)
        self.assertEqual(result["status"], "unsupported_provider")


if __name__ == "__main__":
    unittest.main()
