#!/usr/bin/env python3
"""
Script to add missing columns to existing Invoice table
"""

import sqlite3
import os

def add_missing_columns():
    """Add missing columns to Invoice table"""
    db_path = "database/car_service_center.db"

    if not os.path.exists(db_path):
        print("Database doesn't exist")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # List of new columns to add to Invoice table
        new_columns = [
            ("gst_enabled", "BOOLEAN DEFAULT 1"),
            ("cgst_rate", "FLOAT DEFAULT 9.0"),
            ("sgst_rate", "FLOAT DEFAULT 9.0"),
            ("igst_rate", "FLOAT DEFAULT 18.0"),
            ("cgst_amount", "FLOAT DEFAULT 0.0"),
            ("sgst_amount", "FLOAT DEFAULT 0.0"),
            ("igst_amount", "FLOAT DEFAULT 0.0"),
            ("round_off", "FLOAT DEFAULT 0.0"),
            ("service_type", "VARCHAR(100)"),
            ("km_reading_in", "INTEGER"),
            ("km_reading_out", "INTEGER"),
            ("challan_no", "VARCHAR(50)"),
            ("challan_date", "DATETIME"),
            ("eway_bill_no", "VARCHAR(50)"),
            ("transport", "VARCHAR(100)"),
            ("transport_id", "VARCHAR(50)"),
            ("place_of_supply", "VARCHAR(100) DEFAULT 'Tamil Nadu (33)'"),
            ("hsn_sac_code", "VARCHAR(20) DEFAULT '8302'"),
            ("technician_name", "VARCHAR(100)"),
            ("work_order_no", "VARCHAR(50)"),
            ("estimate_no", "VARCHAR(50)"),
            ("insurance_claim", "BOOLEAN DEFAULT 0"),
            ("warranty_applicable", "BOOLEAN DEFAULT 0"),
            ("unique_access_code", "VARCHAR(50) UNIQUE"),
            ("qr_code_url", "VARCHAR(255)")
        ]

        # Check which columns already exist
        cursor.execute("PRAGMA table_info(invoices)")
        existing_columns = [row[1] for row in cursor.fetchall()]
        print(f"Existing columns: {existing_columns}")

        # Add missing columns
        for column_name, column_type in new_columns:
            if column_name not in existing_columns:
                try:
                    sql = f"ALTER TABLE invoices ADD COLUMN {column_name} {column_type}"
                    cursor.execute(sql)
                    print(f"Added column: {column_name}")
                except sqlite3.Error as e:
                    print(f"Error adding column {column_name}: {e}")

        conn.commit()
        conn.close()
        print("Successfully added missing columns!")
        return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Adding missing columns to Invoice table...")
    add_missing_columns()