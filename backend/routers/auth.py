from fastapi import APIRouter

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/token")
async def login():
    """User login endpoint"""
    return {
        "access_token": "mock_token_12345",
        "token_type": "bearer",
        "user": {
            "id": 1,
            "username": "admin",
            "email": "admin@invoicesoftware.com"
        }
    }

@router.get("/me")
async def get_current_user():
    """Get current user information"""
    return {
        "id": 1,
        "username": "admin",
        "email": "admin@invoicesoftware.com",
        "role": "admin"
    }