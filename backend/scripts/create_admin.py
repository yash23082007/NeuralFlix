"""
NeuralFlix Admin Creation Script — scripts/create_admin.py

Creates an admin user in the database. Run manually, never exposed as HTTP endpoint.

Usage:
    ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secure_password python scripts/create_admin.py

Or on Windows:
    set ADMIN_EMAIL=admin@example.com
    set ADMIN_PASSWORD=secure_password
    python scripts/create_admin.py
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime

# Add parent directory to path so we can import from the backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


async def create_admin():
    admin_email = os.environ.get("ADMIN_EMAIL")
    admin_password = os.environ.get("ADMIN_PASSWORD")

    if not admin_email or not admin_password:
        print("ERROR: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.")
        print()
        print("Usage:")
        print("  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secure_password python scripts/create_admin.py")
        sys.exit(1)

    if len(admin_password) < 8:
        print("ERROR: Admin password must be at least 8 characters.")
        sys.exit(1)

    import bcrypt
    from database import users_collection

    # Check if admin already exists
    existing = await users_collection.find_one({"email": admin_email})
    if existing:
        if existing.get("is_admin"):
            print(f"Admin user already exists: {admin_email}")
        else:
            # Promote existing user to admin
            await users_collection.update_one(
                {"email": admin_email},
                {"$set": {"is_admin": True}}
            )
            print(f"Existing user promoted to admin: {admin_email}")
        return

    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(admin_password.encode("utf-8"), salt).decode("utf-8")

    user_doc = {
        "id": str(uuid.uuid4()),
        "email": admin_email,
        "name": "NeuralFlix Admin",
        "hashed_password": hashed_password,
        "is_admin": True,
        "created_at": datetime.utcnow(),
    }
    await users_collection.insert_one(user_doc)
    print(f"Admin user created successfully: {admin_email}")
    print(f"User ID: {user_doc['id']}")


if __name__ == "__main__":
    asyncio.run(create_admin())
