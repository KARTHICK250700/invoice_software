from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
import os

# Import database and models
from database.database import SessionLocal, engine, Base
from models.models import Client, Vehicle, Service, Part, VehicleBrand, VehicleModel

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

# Auth endpoints (simple for now)
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

# Client endpoints with database
@app.get("/api/clients/")
async def get_clients(search: Optional[str] = "", db: Session = Depends(get_db)):
    query = db.query(Client)
    if search:
        query = query.filter(Client.name.ilike(f"%{search}%"))
    clients = query.all()

    # Convert to dict format expected by frontend
    return [
        {
            "id": client.id,
            "name": client.name,
            "phone": client.phone,
            "mobile": client.mobile,
            "email": client.email,
            "address": client.address,
            "city": client.city,
            "state": client.state,
            "pincode": client.pincode
        }
        for client in clients
    ]

@app.get("/api/clients/{client_id}")
async def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    return {
        "id": client.id,
        "name": client.name,
        "phone": client.phone,
        "mobile": client.mobile,
        "email": client.email,
        "address": client.address,
        "city": client.city,
        "state": client.state,
        "pincode": client.pincode
    }

@app.post("/api/clients/")
async def create_client(client_data: dict, db: Session = Depends(get_db)):
    new_client = Client(**client_data)
    db.add(new_client)
    db.commit()
    db.refresh(new_client)

    return {
        "id": new_client.id,
        "name": new_client.name,
        "phone": new_client.phone,
        "mobile": new_client.mobile,
        "email": new_client.email,
        "address": new_client.address,
        "city": new_client.city,
        "state": new_client.state,
        "pincode": new_client.pincode
    }

@app.put("/api/clients/{client_id}")
async def update_client(client_id: int, client_data: dict, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    for key, value in client_data.items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)

    return {
        "id": client.id,
        "name": client.name,
        "phone": client.phone,
        "mobile": client.mobile,
        "email": client.email,
        "address": client.address,
        "city": client.city,
        "state": client.state,
        "pincode": client.pincode
    }

@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    db.delete(client)
    db.commit()

    return {"message": "Client deleted successfully"}

# Vehicle endpoints with database
@app.get("/api/vehicles/")
async def get_vehicles(search: Optional[str] = "", limit: int = 10, db: Session = Depends(get_db)):
    query = db.query(Vehicle).join(VehicleModel).join(VehicleBrand)
    if search:
        query = query.filter(Vehicle.registration_number.ilike(f"%{search}%"))
    vehicles = query.limit(limit).all()

    return [
        {
            "id": vehicle.id,
            "registration_number": vehicle.registration_number,
            "model": vehicle.model.name if vehicle.model else "Unknown",
            "brand": vehicle.model.brand.name if vehicle.model and vehicle.model.brand else "Unknown",
            "client_id": vehicle.client_id,
            "year": vehicle.year,
            "color": vehicle.color
        }
        for vehicle in vehicles
    ]

@app.get("/api/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    return {
        "id": vehicle.id,
        "registration_number": vehicle.registration_number,
        "model": vehicle.model.name if vehicle.model else "Unknown",
        "brand": vehicle.model.brand.name if vehicle.model and vehicle.model.brand else "Unknown",
        "client_id": vehicle.client_id,
        "year": vehicle.year,
        "color": vehicle.color,
        "mileage": vehicle.mileage
    }

@app.post("/api/vehicles/")
async def create_vehicle(vehicle_data: dict, db: Session = Depends(get_db)):
    new_vehicle = Vehicle(**vehicle_data)
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)

    return {"id": new_vehicle.id, "message": "Vehicle created successfully"}

@app.put("/api/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: int, vehicle_data: dict, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    for key, value in vehicle_data.items():
        setattr(vehicle, key, value)

    db.commit()
    db.refresh(vehicle)

    return {"id": vehicle.id, "message": "Vehicle updated successfully"}

@app.delete("/api/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    db.delete(vehicle)
    db.commit()

    return {"message": "Vehicle deleted successfully"}

# Vehicle brands endpoint
@app.get("/api/vehicles/brands")
async def get_vehicle_brands(db: Session = Depends(get_db)):
    brands = db.query(VehicleBrand).all()
    return {
        "brands": [{"id": brand.id, "name": brand.name} for brand in brands]
    }

# Service endpoints with database
@app.get("/api/services/")
async def get_services(db: Session = Depends(get_db)):
    services = db.query(Service).all()
    return {
        "services": [
            {"id": service.id, "name": service.name, "price": service.base_price}
            for service in services
        ]
    }

@app.get("/api/services/services")
async def get_services_alt(db: Session = Depends(get_db)):
    services = db.query(Service).all()
    return [
        {"id": service.id, "name": service.name, "price": service.base_price}
        for service in services
    ]

@app.get("/api/services/parts")
async def get_parts(db: Session = Depends(get_db)):
    parts = db.query(Part).all()
    return [
        {"id": part.id, "name": part.name, "price": part.unit_price}
        for part in parts
    ]

# Dashboard endpoints
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    client_count = db.query(Client).count()
    vehicle_count = db.query(Vehicle).count()
    service_count = db.query(Service).count()
    part_count = db.query(Part).count()

    return {
        "total_clients": client_count,
        "total_vehicles": vehicle_count,
        "total_services": service_count,
        "total_parts": part_count,
        "total_invoices": 0,  # TODO: Add when Invoice model is implemented
        "total_revenue": 0.0,
        "pending_payments": 0.0
    }

@app.get("/api/dashboard/revenue-chart")
async def get_revenue_chart():
    # Mock data for now - TODO: Calculate from actual invoices
    return [
        {"month": "Jan", "revenue": 10000},
        {"month": "Feb", "revenue": 12000},
        {"month": "Mar", "revenue": 15000},
        {"month": "Apr", "revenue": 11000},
        {"month": "May", "revenue": 18000},
        {"month": "Jun", "revenue": 20000}
    ]

# Quotation endpoints
@app.get("/api/quotations/templates/service-packages")
async def get_service_packages(db: Session = Depends(get_db)):
    services = db.query(Service).limit(5).all()
    return {
        "packages": [
            {"id": service.id, "name": service.name, "price": service.base_price}
            for service in services
        ]
    }

@app.get("/api/quotations/")
async def get_quotations():
    return {"quotations": [], "total": 0}

# Invoice endpoints
@app.get("/api/invoices/")
async def get_invoices():
    return {"invoices": [], "total": 0}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)