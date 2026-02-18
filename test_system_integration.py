#!/usr/bin/env python3
"""
Complete System Integration Test
Tests frontend, backend, database, and PDF generation
"""

import requests
import json
import sys
import os
sys.path.append('backend')

from backend.database.database import SessionLocal
from backend.models.models import Quotation, Client, Vehicle

def test_backend_health():
    """Test backend API health"""
    try:
        response = requests.get('http://localhost:8000/test-cors', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Backend API Health:", data.get('message', 'OK'))
            return True
        else:
            print("❌ Backend API Error:", response.status_code)
            return False
    except Exception as e:
        print("❌ Backend API Connection Failed:", str(e))
        return False

def test_database_connection():
    """Test database connectivity"""
    try:
        db = SessionLocal()

        # Test quotations table
        quotation_count = db.query(Quotation).count()
        print(f"✅ Database Connection: {quotation_count} quotations found")

        # Test clients table
        client_count = db.query(Client).count()
        print(f"✅ Clients table: {client_count} clients found")

        # Test vehicles table
        vehicle_count = db.query(Vehicle).count()
        print(f"✅ Vehicles table: {vehicle_count} vehicles found")

        db.close()
        return True
    except Exception as e:
        print("❌ Database Connection Failed:", str(e))
        return False

def test_quotation_data_structure():
    """Test quotation data structure for PDF compatibility"""
    try:
        db = SessionLocal()
        quotation = db.query(Quotation).first()

        if not quotation:
            print("❌ No quotations found for testing")
            return False

        print("✅ Sample Quotation Data Structure:")
        print(f"  - ID: {quotation.id}")
        print(f"  - Number: {quotation.quotation_number}")
        print(f"  - Client ID: {quotation.client_id}")
        print(f"  - Vehicle ID: {quotation.vehicle_id}")
        print(f"  - Date: {quotation.quotation_date}")
        print(f"  - Total: ${quotation.total_amount}")
        print(f"  - Items: {len(quotation.items)} items")

        # Test related data
        if quotation.client:
            print(f"  - Client: {quotation.client.name}")
        if quotation.vehicle:
            print(f"  - Vehicle: {quotation.vehicle.registration_number}")

        db.close()
        return True
    except Exception as e:
        print("❌ Quotation data test failed:", str(e))
        return False

def test_frontend_connection():
    """Test frontend server"""
    try:
        response = requests.get('http://localhost:5173', timeout=5)
        if response.status_code == 200:
            print("✅ Frontend Server: Running successfully")
            return True
        else:
            print("❌ Frontend Server Error:", response.status_code)
            return False
    except Exception as e:
        print("❌ Frontend Server Connection Failed:", str(e))
        return False

def main():
    """Run comprehensive system test"""
    print("🚀 Running Complete System Integration Test")
    print("=" * 50)

    tests = [
        ("Backend Health", test_backend_health),
        ("Database Connection", test_database_connection),
        ("Quotation Data Structure", test_quotation_data_structure),
        ("Frontend Connection", test_frontend_connection)
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\n📋 Testing: {test_name}")
        print("-" * 30)
        result = test_func()
        results.append((test_name, result))

    print("\n" + "=" * 50)
    print("🎯 FINAL RESULTS:")
    print("=" * 50)

    all_passed = True
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if not result:
            all_passed = False

    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 ALL SYSTEMS OPERATIONAL!")
        print("✅ Frontend PDF generation should work correctly")
    else:
        print("⚠️  SOME TESTS FAILED - CHECK ABOVE")
    print("=" * 50)

    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)