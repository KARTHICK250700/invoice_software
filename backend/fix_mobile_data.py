#!/usr/bin/env python3
"""
Fix Mobile Data Script
This script removes the unique constraint issue by updating empty mobile fields to NULL
"""
import sys
sys.path.append('.')

from app.db.session import SessionLocal
from models.models import Client
from sqlalchemy import text

def fix_mobile_data():
    """Fix mobile data in the database"""
    db = SessionLocal()
    try:
        print("FIXING Mobile Data...")

        # First, let's see what we have
        result = db.execute(text("SELECT id, name, mobile FROM clients WHERE mobile = ''"))
        empty_mobiles = result.fetchall()
        print(f"Found {len(empty_mobiles)} clients with empty mobile strings")

        for client in empty_mobiles:
            print(f"  - ID: {client[0]}, Name: {client[1]}, Mobile: '{client[2]}'")

        # Update empty mobile strings to NULL
        result = db.execute(text("UPDATE clients SET mobile = NULL WHERE mobile = ''"))
        print(f"Updated {result.rowcount} records")

        # Drop the unique index if it exists
        try:
            db.execute(text("DROP INDEX ix_clients_mobile"))
            print("Dropped unique index ix_clients_mobile")
        except Exception as e:
            print(f"Index might not exist or already dropped: {e}")

        # Create a non-unique index for performance
        try:
            db.execute(text("CREATE INDEX ix_clients_mobile_new ON clients(mobile)"))
            print("Created new non-unique index")
        except Exception as e:
            print(f"Index creation warning: {e}")

        db.commit()
        print("SUCCESS: Mobile data fixed successfully!")

        # Verify the fix
        result = db.execute(text("SELECT COUNT(*) FROM clients WHERE mobile = ''"))
        empty_count = result.fetchone()[0]
        print(f"Remaining empty mobile strings: {empty_count}")

        result = db.execute(text("SELECT COUNT(*) FROM clients WHERE mobile IS NULL"))
        null_count = result.fetchone()[0]
        print(f"NULL mobile entries: {null_count}")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_mobile_data()