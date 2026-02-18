"""
Add test service and part data to existing invoices for testing edit functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database.database import SessionLocal
from models.models import InvoiceService, InvoicePart

def add_test_data():
    """Add test services and parts to existing invoices"""
    db = SessionLocal()
    try:
        print("Adding test data to invoices...")

        # Add services to invoice 1
        service1 = InvoiceService(
            invoice_id=1,
            service_id=1,
            service_name="Engine Oil Change",
            amount=1500.0,
            unit_price=1500.0,
            total_price=1500.0,
            quantity=1.0,
            hsn_sac_code="9986"
        )

        service2 = InvoiceService(
            invoice_id=1,
            service_id=2,
            service_name="Brake Pad Replacement",
            amount=2500.0,
            unit_price=2500.0,
            total_price=2500.0,
            quantity=1.0,
            hsn_sac_code="9986"
        )

        # Add parts to invoice 1
        part1 = InvoicePart(
            invoice_id=1,
            part_id=1,
            part_name="Engine Oil Filter",
            cost=300.0,
            unit_price=300.0,
            total_price=600.0,
            quantity=2,
            hsn_sac_code="8708"
        )

        part2 = InvoicePart(
            invoice_id=1,
            part_id=2,
            part_name="Brake Pads",
            cost=1200.0,
            unit_price=1200.0,
            total_price=2400.0,
            quantity=2,
            hsn_sac_code="8708"
        )

        # Add to database
        db.add(service1)
        db.add(service2)
        db.add(part1)
        db.add(part2)

        # Also add some data to invoice 2
        service3 = InvoiceService(
            invoice_id=2,
            service_id=3,
            service_name="Tire Rotation",
            amount=800.0,
            unit_price=800.0,
            total_price=800.0,
            quantity=1.0,
            hsn_sac_code="9986"
        )

        db.add(service3)

        db.commit()
        print("Test data added successfully!")

        # Verify
        services_count = db.query(InvoiceService).filter(InvoiceService.invoice_id == 1).count()
        parts_count = db.query(InvoicePart).filter(InvoicePart.invoice_id == 1).count()
        print(f"Invoice 1 now has {services_count} services and {parts_count} parts")

    except Exception as e:
        print(f"Error adding test data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_test_data()