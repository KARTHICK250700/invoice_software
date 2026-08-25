#!/usr/bin/env python3
"""
Database Inspection Tool
Run this to check your database tables and data
"""
import sys
sys.path.append('.')

from app.db.session import SessionLocal
from models.models import *
from sqlalchemy import inspect, text
import pandas as pd

def check_database():
    """Comprehensive database check"""
    db = SessionLocal()
    try:
        print("DATABASE INSPECTION REPORT")
        print("=" * 50)

        # 1. Connection Test
        print("\n1. CONNECTION TEST:")
        result = db.execute(text("SELECT VERSION() as version"))
        version = result.fetchone()[0]
        print(f"   OK MySQL Version: {version}")

        # 2. Database Info
        result = db.execute(text("SELECT DATABASE() as db_name"))
        db_name = result.fetchone()[0]
        print(f"   OK Current Database: {db_name}")

        # 3. List all tables
        print("\n2. TABLES:")
        inspector = inspect(db.bind)
        tables = inspector.get_table_names()
        for table in tables:
            print(f"   TABLE: {table}")

        # 4. Table counts
        print("\n3. DATA COUNTS:")

        # Clients
        client_count = db.query(Client).count()
        print(f"   CLIENTS: {client_count}")
        if client_count > 0:
            clients = db.query(Client).limit(3).all()
            for client in clients:
                print(f"      - {client.name} ({client.email})")

        # Vehicles
        vehicle_count = db.query(Vehicle).count()
        print(f"   VEHICLES: {vehicle_count}")
        if vehicle_count > 0:
            vehicles = db.query(Vehicle).limit(3).all()
            for vehicle in vehicles:
                print(f"      - Model ID: {vehicle.model_id} ({vehicle.registration_number})")

        # Services
        service_count = db.query(Service).count()
        print(f"   SERVICES: {service_count}")
        if service_count > 0:
            services = db.query(Service).limit(3).all()
            for service in services:
                print(f"      - {service.name} (Rs.{service.price})")

        # Invoices
        invoice_count = db.query(Invoice).count()
        print(f"   INVOICES: {invoice_count}")
        if invoice_count > 0:
            invoices = db.query(Invoice).limit(3).all()
            for invoice in invoices:
                print(f"      - {invoice.invoice_number} (Rs.{invoice.total_amount})")

        print("\n4. SAMPLE DATA:")
        if client_count > 0:
            print("\n   Recent Clients:")
            clients = db.query(Client).order_by(Client.created_at.desc()).limit(5).all()
            for client in clients:
                print(f"      {client.id:2d} | {client.name:20s} | {client.phone:15s} | {client.email}")

        print("\nOK Database inspection complete!")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_database()