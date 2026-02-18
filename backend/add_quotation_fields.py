"""
Migration script to add discount and tax_rate columns to quotation_items table
"""
import sqlite3
import os
from pathlib import Path

# Get the directory where this script is located
current_dir = Path(__file__).parent
db_path = current_dir / "database" / "car_service_center.db"

def add_quotation_item_fields():
    """Add discount and tax_rate columns to quotation_items table"""
    print(f"Looking for database at: {db_path}")

    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        return False

    try:
        # Connect to the SQLite database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("Connected to database successfully")

        # Check if columns already exist
        cursor.execute("PRAGMA table_info(quotation_items)")
        columns = [row[1] for row in cursor.fetchall()]
        print(f"Current columns in quotation_items: {columns}")

        # Add discount column if it doesn't exist
        if 'discount' not in columns:
            try:
                cursor.execute('ALTER TABLE quotation_items ADD COLUMN discount REAL DEFAULT 0.0')
                print("SUCCESS: Added 'discount' column to quotation_items table")
            except Exception as e:
                print(f"ERROR: Failed to add 'discount' column: {e}")
        else:
            print("SUCCESS: 'discount' column already exists")

        # Add tax_rate column if it doesn't exist
        if 'tax_rate' not in columns:
            try:
                cursor.execute('ALTER TABLE quotation_items ADD COLUMN tax_rate REAL DEFAULT 18.0')
                print("SUCCESS: Added 'tax_rate' column to quotation_items table")
            except Exception as e:
                print(f"ERROR: Failed to add 'tax_rate' column: {e}")
        else:
            print("SUCCESS: 'tax_rate' column already exists")

        # Commit changes
        conn.commit()

        # Verify the changes
        cursor.execute("PRAGMA table_info(quotation_items)")
        columns_after = [row[1] for row in cursor.fetchall()]
        print(f"Updated columns in quotation_items: {columns_after}")

        conn.close()
        print("Database migration completed successfully!")
        return True

    except Exception as e:
        print(f"Database migration failed: {e}")
        return False

if __name__ == "__main__":
    print("Starting database migration for quotation_items table...")
    success = add_quotation_item_fields()
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")