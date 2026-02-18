#!/usr/bin/env python3
"""
Database migration script to recreate the database with new Invoice model fields.
"""

import os
import sqlite3
from database.database import engine, Base
from models.models import *

def backup_and_recreate_database():
    """Backup existing data and recreate database with new schema"""
    db_path = "database/car_service_center.db"
    backup_path = "database/car_service_center_backup.db"

    try:
        # Create backup if database exists
        if os.path.exists(db_path):
            print("Creating backup of existing database...")
            os.system(f'copy "{db_path}" "{backup_path}"')

            # Remove original database
            try:
                os.remove(db_path)
                print("Original database removed successfully")
            except PermissionError:
                print("Cannot remove database file - it's being used by another process")
                print("Please stop all servers and try again")
                return False

        # Create new database with updated schema
        print("Creating new database with updated schema...")
        Base.metadata.create_all(bind=engine)
        print("New database created successfully with all new fields!")

        return True

    except Exception as e:
        print(f"Error during migration: {e}")
        return False

if __name__ == "__main__":
    print("Starting database migration...")
    if backup_and_recreate_database():
        print("Migration completed successfully!")
        print("You can now restart the server.")
    else:
        print("Migration failed!")