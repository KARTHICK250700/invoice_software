"""Mock authentication utilities for development"""

async def get_current_user():
    """Mock current user for development"""
    class MockUser:
        id = 1
        username = "admin"
        email = "admin@invoicesoftware.com"
        role = "admin"
        hashed_password = "mock_hashed_password"

    return MockUser()

def verify_password(plain_password: str, hashed_password: str):
    """Mock password verification for development"""
    return plain_password == "admin123"