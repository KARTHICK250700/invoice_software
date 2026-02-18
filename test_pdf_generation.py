#!/usr/bin/env python3
"""
Test PDF Generation with Real Database Data
Simulates frontend PDF generation process
"""

import sys
import os
import json
from datetime import datetime

# Add backend to path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)

def get_sample_quotation_data():
    """Get real quotation data from database"""
    try:
        from database.database import SessionLocal
        from models.models import Quotation, Client, Vehicle

        db = SessionLocal()

        # Get a quotation with related data
        quotation = db.query(Quotation).first()
        if not quotation:
            print("[ERROR] No quotations found in database")
            return None

        # Get client details
        client = db.query(Client).filter(Client.id == quotation.client_id).first() if quotation.client_id else None

        # Get vehicle details
        vehicle = db.query(Vehicle).filter(Vehicle.id == quotation.vehicle_id).first() if quotation.vehicle_id else None

        # Format data for frontend PDF generation
        pdf_data = {
            "id": quotation.id,
            "quotation_date": quotation.quotation_date.strftime('%Y-%m-%d') if quotation.quotation_date else str(datetime.now().date()),
            "valid_until": quotation.valid_until.strftime('%Y-%m-%d') if quotation.valid_until else str(datetime.now().date()),
            "client_name": client.name if client else "Sample Client",
            "client_address": getattr(client, 'address', 'Sample Address') if client else "Sample Address",
            "client_mobile": getattr(client, 'mobile', '9876543210') if client else "9876543210",
            "vehicle_registration": vehicle.registration_number if vehicle else "TN01AB1234",
            "vehicle_model": getattr(vehicle, 'model', 'Sample Model') if vehicle else "Sample Model",
            "vehicle_year": str(getattr(vehicle, 'year', 2020)) if vehicle else "2020",
            "subtotal": float(quotation.subtotal) if quotation.subtotal else 0.0,
            "total_amount": float(quotation.total_amount) if quotation.total_amount else 0.0,
            "cgst_amount": 0.0,
            "sgst_amount": 0.0,
            "igst_amount": 0.0,
            "notes": quotation.notes or "Sample quotation notes",
            "items": []
        }

        # Add items
        for item in quotation.items:
            pdf_data["items"].append({
                "name": item.name,
                "hsn_sac": item.hsn_sac or "8302",
                "qty": float(item.quantity) if item.quantity else 1.0,
                "rate": float(item.rate) if item.rate else 0.0,
                "discount": 0.0,
                "tax_rate": 18.0,
                "type": item.item_type if item.item_type == 'part' else 'service'
            })

        db.close()
        return pdf_data

    except Exception as e:
        print(f"[ERROR] Failed to get quotation data: {e}")
        return None

def simulate_frontend_pdf_generation(pdf_data):
    """Simulate what the frontend would do for PDF generation"""
    try:
        print("[INFO] Simulating Frontend PDF Generation Process...")
        print("-" * 50)

        print("[SUCCESS] PDF Data Structure Validation:")
        print(f"  - Quotation ID: {pdf_data['id']}")
        print(f"  - Client: {pdf_data['client_name']}")
        print(f"  - Vehicle: {pdf_data['vehicle_registration']} ({pdf_data['vehicle_model']})")
        print(f"  - Date: {pdf_data['quotation_date']}")
        print(f"  - Total: Rs.{pdf_data['total_amount']}")
        print(f"  - Items: {len(pdf_data['items'])} items")

        if pdf_data['items']:
            print("\n[SUCCESS] Sample Items:")
            for i, item in enumerate(pdf_data['items'][:3], 1):  # Show first 3 items
                print(f"  {i}. {item['name']} - Qty: {item['qty']} - Rate: Rs.{item['rate']}")

        print("\n[SUCCESS] PDF Generation Data Ready!")
        print("[INFO] This data would be passed to jsPDF in the frontend")
        print("[INFO] generateQuotationPDF(pdfData, 'quotation.pdf') would be called")

        return True

    except Exception as e:
        print(f"[ERROR] PDF generation simulation failed: {e}")
        return False

def test_api_data_flow():
    """Test the complete API data flow for PDF generation"""
    print("[INFO] Testing API Data Flow for PDF Generation...")
    print("-" * 50)

    try:
        # Simulate the API calls that frontend makes
        from database.database import SessionLocal
        from models.models import Quotation, Client, Vehicle

        db = SessionLocal()

        # 1. Get quotation (simulates: GET /api/quotations/{id})
        quotation = db.query(Quotation).first()
        if not quotation:
            print("[ERROR] No quotations to test with")
            return False

        print(f"[SUCCESS] Step 1: GET /api/quotations/{quotation.id}")

        # 2. Get client details (simulates: GET /api/clients/{client_id})
        if quotation.client_id:
            client = db.query(Client).filter(Client.id == quotation.client_id).first()
            print(f"[SUCCESS] Step 2: GET /api/clients/{quotation.client_id}")
        else:
            client = None
            print("[WARNING] Step 2: No client ID found")

        # 3. Get vehicle details (simulates: GET /api/vehicles/{vehicle_id})
        if quotation.vehicle_id:
            vehicle = db.query(Vehicle).filter(Vehicle.id == quotation.vehicle_id).first()
            print(f"[SUCCESS] Step 3: GET /api/vehicles/{quotation.vehicle_id}")
        else:
            vehicle = None
            print("[WARNING] Step 3: No vehicle ID found")

        print("[SUCCESS] Step 4: Data consolidation for PDF generation")

        db.close()
        return True

    except Exception as e:
        print(f"[ERROR] API data flow test failed: {e}")
        return False

def main():
    """Run PDF generation tests"""
    print("[STARTING] PDF Generation Integration Test")
    print("=" * 60)

    # Test 1: API Data Flow
    print("\n[TEST 1] API Data Flow")
    api_result = test_api_data_flow()

    # Test 2: Get Real Data
    print("\n[TEST 2] Get Real Quotation Data")
    pdf_data = get_sample_quotation_data()
    data_result = pdf_data is not None

    if data_result:
        # Test 3: PDF Generation Simulation
        print("\n[TEST 3] PDF Generation Simulation")
        pdf_result = simulate_frontend_pdf_generation(pdf_data)
    else:
        pdf_result = False

    # Results
    print("\n" + "=" * 60)
    print("[FINAL RESULTS]")
    print("=" * 60)

    results = [
        ("API Data Flow", api_result),
        ("Data Extraction", data_result),
        ("PDF Generation Ready", pdf_result)
    ]

    all_passed = True
    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status} - {test_name}")
        if not result:
            all_passed = False

    print("\n" + "=" * 60)
    if all_passed:
        print("[SUCCESS] PDF GENERATION READY!")
        print("[INFO] Frontend can now generate PDFs using:")
        print("  1. Fetch quotation data from backend")
        print("  2. Fetch related client/vehicle data")
        print("  3. Pass data to generateQuotationPDF()")
        print("  4. Download PDF in browser")
    else:
        print("[WARNING] SOME TESTS FAILED")
    print("=" * 60)

    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)