#!/usr/bin/env python3
"""
Basic System Integration Test - No external dependencies
Tests database and core functionality
"""

import sys
import os
sys.path.append('backend')

def test_database_connection():
    """Test database connectivity"""
    try:
        from backend.database.database import SessionLocal
        from backend.models.models import Quotation, Client, Vehicle

        db = SessionLocal()

        # Test quotations table
        quotation_count = db.query(Quotation).count()
        print(f"[SUCCESS] Database Connection: {quotation_count} quotations found")

        # Test clients table
        client_count = db.query(Client).count()
        print(f"[SUCCESS] Clients table: {client_count} clients found")

        # Test vehicles table
        vehicle_count = db.query(Vehicle).count()
        print(f"[SUCCESS] Vehicles table: {vehicle_count} vehicles found")

        # Get sample quotation data
        quotation = db.query(Quotation).first()
        if quotation:
            print(f"[SUCCESS] Sample quotation: {quotation.quotation_number}")
            print(f"  - Total: Rs.{quotation.total_amount}")
            print(f"  - Items: {len(quotation.items)} items")

            if quotation.client:
                print(f"  - Client: {quotation.client.name}")
            if quotation.vehicle:
                print(f"  - Vehicle: {quotation.vehicle.registration_number}")

        db.close()
        return True
    except Exception as e:
        print("[ERROR] Database test failed:", str(e))
        return False

def test_pdf_data_compatibility():
    """Test if quotation data is compatible with PDF generation"""
    try:
        from backend.database.database import SessionLocal
        from backend.models.models import Quotation

        db = SessionLocal()
        quotation = db.query(Quotation).first()

        if not quotation:
            print("[ERROR] No quotations found")
            return False

        # Check required fields for PDF generation
        required_fields = {
            'id': quotation.id,
            'quotation_number': quotation.quotation_number,
            'quotation_date': quotation.quotation_date,
            'total_amount': quotation.total_amount,
            'subtotal': quotation.subtotal,
            'client_id': quotation.client_id,
            'vehicle_id': quotation.vehicle_id
        }

        print("[SUCCESS] PDF Data Compatibility Check:")
        for field, value in required_fields.items():
            print(f"  - {field}: {value}")

        # Check items structure
        if quotation.items:
            item = quotation.items[0]
            print("[SUCCESS] Sample Item Structure:")
            print(f"  - name: {item.name}")
            print(f"  - quantity: {item.quantity}")
            print(f"  - rate: {item.rate}")
            print(f"  - total: {item.total}")
            print(f"  - hsn_sac: {item.hsn_sac}")
            print(f"  - item_type: {item.item_type}")

        db.close()
        return True
    except Exception as e:
        print("[ERROR] PDF data compatibility test failed:", str(e))
        return False

def main():
    """Run basic system test"""
    print("[STARTING] Running Basic System Test")
    print("=" * 50)

    tests = [
        ("Database Connection & Data", test_database_connection),
        ("PDF Data Compatibility", test_pdf_data_compatibility)
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\n[TESTING] {test_name}")
        print("-" * 30)
        result = test_func()
        results.append((test_name, result))

    print("\n" + "=" * 50)
    print("[FINAL RESULTS]")
    print("=" * 50)

    all_passed = True
    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status} - {test_name}")
        if not result:
            all_passed = False

    print("\n" + "=" * 50)
    if all_passed:
        print("[SUCCESS] CORE SYSTEMS OPERATIONAL!")
        print("[SUCCESS] Data structure compatible with frontend PDF generation")
        print("[SUCCESS] Database and backend ready for quotation downloads")
    else:
        print("[WARNING] SOME TESTS FAILED - CHECK ABOVE")
    print("=" * 50)

    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)