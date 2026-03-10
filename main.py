from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os

app = FastAPI(
    title="Invoice Software API",
    description="Backend API for Invoice Management System",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API responses
class ClientResponse(BaseModel):
    id: int
    name: str
    phone: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

class DashboardStats(BaseModel):
    total_clients: int
    total_invoices: int
    total_revenue: float
    pending_payments: float

class RevenueData(BaseModel):
    month: str
    revenue: float

# Mock data for testing
mock_clients = [
    {
        "id": 1,
        "name": "John Doe",
        "phone": "9876543210",
        "mobile": "9876543210",
        "email": "john@example.com",
        "address": "123 Main St",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "600001"
    },
    {
        "id": 2,
        "name": "Jane Smith",
        "phone": "8765432109",
        "mobile": "8765432109",
        "email": "jane@example.com",
        "address": "456 Oak Ave",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": "560001"
    }
]

mock_dashboard_stats = {
    "total_clients": 25,
    "total_invoices": 150,
    "total_revenue": 125000.0,
    "pending_payments": 15000.0
}

mock_revenue_data = [
    {"month": "Jan", "revenue": 10000},
    {"month": "Feb", "revenue": 12000},
    {"month": "Mar", "revenue": 15000},
    {"month": "Apr", "revenue": 11000},
    {"month": "May", "revenue": 18000},
    {"month": "Jun", "revenue": 20000}
]

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Invoice Software Backend API",
        "status": "running",
        "version": "1.0.0"
    }

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "invoice-backend"}

# Auth endpoints
@app.post("/api/auth/token")
async def login():
    return {
        "access_token": "mock_token_12345",
        "token_type": "bearer",
        "user": {
            "id": 1,
            "username": "admin",
            "email": "admin@invoicesoftware.com"
        }
    }

@app.get("/api/auth/me")
async def get_current_user():
    return {
        "id": 1,
        "username": "admin",
        "email": "admin@invoicesoftware.com",
        "role": "admin"
    }

# Client endpoints
@app.get("/api/clients/", response_model=List[ClientResponse])
async def get_clients(search: Optional[str] = ""):
    if search:
        filtered = [c for c in mock_clients if search.lower() in c["name"].lower()]
        return filtered
    return mock_clients

@app.get("/api/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: int):
    client = next((c for c in mock_clients if c["id"] == client_id), None)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@app.post("/api/clients/", response_model=ClientResponse)
async def create_client(client_data: dict):
    new_client = {
        "id": len(mock_clients) + 1,
        **client_data
    }
    mock_clients.append(new_client)
    return new_client

# Dashboard endpoints
@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    return mock_dashboard_stats

@app.get("/api/dashboard/revenue-chart")
async def get_revenue_chart():
    return {"data": mock_revenue_data}

# Quotation endpoints
@app.get("/api/quotations/templates/service-packages")
async def get_service_packages():
    return {
        "packages": [
            {"id": 1, "name": "Basic Service", "price": 1500},
            {"id": 2, "name": "Full Service", "price": 2500},
            {"id": 3, "name": "Premium Service", "price": 3500}
        ]
    }

@app.get("/api/quotations/")
async def get_quotations():
    return {"quotations": [], "total": 0}

# Vehicle endpoints
@app.get("/api/vehicles/brands")
async def get_vehicle_brands():
    return {
        "brands": [
            {"id": 1, "name": "Maruti Suzuki"},
            {"id": 2, "name": "Hyundai"},
            {"id": 3, "name": "Tata Motors"}
        ]
    }

# Service endpoints
@app.get("/api/services/")
async def get_services():
    return {
        "services": [
            {"id": 1, "name": "Oil Change", "price": 500},
            {"id": 2, "name": "Brake Service", "price": 1000},
            {"id": 3, "name": "Engine Tune-up", "price": 2000}
        ]
    }

# Invoice endpoints
@app.get("/api/invoices/")
async def get_invoices():
    return {"invoices": [], "total": 0}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)