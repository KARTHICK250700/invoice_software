"""
Fix existing invoices by adding proper client_id and vehicle_id relationships
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database.database import SessionLocal, engine
from models.models import Invoice, Client, Vehicle, VehicleBrand, VehicleModel

def fix_invoice_relationships():
    """Fix existing invoices by adding client and vehicle relationships"""
    db = SessionLocal()
    try:
        print("Starting invoice relationship fix...")

        # Check existing invoices
        invoices = db.query(Invoice).all()
        print(f"Found {len(invoices)} invoices")

        if not invoices:
            print("No invoices found to fix")
            return

        # Check if we already have clients and vehicles
        existing_client = db.query(Client).first()
        existing_vehicle = db.query(Vehicle).first()

        # Create sample client if none exists
        if not existing_client:
            print("Creating sample client...")
            client = Client(
                name="Karthick",
                phone="+91 9876543210",
                mobile="+91 9876543210",
                email="karthick@example.com",
                address="123 Main Street, Chennai",
                city="Chennai",
                state="Tamil Nadu",
                pincode="600001"
            )
            db.add(client)
            db.flush()
            client_id = client.id
        else:
            client_id = existing_client.id
            print(f"Using existing client: {existing_client.name} (ID: {client_id})")

        # Create sample vehicle if none exists
        if not existing_vehicle:
            print("Creating sample vehicle...")

            # Get or create a vehicle brand and model
            brand = db.query(VehicleBrand).filter_by(name="Maruti Suzuki").first()
            if not brand:
                brand = VehicleBrand(name="Maruti Suzuki", country="India")
                db.add(brand)
                db.flush()

            model = db.query(VehicleModel).filter_by(brand_id=brand.id, name="Swift").first()
            if not model:
                model = VehicleModel(
                    brand_id=brand.id,
                    name="Swift",
                    year_start=2010,
                    fuel_type="Petrol",
                    transmission="Manual"
                )
                db.add(model)
                db.flush()

            vehicle = Vehicle(
                client_id=client_id,
                model_id=model.id,
                registration_number="TN01AB1234",
                year=2020,
                color="White",
                fuel_type="Petrol"
            )
            db.add(vehicle)
            db.flush()
            vehicle_id = vehicle.id
        else:
            vehicle_id = existing_vehicle.id
            # Make sure the vehicle belongs to our client
            if existing_vehicle.client_id != client_id:
                existing_vehicle.client_id = client_id
            print(f"Using existing vehicle: {existing_vehicle.registration_number} (ID: {vehicle_id})")

        # Update all invoices with the client_id and vehicle_id
        updated_count = 0
        for invoice in invoices:
            needs_update = False

            if not invoice.client_id:
                invoice.client_id = client_id
                needs_update = True
                print(f"Setting client_id={client_id} for invoice {invoice.invoice_number}")

            if not invoice.vehicle_id:
                invoice.vehicle_id = vehicle_id
                needs_update = True
                print(f"Setting vehicle_id={vehicle_id} for invoice {invoice.invoice_number}")

            if needs_update:
                updated_count += 1

        # Commit all changes
        db.commit()
        print(f"Successfully updated {updated_count} invoices with proper client/vehicle relationships")

        # Verify the fix
        print("\nVerification:")
        for invoice in db.query(Invoice).all():
            print(f"Invoice {invoice.invoice_number}: client_id={invoice.client_id}, vehicle_id={invoice.vehicle_id}")

        print("Invoice relationship fix completed successfully!")

    except Exception as e:
        print(f"Error fixing invoice relationships: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    fix_invoice_relationships()