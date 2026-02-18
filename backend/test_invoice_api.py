"""
Test the invoice API endpoint directly without authentication
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import asyncio
from sqlalchemy.orm import Session
from database.database import SessionLocal
from routers.invoices import get_invoice
from models.models import Invoice, InvoiceService, InvoicePart, Client, Vehicle

async def test_invoice_api():
    """Test the invoice API directly"""
    db = SessionLocal()
    try:
        print("Testing invoice API endpoint...")

        # Create a mock user object (since we're bypassing auth)
        class MockUser:
            id = 1

        mock_user = MockUser()

        # Test with invoice 6 (has services)
        invoice_id = 6
        print(f"\nTesting invoice ID: {invoice_id}")

        try:
            result = await get_invoice(invoice_id, db, mock_user)
            print("API Response:")
            print(f"  Invoice Number: {result['invoice_number']}")
            print(f"  Client ID: {result['client_id']}")
            print(f"  Vehicle ID: {result['vehicle_id']}")
            print(f"  Total Amount: {result['total_amount']}")
            print(f"  Items count: {len(result['items'])}")

            if result['items']:
                print("  Items:")
                for item in result['items']:
                    print(f"    - {item['type']}: {item['name']}, Qty: {item['quantity']}, Price: {item['unit_price']}, Total: {item['total']}")
            else:
                print("  No items found!")

            print(f"  Client: {result['client']['name'] if result['client']['id'] else 'No client'}")
            print(f"  Vehicle: {result['vehicle']['registration_number'] if result['vehicle']['id'] else 'No vehicle'}")

        except Exception as e:
            print(f"Error testing invoice {invoice_id}: {e}")

        # Also test with invoice 1 (no services)
        invoice_id = 1
        print(f"\nTesting invoice ID: {invoice_id}")

        try:
            result = await get_invoice(invoice_id, db, mock_user)
            print("API Response:")
            print(f"  Invoice Number: {result['invoice_number']}")
            print(f"  Client ID: {result['client_id']}")
            print(f"  Vehicle ID: {result['vehicle_id']}")
            print(f"  Total Amount: {result['total_amount']}")
            print(f"  Items count: {len(result['items'])}")

            if result['items']:
                print("  Items:")
                for item in result['items']:
                    print(f"    - {item['type']}: {item['name']}, Qty: {item['quantity']}, Price: {item['unit_price']}, Total: {item['total']}")
            else:
                print("  No items found!")

        except Exception as e:
            print(f"Error testing invoice {invoice_id}: {e}")

    except Exception as e:
        print(f"Error in test: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_invoice_api())