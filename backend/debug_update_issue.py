"""
Debug invoice update issue by checking database and backend function
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database.database import SessionLocal
from models.models import Invoice, InvoiceService, InvoicePart

def debug_update_issue():
    """Debug the invoice update issue"""
    db = SessionLocal()
    try:
        print("=== DEBUGGING INVOICE UPDATE ISSUE ===")

        # Check invoice 6 (the one being updated)
        invoice = db.query(Invoice).filter(Invoice.id == 6).first()
        if invoice:
            print(f"\nINVOICE 6 DETAILS:")
            print(f"  ID: {invoice.id}")
            print(f"  Number: {invoice.invoice_number}")
            print(f"  Client ID: {invoice.client_id}")
            print(f"  Vehicle ID: {invoice.vehicle_id}")
            print(f"  Total: {invoice.total_amount}")
            print(f"  Status: {invoice.payment_status}")

            # Check services
            services = db.query(InvoiceService).filter(InvoiceService.invoice_id == 6).all()
            print(f"\nSERVICES ({len(services)}):")
            for service in services:
                print(f"  - Service: {service.service_name}")
                print(f"    Amount: {service.amount}")
                print(f"    Unit Price: {service.unit_price}")
                print(f"    Total Price: {service.total_price}")
                print(f"    Quantity: {service.quantity}")

            # Check parts
            parts = db.query(InvoicePart).filter(InvoicePart.invoice_id == 6).all()
            print(f"\nPARTS ({len(parts)}):")
            for part in parts:
                print(f"  - Part: {part.part_name}")
                print(f"    Cost: {part.cost}")
                print(f"    Unit Price: {part.unit_price}")
                print(f"    Total Price: {part.total_price}")
                print(f"    Quantity: {part.quantity}")
        else:
            print("ERROR: Invoice 6 not found!")

        # Check database constraints
        print("\nDATABASE SCHEMA CHECK:")

        # Check Invoice table structure
        result = db.execute("PRAGMA table_info(invoices)")
        print("Invoice table columns:")
        for row in result:
            col_info = dict(row._mapping)
            required = "REQUIRED" if col_info['notnull'] == 1 else "optional"
            print(f"  - {col_info['name']}: {col_info['type']} ({required})")

        print("\nInvoice Services table columns:")
        result = db.execute("PRAGMA table_info(invoice_services)")
        for row in result:
            col_info = dict(row._mapping)
            required = "REQUIRED" if col_info['notnull'] == 1 else "optional"
            print(f"  - {col_info['name']}: {col_info['type']} ({required})")

    except Exception as e:
        print(f"Error in debug: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_update_issue()