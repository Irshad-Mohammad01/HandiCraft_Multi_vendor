import os
import smtplib
import threading
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app
from backend.config import Config
from backend.utils.email_templates import (
    get_forgot_password_otp_html,
    get_order_confirmation_html,
    get_buy_request_approval_html,
    get_registration_otp_html,
    get_order_status_update_html,
    get_support_reply_html,
)

class EmailDeliveryStatus(dict):
    def __bool__(self):
        return bool(self.get("success", False))

def _log_email_to_db(recipient, subject, email_type, status, failure_reason=None):
    """
    Safely records an email log entry into the database.
    Does not crash or interrupt application flow if logging fails.
    """
    try:
        from backend.app import app
        from backend.extensions import db
        from backend.models.email_log import EmailLog

        with app.app_context():
            log_entry = EmailLog(
                recipient=str(recipient),
                subject=str(subject),
                email_type=str(email_type),
                status=str(status),
                failure_reason=str(failure_reason) if failure_reason else None
            )
            db.session.add(log_entry)
            db.session.commit()
    except Exception as ex:
        print(f"[EMAIL LOGGING WARNING] Could not persist email log to database: {ex}")


def send_email_smtp(to_email, subject, body, email_type="GENERAL", is_html=True, max_retries=2):
    """
    Core SMTP transmission function using Python's built-in smtplib.
    Handles connection, TLS, authentication, retries, and database logging.
    """
    # Recipients validation
    if not to_email or "@" not in str(to_email):
        err = f"Invalid recipient email address: {to_email}"
        print(f"[SMTP ERROR] {err}")
        _log_email_to_db(to_email or "UNKNOWN", subject, email_type, "FAILED", err)
        return EmailDeliveryStatus({
            "success": False,
            "status": "failed",
            "error": err
        })

    # In DEV environment or when SMTP is disabled: NEVER fail or require SMTP credentials
    if Config.IS_DEV or not getattr(Config, "SMTP_ENABLED", True) or getattr(Config, "EMAIL_PROVIDER", "") == "console":
        print(f"[DEV EMAIL - CONSOLE] Type: {email_type} | To: {to_email} | Subject: {subject}")
        _log_email_to_db(to_email, subject, email_type, "SENT", "DEV Mode - Console Delivery")
        return EmailDeliveryStatus({
            "success": True,
            "status": "dev_console_delivered",
            "recipient": to_email,
            "error": None
        })

    # Retrieve configuration
    smtp_host = Config.SMTP_HOST
    smtp_port = Config.SMTP_PORT
    smtp_user = Config.SMTP_EMAIL
    smtp_password = Config.SMTP_PASSWORD
    smtp_tls = Config.SMTP_TLS
    sender_email = Config.SMTP_FROM

    # Security check: Password missing
    if not smtp_password:
        err = "SMTP password is not configured in environment variables (SMTP_PASSWORD / EMAIL_APP_PASSWORD)."
        print(f"[SMTP WARNING] {err}")
        _log_email_to_db(to_email, subject, email_type, "FAILED", err)
        return EmailDeliveryStatus({
            "success": False,
            "status": "failed",
            "error": err
        })

    # Construct MIME message safely
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = str(subject)
        msg["From"] = sender_email
        msg["To"] = str(to_email)

        # Content type
        if is_html or "<html>" in str(body).lower():
            msg.attach(MIMEText(body, "html", "utf-8"))
        else:
            msg.attach(MIMEText(body, "plain", "utf-8"))
    except Exception as err_mime:
        err = f"Failed to construct MIME message: {err_mime}"
        print(f"[SMTP ERROR] {err}")
        _log_email_to_db(to_email, subject, email_type, "FAILED", err)
        return EmailDeliveryStatus({"success": False, "status": "failed", "error": err})

    # Retry loop for resilient SMTP transmission
    attempt = 0
    last_error = None

    while attempt <= max_retries:
        attempt += 1
        try:
            print(f"[SMTP EMAIL] Connection attempt {attempt}/{max_retries + 1}...")
            
            # Choose SSL vs TLS
            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
                if smtp_tls:
                    server.starttls()

            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, [to_email], msg.as_string())
            server.quit()

            print("[SMTP SUCCESS] Email successfully sent.")
            _log_email_to_db(to_email, subject, email_type, "SENT")
            return EmailDeliveryStatus({
                "success": True,
                "status": "delivered",
                "recipient": to_email,
                "error": None
            })
        except Exception as ex:
            last_error = str(ex)
            print(f"[SMTP RETRY WARNING] Attempt {attempt} failed: {last_error}")
            if attempt <= max_retries:
                time.sleep(1.5)

    final_err = f"SMTP transmission failed after {max_retries + 1} attempts: {last_error}"
    print(f"[SMTP ERROR] {final_err}")
    _log_email_to_db(to_email, subject, email_type, "FAILED", final_err)
    return EmailDeliveryStatus({
        "success": False,
        "status": "failed",
        "recipient": to_email,
        "error": final_err
    })


def send_email(to_email, subject, body, email_type="GENERAL", is_html=True, sync=False):
    """
    Centralized entry point for sending emails.
    Can run synchronously or asynchronously in a daemon thread.
    """
    if not Config.ENABLE_EMAIL:
        print("[EMAIL SYSTEM] Send skipped: ENABLE_EMAIL is off.")
        _log_email_to_db(to_email, subject, email_type, "DISABLED", "ENABLE_EMAIL feature flag is OFF")
        return EmailDeliveryStatus({"success": True, "status": "disabled", "error": None})

    if sync:
        return send_email_smtp(to_email, subject, body, email_type=email_type, is_html=is_html)
    else:
        # Non-blocking async execution
        thread = threading.Thread(
            target=send_email_smtp,
            args=(to_email, subject, body),
            kwargs={"email_type": email_type, "is_html": is_html},
            daemon=True
        )
        thread.start()
        return EmailDeliveryStatus({"success": True, "status": "queued_async", "error": None})


# --- Specialized Trigger Functions ---

def send_forgot_password_otp(to_email, otp_code, name=None):
    """
    Feature 1 — Sends Password Reset OTP email.
    Respects ENABLE_EMAIL_FORGOT_PASSWORD_OTP flag.
    """
    if Config.IS_DEV or not getattr(Config, "SMTP_ENABLED", True) or getattr(Config, "EMAIL_PROVIDER", "") == "console":
        print(f"[DEV FORGOT PASSWORD OTP] To: {to_email} | OTP: {otp_code}")
        _log_email_to_db(to_email, "SSJewellery Password Reset OTP", "FORGOT_PASSWORD_OTP", "SENT", "DEV Console")
        return EmailDeliveryStatus({"success": True, "status": "dev_console_delivered", "dev_otp": otp_code})

    if not getattr(Config, "ENABLE_EMAIL_FORGOT_PASSWORD_OTP", True):
        print("[EMAIL SYSTEM] Password reset email skipped by feature flag.")
        _log_email_to_db(to_email, "SSJewellery Password Reset OTP", "FORGOT_PASSWORD_OTP", "DISABLED")
        return EmailDeliveryStatus({"success": True, "status": "disabled"})

    subject = "SSJewellery Password Reset OTP"
    html_body = get_forgot_password_otp_html(name, otp_code)
    # Password reset needs synchronous execution or quick delivery confirmation
    return send_email(to_email, subject, html_body, email_type="FORGOT_PASSWORD_OTP", is_html=True, sync=True)


def send_order_confirmation(to_email, order):
    """
    Feature 3 — Sends Order Confirmation email.
    Respects ENABLE_EMAIL_ORDER_CONFIRMATION flag.
    Executed asynchronously so order placement is NEVER delayed.
    """
    if not getattr(Config, "ENABLE_EMAIL_ORDER_CONFIRMATION", True):
        print("[EMAIL SYSTEM] Order confirmation email skipped by feature flag.")
        _log_email_to_db(to_email, "Your SSJewellery Order Has Been Confirmed", "ORDER_CONFIRMATION", "DISABLED")
        return EmailDeliveryStatus({"success": True, "status": "disabled"})

    # Clean dummy/guest email domains
    if not to_email or "@SSJewellery.com" in str(to_email) or "@admin.local" in str(to_email):
        print("[EMAIL SYSTEM] Order confirmation email skipped for a placeholder address.")
        return EmailDeliveryStatus({"success": True, "status": "skipped_dummy_email"})

    subject = "Your SSJewellery Order Has Been Confirmed"
    user_name = (order.get("shipping_address") or {}).get("name") or "Valued Customer"
    html_body = get_order_confirmation_html(user_name, order)
    
    # Asynchronous dispatch
    return send_email(to_email, subject, html_body, email_type="ORDER_CONFIRMATION", is_html=True, sync=False)


def send_buy_request_approval(to_email, product_name, request_id, quantity=1, availability_date=None, delivery_date=None, admin_note=None, name=None):
    """
    Feature 4 — Sends Buy Request Approval email.
    Respects ENABLE_EMAIL_BUY_REQUEST_CONFIRMATION flag.
    """
    if not getattr(Config, "ENABLE_EMAIL_BUY_REQUEST_CONFIRMATION", True):
        print("[EMAIL SYSTEM] Buy request confirmation email skipped by feature flag.")
        _log_email_to_db(to_email, "Your Buy Request Has Been Approved", "BUY_REQUEST_APPROVAL", "DISABLED")
        return EmailDeliveryStatus({"success": True, "status": "disabled"})

    if not to_email or "@SSJewellery.com" in str(to_email) or "@admin.local" in str(to_email):
        print("[EMAIL SYSTEM] Buy request email skipped for a placeholder address.")
        return EmailDeliveryStatus({"success": True, "status": "skipped_dummy_email"})

    subject = "Your Buy Request Has Been Approved"
    html_body = get_buy_request_approval_html(
        name=name,
        product_name=product_name,
        request_id=request_id,
        quantity=quantity,
        availability_date=availability_date,
        delivery_date=delivery_date,
        admin_note=admin_note
    )
    return send_email(to_email, subject, html_body, email_type="BUY_REQUEST_APPROVAL", is_html=True, sync=False)


def send_registration_otp(to_email, otp_code, name=None):
    """
    Feature 2 — Registration OTP Email (Disabled by default in DEV, enabled in QA/PROD).
    """
    if Config.IS_DEV or not getattr(Config, "SMTP_ENABLED", True) or getattr(Config, "EMAIL_PROVIDER", "") == "console":
        print(f"[DEV REGISTRATION OTP] To: {to_email} | OTP: {otp_code}")
        _log_email_to_db(to_email, "SSJewellery Registration Code", "REGISTRATION_OTP", "SENT", "DEV Console")
        return EmailDeliveryStatus({"success": True, "status": "dev_console_delivered", "dev_otp": otp_code})

    if not getattr(Config, "ENABLE_EMAIL_REGISTRATION_OTP", False) and not getattr(Config, "SMTP_ENABLED", False):
        print("[EMAIL SYSTEM] Registration OTP email skipped by feature flag.")
        _log_email_to_db(to_email, "SSJewellery Registration Code", "REGISTRATION_OTP", "DISABLED")
        return EmailDeliveryStatus({"success": True, "status": "disabled"})

    subject = "SSJewellery Registration Code"
    html_body = get_registration_otp_html(name, otp_code)
    return send_email(to_email, subject, html_body, email_type="REGISTRATION_OTP", is_html=True, sync=True)


def send_order_status_update(to_email, name, order_id, status, message=None, tracking_id=None, tracking_url=None, delivery_date=None):
    subject = f"Order {order_id} Update: {status}"
    html_body = get_order_status_update_html(
        name=name,
        order_id=order_id,
        status=status,
        message=message,
        tracking_id=tracking_id,
        tracking_url=tracking_url,
        delivery_date=delivery_date,
    )
    return send_email(to_email, subject, html_body, email_type="ORDER_STATUS_UPDATE", is_html=True, sync=True)


def send_support_ticket_reply(to_email, name, ticket_id, original_message, reply_message):
    subject = f"Reply to Your SSJewellery Support Ticket #{ticket_id}"
    html_body = get_support_reply_html(name, ticket_id, original_message, reply_message)
    return send_email(to_email, subject, html_body, email_type="SUPPORT_TICKET_REPLY", is_html=True, sync=True)
