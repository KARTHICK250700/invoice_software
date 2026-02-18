#!/usr/bin/env python3
"""
Add comprehensive payment fields to Invoice table
"""

import sqlite3
import os

def add_payment_fields():
    """Add payment-related fields to Invoice table"""
    db_path = "database/car_service_center.db"

    if not os.path.exists(db_path):
        print("Database doesn't exist")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # List of new payment-related columns to add
        payment_columns = [
            # Payment Details
            ("payment_method", "VARCHAR(50) DEFAULT 'Cash'"),  # Cash, Card, UPI, Bank Transfer, Cheque
            ("payment_reference", "VARCHAR(100)"),  # Transaction ID, Cheque number, etc.
            ("payment_date", "DATETIME"),  # When payment was made
            ("payment_notes", "TEXT"),  # Payment specific notes

            # Advanced Payment Status
            ("payment_type", "VARCHAR(20) DEFAULT 'Full'"),  # Full, Partial, Advance
            ("advance_amount", "FLOAT DEFAULT 0.0"),  # Advance payment amount
            ("advance_date", "DATETIME"),  # When advance was paid

            # Additional Payment Fields
            ("payment_due_days", "INTEGER DEFAULT 30"),  # Payment due in X days
            ("late_fee_applicable", "BOOLEAN DEFAULT 0"),  # Late fee applicable
            ("late_fee_amount", "FLOAT DEFAULT 0.0"),  # Late fee amount
            ("early_payment_discount", "FLOAT DEFAULT 0.0"),  # Early payment discount

            # Customer Payment Info
            ("preferred_payment_method", "VARCHAR(50)"),  # Customer's preferred method
            ("credit_limit", "FLOAT DEFAULT 0.0"),  # Customer credit limit
            ("credit_days", "INTEGER DEFAULT 0"),  # Credit period days

            # Invoice Unique Features
            ("invoice_unique_id", "VARCHAR(50) UNIQUE"),  # Unique invoice ID (different from number)
            ("mobile_invoice_sent", "BOOLEAN DEFAULT 0"),  # SMS sent status
            ("email_invoice_sent", "BOOLEAN DEFAULT 0"),  # Email sent status
            ("whatsapp_sent", "BOOLEAN DEFAULT 0"),  # WhatsApp sent status

            # Additional Contact
            ("customer_mobile_alt", "VARCHAR(15)"),  # Alternative mobile number
            ("customer_email_alt", "VARCHAR(100)"),  # Alternative email
        ]

        # Check which columns already exist
        cursor.execute("PRAGMA table_info(invoices)")
        existing_columns = [row[1] for row in cursor.fetchall()]
        print(f"Existing columns: {len(existing_columns)} found")

        # Add missing columns
        added_count = 0
        for column_name, column_type in payment_columns:
            if column_name not in existing_columns:
                try:
                    sql = f"ALTER TABLE invoices ADD COLUMN {column_name} {column_type}"
                    cursor.execute(sql)
                    print(f"Added column: {column_name}")
                    added_count += 1
                except sqlite3.Error as e:
                    print(f"Error adding column {column_name}: {e}")

        conn.commit()
        conn.close()
        print(f"\nSuccessfully added {added_count} new payment columns!")
        return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Adding comprehensive payment fields to Invoice table...")
    add_payment_fields()