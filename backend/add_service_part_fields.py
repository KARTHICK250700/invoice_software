#!/usr/bin/env python3
"""
Add missing fields to InvoiceService and InvoicePart tables
"""

import sqlite3
import os

def add_missing_fields():
    """Add missing fields to invoice_services and invoice_parts tables"""
    db_path = "database/car_service_center.db"

    if not os.path.exists(db_path):
        print("Database doesn't exist")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Fields for invoice_services table
        service_columns = [
            ("service_name", "VARCHAR(200)"),
            ("amount", "FLOAT"),
            ("hsn_sac_code", "VARCHAR(20) DEFAULT '9986'"),
        ]

        # Fields for invoice_parts table
        part_columns = [
            ("part_name", "VARCHAR(200)"),
            ("cost", "FLOAT"),
            ("hsn_sac_code", "VARCHAR(20) DEFAULT '8708'"),
        ]

        # Check existing columns in invoice_services
        cursor.execute("PRAGMA table_info(invoice_services)")
        existing_service_columns = [row[1] for row in cursor.fetchall()]
        print(f"Existing service columns: {existing_service_columns}")

        # Add missing service columns
        service_added = 0
        for column_name, column_type in service_columns:
            if column_name not in existing_service_columns:
                try:
                    sql = f"ALTER TABLE invoice_services ADD COLUMN {column_name} {column_type}"
                    cursor.execute(sql)
                    print(f"Added service column: {column_name}")
                    service_added += 1
                except sqlite3.Error as e:
                    print(f"Error adding service column {column_name}: {e}")

        # Check existing columns in invoice_parts
        cursor.execute("PRAGMA table_info(invoice_parts)")
        existing_part_columns = [row[1] for row in cursor.fetchall()]
        print(f"Existing part columns: {existing_part_columns}")

        # Add missing part columns
        part_added = 0
        for column_name, column_type in part_columns:
            if column_name not in existing_part_columns:
                try:
                    sql = f"ALTER TABLE invoice_parts ADD COLUMN {column_name} {column_type}"
                    cursor.execute(sql)
                    print(f"Added part column: {column_name}")
                    part_added += 1
                except sqlite3.Error as e:
                    print(f"Error adding part column {column_name}: {e}")

        conn.commit()
        conn.close()
        print(f"\nSuccessfully added {service_added} service columns and {part_added} part columns!")
        return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Adding missing fields to InvoiceService and InvoicePart tables...")
    add_missing_fields()