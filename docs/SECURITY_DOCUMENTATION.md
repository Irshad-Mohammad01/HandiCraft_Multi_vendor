# CraftNest — Security Architecture & Data Protection

This document outlines the security controls, cryptographic implementations, authentication safeguards, data protection layers, and threat mitigations deployed across the CraftNest platform.

---

## 1. Cryptographic Standards & Field-Level Encryption

To guarantee patron privacy and mitigate data breach risks, CraftNest implements **Transparent Field-Level Database Encryption (FDE)** for Personally Identifiable Information (PII) using Python's `cryptography` library in `backend/utils/security.py`.

```mermaid
flowchart LR
    subgraph AppMemory ["Application Memory (Plaintext)"]
        Plain["'Priya Sharma', 'patron.priya@gmail.com', 'Flat 402, MG Road'"]
    end

    subgraph CipherEngine ["AES-256-CBC with Deterministic IV"]
        IVGen["Deterministic IV (SHA-256 Digest of Plaintext [:16])"]
        AESCipher["AES-256 Key (ENCRYPTION_KEY)"]
        Padder["PKCS#7 Padding"]
    end

    subgraph DBStorage ["Neon PostgreSQL Storage (Ciphertext)"]
        Encrypted["'BB_ENC:3e8aF1...='"]
    end

    Plain --> IVGen & Padder
    IVGen & AESCipher & Padder --> AESCipher
    AESCipher --> Encrypted
    Encrypted -->|Automatic Decrypt on Model Load| Plain
```

### 1.1 Field-Level Encryption Specifications
- **Cipher Algorithm**: AES-256 in Cipher Block Chaining (CBC) mode with PKCS#7 padding.
- **Key Derivation**: 32-byte (256-bit) cryptographically strong key configured via the `ENCRYPTION_KEY` environment variable.
- **Deterministic IV Generation**: A synthetic 16-byte Initialization Vector (IV) is derived deterministically from the SHA-256 hash of the plaintext. This allows exact database lookups (`filter_by(email=...)`) without decrypting entire database tables, while protecting stored values at rest.
- **Storage Tagging**: All encrypted values are stored with the prefix `BB_ENC:` to enable safe migration and prevent double-encryption.
- **Encrypted Columns**:
  - `users.full_name`
  - `users.email`
  - `users.phone`
  - `delivery_addresses.house_number`, `building_name`, `street`, `area`, `landmark`, `city`, `state`, `pincode`
  - `orders.shipping_address` (via custom `EncryptedJSON` SQLAlchemy type decorator)
  - `support_messages.name`, `support_messages.email`
  - `admins.username`

---

## 2. Password & Credential Hashing

- **Hashing Algorithm**: `bcrypt` (v4.1.3).
- **Work Factor**: Default bcrypt salt generation (`bcrypt.gensalt()`).
- **Storage**: Only the hashed string (starting with `$2b$`) is persisted in `users.password_hash` and `admins.password`. Plaintext passwords are never written to logs or disk.
- **Verification**: Evaluated using constant-time comparison via `bcrypt.checkpw()`, mitigating timing attacks.

---

## 3. Session & Token Architecture

- **Token Format**: JSON Web Token (JWT) signed using HMAC-SHA256 (`HS256`).
- **Validity Window**: Tokens are valid for exactly **24 hours** from issuance (`exp = now + 24 hours`).
- **Signature Secret**: Dynamically sourced from `Config.get_jwt_secret()` (`JWT_SECRET` environment variable). In production, an empty secret causes immediate application startup abort.
- **Token Claims**: Contains authenticated user identity (`user_id`, `admin_id`), administrator flags (`is_admin`), and role assertions (`role`).
- **Token Transmission**:
  - Injected into HTTP headers: `Authorization: Bearer <token>`.
  - Also validated from secure cookies (`bb_token`) with `SameSite=Lax` (dev) or `SameSite=None; Secure` (production).

---

## 4. Brute-Force Throttling & Account Locking

In `backend/routes/auth.py` and `backend/models/user_attempt.py`:
- Tracks consecutive failed password verification attempts per account.
- **Lockout Rule**: If 5 consecutive failed attempts occur within a rolling window:
  - Account is locked for **15 minutes** (`blocked_until = now + 15 minutes`).
  - The API responds with `429 Too Many Requests` (`"error_code": "ACCOUNT_TEMPORARILY_LOCKED"`).
  - Subsequent login attempts are short-circuited before password hashing is performed, preventing CPU exhaustion from bcrypt calculations.
- **Success Reset**: A single successful authentication resets the counter to 0.

---

## 5. Network & API Protection

### 5.1 Strict CORS (Cross-Origin Resource Sharing)
Configured in `backend/cors.py` and `backend/config.py`:
- Wildcard origins (`*`) are **strictly prohibited** when credentials (`withCredentials: true`) are enabled.
- Origins are dynamically validated against explicit whitelists (`FRONTEND_URL` and `ALLOWED_ORIGINS`).
- Allowed headers: `Content-Type`, `Authorization`, `X-Access-Token`, `X-Auth-Token`, `X-Admin-Token`.

### 5.2 SQL Injection Prevention
- All database queries are executed via SQLAlchemy's parameterized Object-Relational Mapping (ORM) and prepared statements.
- Raw string formatting or SQL concatenation is strictly prohibited across the codebase.

### 5.3 File Upload Restrictions
Configured in `backend/config.py` and `backend/utils/uploads.py`:
- **Payload Limit**: `MAX_CONTENT_LENGTH = 100MB` (accommodates high-resolution artisan showcase MP4 videos).
- **Extension Whitelist**: Only validated image formats (`.jpg`, `.jpeg`, `.png`, `.webp`) and video formats (`.mp4`, `.webm`) are accepted.
- **Sanitization**: Filenames are sanitized via Werkzeug's `secure_filename()` before local disk writes, preventing directory traversal attacks (`../../`).

---

## 6. Environment Variables Reference

Below is a complete reference of all environment variables used across the platform.

> [!CAUTION]
> Real passwords, API keys, database URLs, and JWT secrets must NEVER be committed to version control. The examples below are placeholders.

| Variable Name | Required? | Component | Purpose & Safe Placeholder |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | Optional (Def: `DEV`) | Backend Config | Active tier: `DEV`, `QA`, `PROD`. |
| `FRONTEND_URL` | **Required in PROD** | CORS / Redirects| Frontend origin (e.g. `https://craftnest.vercel.app`). Cannot be localhost in PROD. |
| `ALLOWED_ORIGINS` | Optional | CORS | Comma-separated list of additional trusted origins. |
| `DATABASE_URL` / `PROD_DATABASE_URL` | **Required in PROD** | SQLAlchemy | Neon PostgreSQL connection URI (`postgresql://user:pass@host.neon.tech/db?sslmode=require`). |
| `DEV_DATABASE_URL` | Optional (Def: SQLite)| SQLAlchemy | Local connection URI (`sqlite:///<path>/dev.db`). |
| `JWT_SECRET` | **Required in PROD** | Auth / Tokens | 64-character random hex string for signing JWT tokens. |
| `SECRET_KEY` | **Required in PROD** | Flask Core | Session signing secret key. |
| `ENCRYPTION_KEY` | **Required in PROD** | Field Encryption| 32-byte base64-encoded key for AES-256 PII encryption. |
| `ENCRYPTION_KEY_FINGERPRINT`| Optional | Startup Guard | First 16 chars of SHA-256 hash of `ENCRYPTION_KEY` to catch key mismatches. |
| `SMTP_HOST` | Optional (Def: Gmail) | Email Service | SMTP server (`smtp.gmail.com`). |
| `SMTP_PORT` | Optional (Def: 587) | Email Service | SMTP port (587 for TLS). |
| `SMTP_EMAIL` | Optional (Needed for OTP)| Email Service | Gmail sender account (e.g. `system@craftnest.com`). |
| `SMTP_PASSWORD` | Optional (Needed for OTP)| Email Service | Google App Password (16 characters). |
| `CLOUDINARY_CLOUD_NAME` | Optional | Media Storage | Cloudinary account cloud identifier. |
| `CLOUDINARY_API_KEY` | Optional | Media Storage | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Optional | Media Storage | Cloudinary API secret. |
| `RAZORPAY_KEY_ID` | Optional | Payments | Razorpay gateway public key (`rzp_test_...` or `rzp_live_...`). |
| `RAZORPAY_KEY_SECRET` | Optional | Payments | Razorpay gateway private secret. |
| `ENABLE_PAYMENT` | Optional (Def: true/false)| Feature Flags | Toggle gateway payments. |
| `ENABLE_EMAIL` | Optional (Def: true) | Feature Flags | Toggle email delivery. |
| `LOG_LEVEL` | Optional | Logging | Logging verbosity: `DEBUG`, `INFO`, `WARNING`. |

---

## 7. Security Audit Observations & Hardening Recommendations

During code analysis of the existing repository, the following areas were identified for production hardening:

1. **Development JWT Secret Fallback**:
   - In `backend/config.py`, when `ENVIRONMENT == "DEV"`, `JWT_SECRET` defaults to `"development-only-change-me"`.
   - *Status*: Strictly gated behind `if not IS_PROD`. Production startup raises a fatal error if `JWT_SECRET` is unset.
2. **Email Domain Filtering**:
   - `backend/utils/helpers.py` restricts registration to `@gmail.com` and `@outlook.com`.
   - *Recommendation*: While useful for mitigating automated bot spam, this should be expanded or replaced with standard DNS MX record verification before opening to global craft patrons.
3. **Token Revocation / Blocklisting**:
   - JWT tokens are currently stateless and validated via cryptographic signature and expiration.
   - *Recommendation*: Introduce a Redis or database token revocation table (`revoked_tokens`) for instantaneous invalidation on password changes.
