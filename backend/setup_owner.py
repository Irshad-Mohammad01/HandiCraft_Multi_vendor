import os
import sys
import getpass
import argparse
import bcrypt
from dotenv import load_dotenv

# Ensure backend package can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from backend.app import app
from backend.extensions import db
from backend.models.user import UserModel
from backend.models.admin import AdminModel

def setup_owner(name=None, email=None, mobile=None, password=None):
    with app.app_context():
        # Check if an owner already exists in Neon PostgreSQL
        existing_owner = UserModel.query.filter(
            (UserModel.role == 'owner') | (UserModel.is_admin == True)
        ).first()

        if existing_owner:
            print(f"[CRAFTNEST] Main Owner record already exists in database:")
            print(f"  Name: {existing_owner.full_name or existing_owner.name}")
            print(f"  Email: {existing_owner.email}")
            print(f"  Role: {existing_owner.role}")
            print("To maintain single source of truth, duplicate Main Owners cannot be created.")
            return existing_owner

        # Prompt for credentials if not supplied via arguments
        if not name:
            name = input("Enter Owner Full Name: ").strip()
        if not email:
            email = input("Enter Owner Email: ").strip().lower()
        if not mobile:
            mobile = input("Enter Owner Mobile Number: ").strip()
        if not password:
            password = getpass.getpass("Enter Owner Password: ").strip()

        if not name or not email or not password:
            print("Error: Name, Email, and Password are required to set up the Main Owner.")
            sys.exit(1)

        # Hash password securely with bcrypt
        salt = bcrypt.gensalt()
        pw_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

        # Create Owner in users table
        owner_user = UserModel(
            full_name=name,
            email=email,
            phone=mobile or "",
            password_hash=pw_hash,
            role="owner",
            is_admin=True,
            email_verified=True,
            first_login=False
        )
        db.session.add(owner_user)

        # Also create in admins table for backwards compatibility
        existing_admin = AdminModel.query.filter_by(username=email).first()
        if not existing_admin:
            admin_rec = AdminModel(
                username=email,
                password=pw_hash
            )
            db.session.add(admin_rec)

        db.session.commit()
        print("\n[CRAFTNEST] SUCCESS: Main Owner created successfully in Neon PostgreSQL!")
        print(f"  Owner ID: {owner_user.id}")
        print(f"  Name: {owner_user.full_name}")
        print(f"  Email: {owner_user.email}")
        print(f"  Role: {owner_user.role}")
        print("Neon PostgreSQL is now initialized with your production Main Owner account.\n")
        return owner_user

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Secure Setup for CraftNest Main Owner")
    parser.add_argument('--name', help="Owner Full Name")
    parser.add_argument('--email', help="Owner Email Address")
    parser.add_argument('--mobile', help="Owner Mobile Number")
    parser.add_argument('--password', help="Owner Password")
    args = parser.parse_args()

    setup_owner(
        name=args.name,
        email=args.email,
        mobile=args.mobile,
        password=args.password
    )
