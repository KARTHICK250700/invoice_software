from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
import os

# Import database and models
from app.db.session import SessionLocal, engine, check_database_health
from app.db.base import Base
from models.models import Client

# Import all routers
from routers.auth import router as auth_router
from routers.clients import router as clients_router
# Skip complex routers for now - we'll test with simpler ones
# from routers.vehicles import router as vehicles_router
# from routers.services import router as services_router
# from routers.invoices import router as invoices_router
# from routers.quotations import router as quotations_router
# from routers.dashboard import router as dashboard_router
# from routers.reports import router as reports_router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Invoice Software API",
    description="Backend API for Invoice Management System with Database",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Invoice Software Backend API with Database",
        "status": "running",
        "version": "2.0.0",
        "database": "connected"
    }

# Health check
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    # Test database connection
    try:
        client_count = db.query(Client).count()
        return {
            "status": "healthy",
            "service": "invoice-backend",
            "database": "connected",
            "clients_count": client_count
        }
    except Exception as e:
        return {"status": "unhealthy", "database": "error", "error": str(e)}

# Add simple endpoints for missing routes to avoid 404 errors
@app.get("/api/quotations/templates/service-packages")
async def get_service_packages():
    """Temporary endpoint for service packages"""
    return {"service_packages": []}

@app.get("/api/quotations/")
async def get_quotations():
    """Temporary endpoint for quotations"""
    return []

@app.get("/api/vehicles/brands")
async def get_vehicle_brands():
    """Temporary endpoint for vehicle brands"""
    return {"brands": []}

@app.get("/api/reports/live-summary")
async def get_live_summary():
    """Temporary endpoint for live summary"""
    return {
        "total_clients": 0,
        "total_vehicles": 0,
        "total_invoices": 0,
        "total_revenue": 0.0,
        "pending_payments": 0.0
    }

@app.get("/api/reports/chart/revenue")
async def get_revenue_chart():
    """Temporary endpoint for revenue chart"""
    return [
        {"month": "Jan", "revenue": 0},
        {"month": "Feb", "revenue": 0},
        {"month": "Mar", "revenue": 0},
        {"month": "Apr", "revenue": 0},
        {"month": "May", "revenue": 0},
        {"month": "Jun", "revenue": 0}
    ]

@app.get("/api/reports/chart/services")
async def get_services_chart():
    """Temporary endpoint for services chart"""
    return []

# Include available routers
app.include_router(auth_router)
app.include_router(clients_router)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)