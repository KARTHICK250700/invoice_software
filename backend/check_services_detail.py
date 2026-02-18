"""
Check services in detail to see which invoices they belong to
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database.database import SessionLocal
from models.models import InvoiceService

def check_services_detail():
    """Check services in detail"""
    db = SessionLocal()
    try:
        print("Checking all services in database...")

        services = db.query(InvoiceService).all()
        print(f"Found {len(services)} services")

        for service in services:
            print(f"Service ID: {service.id}")
            print(f"  Invoice ID: {service.invoice_id}")
            print(f"  Service ID: {service.service_id}")
            print(f"  Service Name: {service.service_name}")
            print(f"  Amount: {service.amount}")
            print(f"  Unit Price: {service.unit_price}")
            print(f"  Total Price: {service.total_price}")
            print(f"  Quantity: {service.quantity}")
            print("---")

    except Exception as e:
        print(f"Error checking services: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    check_services_detail()