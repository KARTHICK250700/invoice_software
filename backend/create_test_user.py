"""
Create a test user and get auth token for testing
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database.database import SessionLocal
from models.models import User
from auth.auth import pwd_context, create_access_token

def create_test_user():
    """Create a test user and return auth token"""
    db = SessionLocal()
    try:
        # Check if test user exists
        existing_user = db.query(User).filter(User.username == "test").first()

        if not existing_user:
            print("Creating test user...")
            # Create test user
            hashed_password = pwd_context.hash("test")
            test_user = User(
                username="test",
                hashed_password=hashed_password,
                email="test@example.com",
                full_name="Test User"
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
            user_id = test_user.id
            print(f"Test user created with ID: {user_id}")
        else:
            user_id = existing_user.id
            print(f"Test user already exists with ID: {user_id}")

        # Create access token
        access_token = create_access_token(data={"sub": "test"})
        print(f"Access token: {access_token}")

        return access_token

    except Exception as e:
        print(f"Error creating test user: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    token = create_test_user()
    print(f"\n🔑 Use this token for testing:")
    print(f"Bearer {token}")