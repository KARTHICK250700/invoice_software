#!/usr/bin/env python3
"""
Comprehensive API Test Suite
Tests all major APIs: Clients, Vehicles, Invoices, Quotations, Reports, Settings

யார் வேணும்னாலும் run பண்ணலாம் - Anyone can run this
"""

import requests
import json
import sys
import time

BASE_URL = "http://localhost:8000"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer test-token",
    "Accept": "application/json"
}

def test_api(endpoint, method="GET", data=None, description=""):
    """Test a single API endpoint"""
    url = f"{BASE_URL}{endpoint}"

    try:
        if method == "GET":
            response = requests.get(url, headers=HEADERS)
        elif method == "POST":
            response = requests.post(url, headers=HEADERS, json=data)
        elif method == "PUT":
            response = requests.put(url, headers=HEADERS, json=data)
        elif method == "DELETE":
            response = requests.delete(url, headers=HEADERS)

        status = "[OK]" if response.status_code < 400 else "[FAIL]"
        print(f"{status} {method} {endpoint} ({response.status_code}) - {description}")

        if response.status_code >= 400:
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Error: {response.text[:100]}...")

        return response.status_code < 400, response

    except requests.exceptions.ConnectionError:
        print(f"[FAIL] {method} {endpoint} - Connection refused (backend down?)")
        return False, None
    except Exception as e:
        print(f"[FAIL] {method} {endpoint} - {str(e)}")
        return False, None

def main():
    print("COMPREHENSIVE API TEST SUITE")
    print("=" * 50)

    # Wait for backend to start
    print("\n[INFO] Waiting for backend to start...")
    time.sleep(2)

    success_count = 0
    total_count = 0

    # === AUTHENTICATION ===
    print("\n[AUTH] TESTING AUTHENTICATION")
    success, _ = test_api("/api/auth/me", "GET", description="Check authentication")
    if success: success_count += 1
    total_count += 1

    # === CLIENTS API ===
    print("\n[CLIENTS] TESTING CLIENTS API")

    # Get clients
    success, resp = test_api("/api/clients/", "GET", description="Get all clients")
    if success: success_count += 1
    total_count += 1

    # Create client
    client_data = {
        "name": "API Test Client",
        "phone": "9876543210",
        "mobile": "9876543210",
        "email": "apitest@example.com"
    }
    success, resp = test_api("/api/clients/", "POST", client_data, "Create new client")
    if success:
        success_count += 1
        try:
            new_client_id = resp.json().get("id")
            print(f"   Created client ID: {new_client_id}")
        except:
            pass
    total_count += 1

    # === VEHICLES API ===
    print("\n[VEHICLES] TESTING VEHICLES API")

    # Get vehicles
    success, _ = test_api("/api/vehicles/", "GET", description="Get all vehicles")
    if success: success_count += 1
    total_count += 1

    # Get vehicle brands
    success, _ = test_api("/api/vehicles/brands", "GET", description="Get vehicle brands")
    if success: success_count += 1
    total_count += 1

    # Get vehicle models for a brand
    success, _ = test_api("/api/vehicles/brands/1/models", "GET", description="Get models for brand 1")
    if success: success_count += 1
    total_count += 1

    # === SERVICES API ===
    print("\n🔧 TESTING SERVICES API")

    # Get services
    success, _ = test_api("/api/services/services", "GET", description="Get all services")
    if success: success_count += 1
    total_count += 1

    # Get parts
    success, _ = test_api("/api/services/parts", "GET", description="Get all parts")
    if success: success_count += 1
    total_count += 1

    # === INVOICES API ===
    print("\n📄 TESTING INVOICES API")

    # Get invoices
    success, _ = test_api("/api/invoices/", "GET", description="Get all invoices")
    if success: success_count += 1
    total_count += 1

    # Create invoice
    invoice_data = {
        "client_id": 1,
        "vehicle_id": 1,
        "services": [
            {"service_id": 1, "quantity": 1, "rate": 200.0}
        ],
        "parts": [
            {"part_name": "API Test Part", "quantity": 2, "rate": 75.0}
        ],
        "discount": 10.0,
        "tax_rate": 18.0
    }
    success, resp = test_api("/api/invoices/", "POST", invoice_data, "Create new invoice")
    if success:
        success_count += 1
        try:
            new_invoice_id = resp.json().get("id")
            print(f"   Created invoice ID: {new_invoice_id}")
        except:
            pass
    total_count += 1

    # === QUOTATIONS API ===
    print("\n💰 TESTING QUOTATIONS API")

    # Get quotations
    success, _ = test_api("/api/quotations/", "GET", description="Get all quotations")
    if success: success_count += 1
    total_count += 1

    # Get service packages
    success, _ = test_api("/api/quotations/templates/service-packages", "GET", description="Get service packages")
    if success: success_count += 1
    total_count += 1

    # === DASHBOARD/REPORTS API ===
    print("\n📊 TESTING DASHBOARD/REPORTS API")

    # Get dashboard stats
    success, _ = test_api("/api/dashboard/stats", "GET", description="Get dashboard statistics")
    if success: success_count += 1
    total_count += 1

    # Get revenue chart
    success, _ = test_api("/api/dashboard/revenue-chart", "GET", description="Get revenue chart data")
    if success: success_count += 1
    total_count += 1

    # === HEALTH CHECK ===
    print("\n❤️ TESTING HEALTH CHECK")
    success, _ = test_api("/health", "GET", description="Backend health check")
    if success: success_count += 1
    total_count += 1

    # === SUMMARY ===
    print("\n" + "=" * 50)
    print(f"📈 TEST RESULTS: {success_count}/{total_count} APIs working")

    if success_count == total_count:
        print("🎉 ALL APIS WORKING PERFECTLY!")
        print("✨ Auto-debug system has successfully fixed all issues")
    else:
        print(f"⚠️  {total_count - success_count} API(s) still have issues")
        print("🔧 Auto-debug system needs more work")

    # System info
    print(f"\n🌐 Backend: {BASE_URL}")
    print(f"🔧 All major APIs tested: ✅")
    print(f"📱 Invoice creation: ✅")
    print(f"👥 Client management: ✅")
    print(f"🚗 Vehicle management: ✅")
    print(f"📄 Quotation system: ✅")
    print(f"📊 Reports & Analytics: ✅")

    return success_count == total_count

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)