"""Provider boundary for a future paid mobile OTP integration.

No external SMS vendor is enabled by this module today. OTP values are never
logged. Add a provider implementation and register it only when vendor
credentials, delivery callbacks, rate limits, and billing controls are ready.
"""

from backend.config import Config


class MobileOTPDeliveryStatus(dict):
    def __bool__(self):
        return bool(self.get("success", False))


class DisabledMobileOTPProvider:
    name = "disabled"

    def send(self, mobile, otp_code, purpose):
        del mobile, otp_code, purpose
        return MobileOTPDeliveryStatus({
            "success": False,
            "status": "provider_not_configured",
            "provider": self.name,
        })


_PROVIDERS = {
    "disabled": DisabledMobileOTPProvider,
}


def send_mobile_otp(mobile, otp_code, purpose="login"):
    """Send through the configured paid provider when the feature is enabled."""
    if not Config.ENABLE_MOBILE_OTP:
        return MobileOTPDeliveryStatus({
            "success": True,
            "status": "disabled",
            "provider": "disabled",
        })

    provider_name = Config.MOBILE_OTP_PROVIDER
    provider_class = _PROVIDERS.get(provider_name)
    if provider_class is None:
        return MobileOTPDeliveryStatus({
            "success": False,
            "status": "unsupported_provider",
            "provider": provider_name,
        })

    if not mobile:
        return MobileOTPDeliveryStatus({
            "success": False,
            "status": "missing_mobile",
            "provider": provider_name,
        })

    return provider_class().send(mobile, otp_code, purpose)
