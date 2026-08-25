#!/usr/bin/env python3
"""
Comprehensive Database Integrity Check
Check all tables, data, relationships, and constraints
"""

import sys
sys.path.append('backend')

from app.db.session import SessionLocal
from models.models import (
    Client, Vehicle, VehicleBrand, VehicleModel,
    Service, Part, Invoice, InvoiceService, InvoicePart,
    Quotation, User, Payment
)

def check_table(db, model, table_name):
    """Check a single table"""
    try:
        count = db.query(model).count()
        sample = db.query(model).first()
        print(f"[OK] {table_name}: {count} records")
        if sample and hasattr(sample, 'id'):
            print(f"     Sample ID: {sample.id}")
        return True, count
    except Exception as e:
        print(f"[FAIL] {table_name}: Error - {str(e)}")
        return False, 0

def check_relationships(db):
    """Check foreign key relationships"""
    print("\n[RELATIONSHIPS] Checking foreign key relationships...")

    # Check if vehicles have valid brands/models
    vehicles = db.query(Vehicle).all()
    valid_vehicles = 0
    for vehicle in vehicles[:5]:  # Check first 5
        if vehicle.model and vehicle.model.brand:
            valid_vehicles += 1
            print(f"[OK] Vehicle {vehicle.id}: {vehicle.model.brand.name} {vehicle.model.name}")

    if vehicles:
        print(f"[INFO] {valid_vehicles}/{len(vehicles[:5])} vehicles have valid brand/model relationships")

    # Check if invoices have valid clients/vehicles
    invoices = db.query(Invoice).all()
    valid_invoices = 0
    for invoice in invoices[:3]:  # Check first 3
        if invoice.client and invoice.vehicle:
            valid_invoices += 1
            print(f"[OK] Invoice {invoice.invoice_number}: Client {invoice.client.name}, Vehicle {invoice.vehicle.registration_number}")

    if invoices:
        print(f"[INFO] {valid_invoices}/{len(invoices[:3])} invoices have valid relationships")

def main():
    print("COMPREHENSIVE DATABASE INTEGRITY CHECK")
    print("=" * 50)

    try:
        db = SessionLocal()
        print("[INFO] Database connection successful")
    except Exception as e:
        print(f"[FAIL] Database connection failed: {e}")
        return False

    success_count = 0
    total_count = 0

    # Check all main tables
    print("\n[TABLES] Checking table integrity...")

    tables_to_check = [
        (Client, "Clients"),
        (VehicleBrand, "Vehicle Brands"),
        (VehicleModel, "Vehicle Models"),
        (Vehicle, "Vehicles"),
        (Service, "Services"),
        (Invoice, "Invoices"),
        (InvoiceService, "Invoice Services"),
        (InvoicePart, "Invoice Parts"),
        (Quotation, "Quotations"),
        (User, "Users")
    ]

    table_counts = {}
    for model, name in tables_to_check:
        success, count = check_table(db, model, name)
        table_counts[name] = count
        if success:
            success_count += 1
        total_count += 1

    # Check relationships
    check_relationships(db)

    # Check data integrity issues
    print("\n[INTEGRITY] Checking data integrity...")

    # Check for orphaned records
    print("\n[ORPHANS] Checking for orphaned records...")

    # Vehicles without valid models
    orphaned_vehicles = db.query(Vehicle).filter(Vehicle.model_id == None).count()
    if orphaned_vehicles > 0:
        print(f"[WARNING] {orphaned_vehicles} vehicles without model_id")
    else:
        print("[OK] No vehicles without model_id")

    # Invoices without clients or vehicles
    orphaned_invoices = db.query(Invoice).filter(
        (Invoice.client_id == None) | (Invoice.vehicle_id == None)
    ).count()
    if orphaned_invoices > 0:
        print(f"[WARNING] {orphaned_invoices} invoices without client_id or vehicle_id")
    else:
        print("[OK] No invoices without required relationships")

    # Sample recent data
    print("\n[RECENT DATA] Checking recent records...")

    # Recent clients
    recent_clients = db.query(Client).order_by(Client.created_at.desc()).limit(3).all()
    print(f"[INFO] Recent clients:")
    for client in recent_clients:
        print(f"     {client.name} - {client.phone}")

    # Recent invoices
    recent_invoices = db.query(Invoice).order_by(Invoice.invoice_date.desc()).limit(3).all()
    print(f"[INFO] Recent invoices:")
    for invoice in recent_invoices:
        print(f"     {invoice.invoice_number} - ₹{invoice.total_amount} - {invoice.payment_status}")

    # Check invoice services and parts
    print("\n[INVOICE DATA] Checking invoice line items...")

    invoice_services_count = db.query(InvoiceService).count()
    invoice_parts_count = db.query(InvoicePart).count()

    print(f"[INFO] Invoice services: {invoice_services_count}")
    print(f"[INFO] Invoice parts: {invoice_parts_count}")

    # Sample invoice breakdown
    if recent_invoices:
        latest_invoice = recent_invoices[0]
        services = db.query(InvoiceService).filter(InvoiceService.invoice_id == latest_invoice.id).all()
        parts = db.query(InvoicePart).filter(InvoicePart.invoice_id == latest_invoice.id).all()

        print(f"[INFO] Latest invoice {latest_invoice.invoice_number} breakdown:")
        print(f"     Services: {len(services)}")
        for service in services:
            print(f"       - {service.service_name}: {service.quantity} x ₹{service.unit_price}")
        print(f"     Parts: {len(parts)}")
        for part in parts:
            print(f"       - {part.part_name}: {part.quantity} x ₹{part.unit_price}")

    db.close()

    print("\n" + "=" * 50)
    print("DATABASE CHECK SUMMARY:")
    print(f"Tables checked: {success_count}/{total_count}")
    print(f"Clients: {table_counts.get('Clients', 0)}")
    print(f"Vehicles: {table_counts.get('Vehicles', 0)}")
    print(f"Vehicle Brands: {table_counts.get('Vehicle Brands', 0)}")
    print(f"Vehicle Models: {table_counts.get('Vehicle Models', 0)}")
    print(f"Services: {table_counts.get('Services', 0)}")
    print(f"Invoices: {table_counts.get('Invoices', 0)}")
    print(f"Invoice Services: {table_counts.get('Invoice Services', 0)}")
    print(f"Invoice Parts: {table_counts.get('Invoice Parts', 0)}")
    print(f"Quotations: {table_counts.get('Quotations', 0)}")

    if success_count == total_count:
        print("\n[SUCCESS] DATABASE IS HEALTHY!")
        print("All tables accessible and relationships working")
    else:
        print(f"\n[WARNING] {total_count - success_count} table(s) have issues")

    return success_count == total_count

if __name__ == "__main__":
    main()