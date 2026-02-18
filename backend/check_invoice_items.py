"""
Check if invoices have services and parts data
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database.database import SessionLocal
from models.models import Invoice, InvoiceService, InvoicePart

def check_invoice_items():
    """Check if invoices have services and parts"""
    db = SessionLocal()
    try:
        print("Checking invoice items...")

        # Get all invoices
        invoices = db.query(Invoice).all()
        print(f"Found {len(invoices)} invoices")

        for invoice in invoices[:3]:  # Check first 3 invoices
            print(f"\nInvoice #{invoice.invoice_number} (ID: {invoice.id}):")
            print(f"  Client ID: {invoice.client_id}")
            print(f"  Vehicle ID: {invoice.vehicle_id}")
            print(f"  Total Amount: {invoice.total_amount}")

            # Check services
            services = db.query(InvoiceService).filter(InvoiceService.invoice_id == invoice.id).all()
            print(f"  Services: {len(services)}")
            for service in services:
                print(f"    - Service ID: {service.service_id}, Name: {service.service_name}, Price: {service.total_price}")

            # Check parts
            parts = db.query(InvoicePart).filter(InvoicePart.invoice_id == invoice.id).all()
            print(f"  Parts: {len(parts)}")
            for part in parts:
                print(f"    - Part ID: {part.part_id}, Name: {part.part_name}, Price: {part.total_price}")

        # Check total counts
        total_services = db.query(InvoiceService).count()
        total_parts = db.query(InvoicePart).count()
        print(f"\nDatabase totals:")
        print(f"  Total services: {total_services}")
        print(f"  Total parts: {total_parts}")

    except Exception as e:
        print(f"Error checking invoice items: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    check_invoice_items()