# CraftNest — Local Development & Deployment Setup Guide

This guide walks a developer through setting up, configuring, running, and testing the CraftNest handicraft marketplace on a local workstation.

---

## 1. Prerequisites

Ensure your system has the following tools installed:
- **Node.js**: `v18.0.0` or higher (`node -v`)
- **npm**: `v9.0.0` or higher (`npm -v`)
- **Python**: `v3.10` or higher (`python3 --version`)
- **Git**: For source version control
- **PostgreSQL** *(Optional)*: Recommended for production testing; local SQLite is bundled for zero-dependency dev.

---

## 2. Backend Installation & Setup

### Step 2.1: Navigate to Backend & Create Virtual Environment
```bash
cd backend
python3 -m venv venv

# On Linux/macOS:
source venv/bin/activate

# On Windows (cmd/PowerShell):
# venv\Scripts\activate
```

### Step 2.2: Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 2.3: Configure Backend Environment Variables
Create a file named `.env` in the `backend/` directory:
```bash
touch .env
```

Add the following development template:
```env
# Runtime Environment
ENVIRONMENT=DEV
LOG_LEVEL=DEBUG

# Port & Network
PORT=5005
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173

# Database (Leave blank to automatically use bundled SQLite dev.db)
# To use Neon PostgreSQL, uncomment and insert your connection URL:
# DATABASE_URL=postgresql://user:password@ep-sample-123.neon.tech/craftnest?sslmode=require

# Cryptography & Security Secrets
JWT_SECRET=development-only-change-me-64-character-jwt-secret-string-here
SECRET_KEY=development-only-change-me-flask-secret-key-string-here
ENCRYPTION_KEY=ZGV2ZWxvcG1lbnQtb25seS1lbmNyeXB0aW9uLWtleQ==

# Gmail SMTP Email Dispatch (Optional for local OTP testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_TLS=True
SMTP_EMAIL=your-gmail@gmail.com
SMTP_PASSWORD=your-16-char-app-password
ENABLE_EMAIL=true

# Feature Flags
ENABLE_PAYMENT=false
ENABLE_SMS=false
ENABLE_OTP=true
EXPOSE_OTP_IN_RESPONSE=true
```

> [!TIP]
> In local development mode (`ENVIRONMENT=DEV` and `EXPOSE_OTP_IN_RESPONSE=true`), generated OTP codes are included in API responses and logged to the console, allowing you to register accounts and test login without an active Gmail SMTP password.

### Step 2.4: Bootstrap Database & Initial Seeds
```bash
# Initialize local SQLite schema and seed standard categories and artisan listings:
flask --app app.py bootstrap-dev

# Alternatively, execute the seed script:
python seed_craftnest.py
```

### Step 2.5: Bootstrap Main Owner Account
```bash
python setup_owner.py
```
This utility ensures a super-administrative owner exists in the database.

### Step 2.6: Run Database Integrity Tests
Verify the installation by running the 12-step multi-role integrity test:
```bash
python test_database_driven_marketplace.py
```

### Step 2.7: Launch the Flask Backend Server
```bash
python app.py
```
*The backend API starts on `http://127.0.0.1:5005`.*

---

## 3. Frontend Installation & Setup

### Step 3.1: Navigate to Frontend & Install Dependencies
Open a second terminal window:
```bash
cd frontend
npm install
```

### Step 3.2: Configure Frontend Environment Variables (Optional)
By default, the frontend automatically falls back to `http://localhost:5005/api` via `frontend/src/api/client.js`. To explicitly set it, create `.env` in `frontend/`:
```env
VITE_API_BASE_URL=http://localhost:5005/api
```

### Step 3.3: Launch Vite Development Server
```bash
npm run dev
```
*The frontend application starts on `http://localhost:5173`.*

---

## 4. Verification & First Login

1. Open your browser and navigate to `http://localhost:5173`.
2. Click **Sign In** in the top navigation bar (or navigate to `http://localhost:5173/login`).
3. You can authenticate with any of the configured seed personas:
   - **Main Owner**: Access full governance, artisan onboarding, and global metrics at `/owner/dashboard`.
   - **Artisan Seller**: Access workshop metrics, inventory listings, and order fulfillments at `/seller/dashboard`.
   - **Customer**: Browse handcrafted goods, add to cart, and place orders with delivery address tracking at `/account`.

---

## 5. Production Build & Deployment Guide

### 5.1 Frontend Production Build
To generate an optimized, minified production distribution bundle:
```bash
cd frontend
npm run build
```
The output is generated in `frontend/dist/`. 
- **Deploying to Vercel**: Vercel reads `frontend/vercel.json` and routes all requests to `index.html`.
- **Deploying to Netlify / Render**: Point the publish directory to `frontend/dist` with SPA rewrite rules enabled.

### 5.2 Backend Production Deployment (Gunicorn)
In production, run the Flask backend using the pre-fork Gunicorn WSGI server:
```bash
cd backend
gunicorn --bind 0.0.0.0:5005 --workers 4 --threads 2 backend.app:app
```

### 5.3 Mandatory Production Environment Checks
When `ENVIRONMENT=PROD`, the backend automatically enforces strict startup checks:
1. `FRONTEND_URL` must be defined and **cannot** point to `localhost` or `127.0.0.1`.
2. `PROD_DATABASE_URL` must use PostgreSQL with SSL enabled (`sslmode=require`).
3. `JWT_SECRET`, `SECRET_KEY`, and `ENCRYPTION_KEY` must be strong, production-grade non-default values.
4. If `ENABLE_EMAIL=true`, `SMTP_EMAIL` and `SMTP_PASSWORD` must be provided.

If any check fails, application startup is safely aborted to protect against insecure deployment.

---

## 6. Troubleshooting Common Issues

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **CORS Error in Browser Console** | `FRONTEND_URL` does not match the browser port. | Ensure `FRONTEND_URL` in `backend/.env` exactly matches your frontend port (e.g. `http://localhost:5173`). |
| **Database Connection Failure** | PostgreSQL URI or SSL parameter incorrect. | Verify that your Neon database link includes `?sslmode=require` and valid credentials. |
| **Login 429 Too Many Requests** | Account locked due to 5 consecutive failed attempts. | Wait 15 minutes, or clear the row in the `user_attempts` table for that user ID. |
| **Port 5005 Already in Use** | Another backend instance or process is running. | Run `lsof -i :5005` and terminate the orphaned process, or set `PORT=5006` in `.env`. |
