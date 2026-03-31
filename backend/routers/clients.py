from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.db.session import SessionLocal
from models.models import Client, Vehicle, Invoice, VehicleModel, VehicleBrand

router = APIRouter(prefix="/api/clients", tags=["Clients"])

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
async def get_clients(search: Optional[str] = "", db: Session = Depends(get_db)):
    """Get all clients with optional search"""
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

@router.get("/{client_id}")
async def get_client(client_id: int, db: Session = Depends(get_db)):
    """Get a specific client by ID"""
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

@router.post("/")
async def create_client(client_data: dict, db: Session = Depends(get_db)):
    """Create a new client"""
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

@router.put("/{client_id}")
async def update_client(client_id: int, client_data: dict, db: Session = Depends(get_db)):
    """Update an existing client"""
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

@router.delete("/{client_id}")
async def delete_client(client_id: int, db: Session = Depends(get_db)):
    """Delete a client"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    db.delete(client)
    db.commit()

    return {"message": "Client deleted successfully"}

@router.get("/{client_id}/profile")
async def get_client_profile(client_id: int, db: Session = Depends(get_db)):
    """Get comprehensive client profile with all related data"""
    # Get client details
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Get client's vehicles
    vehicles = db.query(Vehicle).join(VehicleModel).join(VehicleBrand).filter(
        Vehicle.client_id == client_id
    ).all()

    # Get client's invoices
    invoices = db.query(Invoice).filter(Invoice.client_id == client_id).all()

    # Calculate statistics
    current_year = datetime.now().year

    # This year's invoices
    this_year_invoices = [inv for inv in invoices if inv.invoice_date and inv.invoice_date.year == current_year]
    total_revenue = sum(inv.total_amount for inv in this_year_invoices)
    pending_amount = sum(inv.total_amount for inv in this_year_invoices if inv.payment_status == 'pending')

    return {
        "client": {
            "id": client.id,
            "name": client.name,
            "phone": client.phone,
            "mobile": client.mobile,
            "email": client.email,
            "address": client.address,
            "city": client.city,
            "state": client.state,
            "pincode": client.pincode
        },
        "vehicles": [
            {
                "id": vehicle.id,
                "registration_number": vehicle.registration_number,
                "brand": vehicle.model.brand.name if vehicle.model and vehicle.model.brand else "Unknown",
                "model": vehicle.model.name if vehicle.model else "Unknown",
                "year": vehicle.year,
                "color": vehicle.color,
                "last_service_date": vehicle.last_service_date.isoformat() if vehicle.last_service_date else None,
                "mileage": vehicle.mileage
            }
            for vehicle in vehicles
        ],
        "invoices": [
            {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "service_type": invoice.service_type,
                "total_amount": invoice.total_amount,
                "payment_status": invoice.payment_status,
                "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None
            }
            for invoice in invoices[-5:]  # Last 5 invoices
        ],
        "statistics": {
            "total_vehicles": len(vehicles),
            "total_invoices": len(invoices),
            "this_year_invoices": len(this_year_invoices),
            "total_revenue": total_revenue,
            "pending_amount": pending_amount
        }
    }

@router.get("/{client_id}/vehicles")
async def get_client_vehicles(client_id: int, db: Session = Depends(get_db)):
    """Get all vehicles for a specific client"""
    vehicles = db.query(Vehicle).join(VehicleModel).join(VehicleBrand).filter(
        Vehicle.client_id == client_id
    ).all()

    return [
        {
            "id": vehicle.id,
            "registration_number": vehicle.registration_number,
            "brand": vehicle.model.brand.name if vehicle.model and vehicle.model.brand else "Unknown",
            "model": vehicle.model.name if vehicle.model else "Unknown",
            "year": vehicle.year,
            "color": vehicle.color,
            "mileage": vehicle.mileage,
            "last_service_date": vehicle.last_service_date.isoformat() if vehicle.last_service_date else None
        }
        for vehicle in vehicles
    ]

@router.get("/{client_id}/invoices")
async def get_client_invoices(client_id: int, year: int = None, db: Session = Depends(get_db)):
    """Get all invoices for a specific client"""
    query = db.query(Invoice).filter(Invoice.client_id == client_id)

    if year:
        from sqlalchemy import extract
        query = query.filter(extract('year', Invoice.invoice_date) == year)

    invoices = query.order_by(Invoice.invoice_date.desc()).all()

    return [
        {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "vehicle_id": invoice.vehicle_id,
            "service_type": invoice.service_type,
            "total_amount": invoice.total_amount,
            "payment_status": invoice.payment_status,
            "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None
        }
        for invoice in invoices
    ]