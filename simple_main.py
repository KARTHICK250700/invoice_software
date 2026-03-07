from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

app = FastAPI(
    title="Invoice Software API",
    description="Simple backend for testing",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple test endpoint
@app.get("/")
async def root():
    return {"message": "Invoice Software Backend is running!", "status": "success"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "invoice-backend"}

# Simple auth endpoint (for testing)
@app.post("/api/auth/token")
async def login():
    return {
        "access_token": "test_token",
        "token_type": "bearer",
        "user": {
            "id": 1,
            "username": "admin",
            "email": "admin@test.com"
        }
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)