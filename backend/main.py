from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
import os
from datetime import datetime

# Import database and models (MySQL database support added)
from database.mysql_database import SessionLocal, engine, Base, check_database_health
from models.models import Client, Vehicle, Service, Part, VehicleBrand, VehicleModel, Invoice, InvoiceService, InvoicePart, Quotation, QuotationItem

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
@app.get("/api/vehicles/brands")
async def get_vehicle_brands(db: Session = Depends(get_db)):
    brands = db.query(VehicleBrand).all()
    return {
        "brands": [{"id": brand.id, "name": brand.name} for brand in brands]
    }

@app.get("/api/vehicles/brands/{brand_id}/models")
async def get_vehicle_models_by_brand(brand_id: int, db: Session = Depends(get_db)):
    models = db.query(VehicleModel).filter(VehicleModel.brand_id == brand_id).all()
    return {
        "models": [{"id": model.id, "name": model.name} for model in models]
    }

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

    # Get model and brand details for editing
    model = db.query(VehicleModel).filter(VehicleModel.id == vehicle.model_id).first() if vehicle.model_id else None
    brand = db.query(VehicleBrand).filter(VehicleBrand.id == model.brand_id).first() if model and model.brand_id else None

    return {
        "id": vehicle.id,
        "registration_number": vehicle.registration_number,
        "model_id": vehicle.model_id,  # For edit form dropdown
        "brand_id": brand.id if brand else None,  # For edit form dropdown
        "model": model.name if model else "Unknown",  # For display
        "brand": brand.name if brand else "Unknown",  # For display
        "client_id": vehicle.client_id,
        "year": vehicle.year,
        "color": vehicle.color,
        "mileage": vehicle.mileage,
        "vin_number": vehicle.vin_number,
        "chassis_number": vehicle.chassis_number,
        "engine_number": vehicle.engine_number,
        "fuel_type": vehicle.fuel_type,
        "transmission": vehicle.transmission,
        "vehicle_type": vehicle.vehicle_type,
        "last_service_date": vehicle.last_service_date.isoformat() if vehicle.last_service_date else None,
        "insurance_expiry": vehicle.insurance_expiry.isoformat() if vehicle.insurance_expiry else None,
        "puc_expiry": vehicle.puc_expiry.isoformat() if vehicle.puc_expiry else None,
        "notes": vehicle.notes
    }

@app.post("/api/vehicles/")
async def create_vehicle(vehicle_data: dict, db: Session = Depends(get_db)):
    # Clean up datetime fields - convert empty strings to None
    datetime_fields = ['last_service_date', 'insurance_expiry', 'puc_expiry']
    for field in datetime_fields:
        if field in vehicle_data and vehicle_data[field] == '':
            vehicle_data[field] = None

    # Check if registration number already exists
    existing_vehicle = db.query(Vehicle).filter(
        Vehicle.registration_number == vehicle_data.get('registration_number')
    ).first()

    if existing_vehicle:
        raise HTTPException(
            status_code=400,
            detail=f"Registration number '{vehicle_data.get('registration_number')}' already exists. Please use a different registration number."
        )

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

    # Clean up datetime fields - convert empty strings to None
    datetime_fields = ['last_service_date', 'insurance_expiry', 'puc_expiry']
    for field in datetime_fields:
        if field in vehicle_data and vehicle_data[field] == '':
            vehicle_data[field] = None

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

# Client Profile endpoints
@app.get("/api/clients/{client_id}/profile")
async def get_client_profile(client_id: int, db: Session = Depends(get_db)):
    """
    Get comprehensive client profile with all related data
    Client-ன் முழு விவரங்களையும் எடுக்கும் endpoint
    """
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
    from datetime import datetime
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
                "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
                "due_date": invoice.due_date.isoformat() if invoice.due_date else None
            }
            for invoice in invoices
        ],
        "statistics": {
            "total_vehicles": len(vehicles),
            "this_year_invoices": len(this_year_invoices),
            "this_year_services": len(this_year_invoices),
            "total_revenue": total_revenue,
            "pending_amount": pending_amount,
            "average_invoice": total_revenue / len(this_year_invoices) if this_year_invoices else 0,
            "current_year": current_year
        }
    }

@app.get("/api/clients/{client_id}/vehicles")
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

@app.get("/api/clients/{client_id}/invoices")
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

# Dashboard endpoints
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    client_count = db.query(Client).count()
    vehicle_count = db.query(Vehicle).count()
    service_count = db.query(Service).count()
    part_count = db.query(Part).count()
    invoice_count = db.query(Invoice).count()

    return {
        "total_clients": client_count,
        "total_vehicles": vehicle_count,
        "total_services": service_count,
        "total_parts": part_count,
        "total_invoices": invoice_count,
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

# Reports endpoints
@app.get("/api/reports/live-summary")
async def get_live_summary(db: Session = Depends(get_db)):
    client_count = db.query(Client).count()
    vehicle_count = db.query(Vehicle).count()
    service_count = db.query(Service).count()

    return {
        "clients": client_count,
        "vehicles": vehicle_count,
        "services": service_count,
        "revenue": 12500.75,
        "pending_invoices": 3
    }

@app.get("/api/reports/chart/revenue")
async def get_revenue_chart():
    return {
        "data": [
            {"month": "Jan", "revenue": 4000},
            {"month": "Feb", "revenue": 3000},
            {"month": "Mar", "revenue": 5000},
            {"month": "Apr", "revenue": 4500},
            {"month": "May", "revenue": 6000},
            {"month": "Jun", "revenue": 5500}
        ]
    }

@app.get("/api/reports/chart/services")
async def get_services_chart(db: Session = Depends(get_db)):
    # Get top 5 services
    services = db.query(Service).limit(5).all()
    return {
        "data": [
            {"name": service.name, "count": 15 + (service.id * 3)}
            for service in services
        ]
    }

@app.get("/api/quotations/")
async def get_quotations(db: Session = Depends(get_db)):
    """Get all quotations from Railway MySQL database"""
    try:
        # Fetch all quotations from Railway MySQL database
        quotations = db.query(Quotation).all()

        # Return quotations with client and vehicle details
        return [
            {
                "id": quotation.id,
                "quotation_number": quotation.quotation_number,
                "client_id": quotation.client_id,
                "vehicle_id": quotation.vehicle_id,
                "quotation_date": quotation.quotation_date.isoformat() if quotation.quotation_date else None,
                "valid_until": quotation.valid_until.isoformat() if quotation.valid_until else None,
                "subtotal": quotation.subtotal,
                "total_amount": quotation.total_amount,
                "status": quotation.status,
                "notes": quotation.notes,
                "created_at": quotation.created_at.isoformat() if quotation.created_at else None
            }
            for quotation in quotations
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching quotations: {str(e)}")

@app.post("/api/quotations/")
async def create_quotation(quotation_data: dict, db: Session = Depends(get_db)):
    """Create a new quotation in Railway MySQL database"""
    try:
        # Generate quotation number
        import datetime
        today = datetime.date.today()
        existing_count = db.query(Quotation).filter(
            Quotation.quotation_date >= today
        ).count()
        quotation_number = f"QUO-{today.strftime('%Y%m%d')}-{existing_count + 1:04d}"

        # Create new quotation
        new_quotation = Quotation(
            quotation_number=quotation_number,
            client_id=quotation_data.get("client_id"),
            vehicle_id=quotation_data.get("vehicle_id"),
            subtotal=quotation_data.get("subtotal", 0.0),
            total_amount=quotation_data.get("total_amount", 0.0),
            status=quotation_data.get("status", "pending"),
            notes=quotation_data.get("notes"),
            valid_until=datetime.datetime.strptime(quotation_data["valid_until"], "%Y-%m-%d") if quotation_data.get("valid_until") else None
        )

        db.add(new_quotation)
        db.commit()
        db.refresh(new_quotation)

        return {
            "message": "Quotation created successfully in Railway MySQL",
            "quotation_id": new_quotation.id,
            "quotation_number": new_quotation.quotation_number
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating quotation: {str(e)}")

@app.get("/api/quotations/{quotation_id}")
async def get_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """Get individual quotation for editing"""
    try:
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")

        return {
            "id": quotation.id,
            "quotation_number": quotation.quotation_number,
            "client_id": quotation.client_id,
            "vehicle_id": quotation.vehicle_id,
            "quotation_date": quotation.quotation_date.isoformat() if quotation.quotation_date else None,
            "valid_until": quotation.valid_until.isoformat() if quotation.valid_until else None,
            "subtotal": quotation.subtotal,
            "total_amount": quotation.total_amount,
            "status": quotation.status,
            "notes": quotation.notes,
            "created_at": quotation.created_at.isoformat() if quotation.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching quotation: {str(e)}")

@app.put("/api/quotations/{quotation_id}")
async def update_quotation(quotation_id: int, quotation_data: dict, db: Session = Depends(get_db)):
    """Update quotation in Railway MySQL database"""
    try:
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")

        # Update fields
        for field, value in quotation_data.items():
            if hasattr(quotation, field):
                # Handle datetime fields (frontend sends ISO format with Z suffix)
                if field in ['valid_until', 'created_at'] and isinstance(value, str) and value:
                    try:
                        # Parse ISO format datetime string (2025-11-27T00:00:00.000Z)
                        if value.endswith('Z'):
                            value = value.rstrip('Z')
                        # Remove milliseconds if present
                        if '.' in value:
                            value = value.split('.')[0]
                        parsed_date = datetime.fromisoformat(value)
                        setattr(quotation, field, parsed_date)
                    except (ValueError, TypeError) as e:
                        raise HTTPException(status_code=400, detail=f"Invalid datetime format for {field}: {value}. Expected ISO format.")
                else:
                    setattr(quotation, field, value)

        db.commit()
        db.refresh(quotation)

        return {"message": "Quotation updated successfully", "quotation_id": quotation.id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error updating quotation: {str(e)}")

# Invoice endpoints
@app.get("/api/invoices/")
async def get_invoices(db: Session = Depends(get_db)):
    # Fetch all invoices from database (database-ல் இருந்து எல்லா invoices-களையும் எடுக்கவும்)
    invoices = db.query(Invoice).all()

    # Return direct array for frontend compatibility (frontend-க்கு array format-ல் return செய்யவும்)
    return [
        {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "client_id": invoice.client_id,
            "vehicle_id": invoice.vehicle_id,
            "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
            "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
            "payment_status": invoice.payment_status,
            "service_type": invoice.service_type,
            "subtotal": invoice.subtotal,
            "total_amount": invoice.total_amount,
            "tax_amount": invoice.tax_amount,
            "discount_amount": invoice.discount_amount
        }
        for invoice in invoices
    ]

@app.post("/api/invoices/")
async def create_invoice(invoice_data: dict, db: Session = Depends(get_db)):
    from utils.logger import logger
    from datetime import datetime

    try:
        logger.log_api_request("POST", "/api/invoices/", 200, 0)
        logger.info("Invoice creation started", {"received_data": invoice_data})

        # Validate required fields
        if not invoice_data.get('client_id') or not invoice_data.get('vehicle_id'):
            logger.error("Invoice creation failed: missing required fields", {
                "client_id": invoice_data.get('client_id'),
                "vehicle_id": invoice_data.get('vehicle_id')
            })
            raise HTTPException(status_code=400, detail="client_id and vehicle_id are required")

        if not invoice_data.get('items') or len(invoice_data.get('items', [])) == 0:
            logger.error("Invoice creation failed: no items provided", {"items": invoice_data.get('items')})
            raise HTTPException(status_code=400, detail="At least one service or part item is required")

        # Generate invoice number
        current_year = datetime.now().year
        invoice_count = db.query(Invoice).count() + 1
        invoice_number = f"INV-{current_year}-{invoice_count:04d}"

        # Parse invoice date
        invoice_date = None
        if invoice_data.get('invoice_date'):
            try:
                invoice_date = datetime.strptime(invoice_data.get('invoice_date'), '%Y-%m-%d')
            except ValueError:
                invoice_date = datetime.now()
        else:
            invoice_date = datetime.now()

        # Parse challan date
        challan_date = None
        if invoice_data.get('challan_date'):
            try:
                challan_date = datetime.strptime(invoice_data.get('challan_date'), '%Y-%m-%d')
            except ValueError:
                challan_date = None

        # Create invoice in database
        new_invoice = Invoice(
            invoice_number=invoice_number,
            client_id=int(invoice_data.get('client_id')),
            vehicle_id=int(invoice_data.get('vehicle_id')),
            invoice_date=invoice_date,
            challan_no=invoice_data.get('challan_no'),
            challan_date=challan_date,
            transport=invoice_data.get('transport'),
            transport_id=invoice_data.get('transport_id'),
            place_of_supply=invoice_data.get('place_of_supply', 'Tamil Nadu (33)'),
            notes=invoice_data.get('notes'),
            payment_status=invoice_data.get('payment_status', 'pending'),
            service_type=invoice_data.get('service_type', 'General Service'),
            subtotal=float(invoice_data.get('taxable_amount', 0.0)),
            igst_amount=float(invoice_data.get('igst_amount', 0.0)),
            tax_amount=float(invoice_data.get('igst_amount', 0.0)),  # Using IGST as tax_amount
            total_amount=float(invoice_data.get('total_amount', 0.0)),
            discount_amount=invoice_data.get('discount_amount', 0.0)
        )

        db.add(new_invoice)
        db.commit()
        db.refresh(new_invoice)

        logger.info("Invoice created successfully", {
            "invoice_id": new_invoice.id,
            "invoice_number": new_invoice.invoice_number
        })

        # Process invoice items
        items_processed = 0
        for item in invoice_data.get('items', []):
            if item.get('type') == 'service':
                # Create InvoiceService
                invoice_service = InvoiceService(
                    invoice_id=new_invoice.id,
                    service_name=item.get('name'),
                    hsn_sac_code=item.get('hsn_sac', '8302'),
                    quantity=float(item.get('qty', 1)),
                    unit_price=float(item.get('rate', 0)),
                    total_price=float(item.get('taxable_value', 0)),
                    amount=float(item.get('taxable_value', 0))
                )
                db.add(invoice_service)
                items_processed += 1

            elif item.get('type') == 'part':
                # Create InvoicePart
                invoice_part = InvoicePart(
                    invoice_id=new_invoice.id,
                    part_name=item.get('name'),
                    hsn_sac_code=item.get('hsn_sac', '8708'),
                    quantity=int(item.get('qty', 1)),
                    unit_price=float(item.get('rate', 0)),
                    total_price=float(item.get('taxable_value', 0)),
                    cost=float(item.get('taxable_value', 0))
                )
                db.add(invoice_part)
                items_processed += 1

        db.commit()

        logger.info("Invoice items processed", {
            "invoice_id": new_invoice.id,
            "items_processed": items_processed
        })

        return {
            "success": True,
            "data": {
                "id": new_invoice.id,
                "invoice_number": new_invoice.invoice_number,
                "message": "Invoice created successfully"
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Invoice creation failed", e, {"invoice_data": invoice_data})
        raise HTTPException(status_code=500, detail=f"Failed to create invoice: {str(e)}")

@app.get("/api/invoices/{invoice_id}")
async def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    # Fetch specific invoice from database (குறிப்பிட்ட invoice-ஐ database-ல் இருந்து எடுக்கவும்)
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()

    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")

    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "client_id": invoice.client_id,
        "vehicle_id": invoice.vehicle_id,
        "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "payment_status": invoice.payment_status,
        "service_type": invoice.service_type,
        "subtotal": invoice.subtotal,
        "total_amount": invoice.total_amount,
        "tax_amount": invoice.tax_amount,
        "discount_amount": invoice.discount_amount,
        "created_at": invoice.invoice_date.isoformat() if invoice.invoice_date else None
    }

@app.put("/api/invoices/{invoice_id}")
async def update_invoice(invoice_id: int, invoice_data: dict, db: Session = Depends(get_db)):
    # Find invoice in database (database-ல் invoice-ஐ கண்டுபிடிக்கவும்)
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()

    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")

    # Update invoice fields (invoice fields-களை update செய்யவும்)
    for key, value in invoice_data.items():
        if hasattr(invoice, key):
            # Handle datetime fields (frontend sends ISO format with Z suffix)
            if key == 'invoice_date' and isinstance(value, str):
                try:
                    # Parse ISO format datetime string (2025-11-27T00:00:00.000Z)
                    if value.endswith('Z'):
                        value = value.rstrip('Z')
                    # Remove milliseconds if present
                    if '.' in value:
                        value = value.split('.')[0]
                    parsed_date = datetime.fromisoformat(value)
                    setattr(invoice, key, parsed_date)
                except (ValueError, TypeError) as e:
                    raise HTTPException(status_code=400, detail=f"Invalid datetime format for {key}: {value}. Expected ISO format.")
            else:
                setattr(invoice, key, value)

    db.commit()
    db.refresh(invoice)

    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "message": "Invoice updated successfully in database"
    }

@app.delete("/api/invoices/{invoice_id}")
async def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    # Find invoice in database (database-ல் invoice-ஐ கண்டுபிடிக்கவும்)
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()

    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")

    # Delete invoice from database (database-ல் இருந்து invoice-ஐ delete செய்யவும்)
    db.delete(invoice)
    db.commit()

    return {
        "message": f"Invoice {invoice.invoice_number} deleted successfully from database"
    }

# Invoice and Quotation Items endpoints
@app.get("/api/invoices/{invoice_id}/items")
async def get_invoice_items(invoice_id: int, db: Session = Depends(get_db)):
    """Get all services and parts for an invoice - Enhanced for editing"""
    try:
        # Get invoice services with detailed information
        invoice_services = db.query(InvoiceService).filter(InvoiceService.invoice_id == invoice_id).all()
        services = []
        for item in invoice_services:
            # Get service details if service_id exists
            service_details = db.query(Service).filter(Service.id == item.service_id).first() if item.service_id else None

            services.append({
                "id": item.id,
                "type": "service",
                "item_id": item.service_id,  # For editing dropdown
                "service_id": item.service_id,  # For compatibility
                "name": item.service_name or (service_details.name if service_details else "Custom Service"),
                "description": service_details.description if service_details else "",
                "amount": item.amount,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total": item.amount,
                "hsn_sac_code": item.hsn_sac_code,
                "editable": True
            })

        # Get invoice parts with detailed information
        invoice_parts = db.query(InvoicePart).filter(InvoicePart.invoice_id == invoice_id).all()
        parts = []
        for item in invoice_parts:
            # Get part details if part_id exists
            part_details = db.query(Part).filter(Part.id == item.part_id).first() if item.part_id else None

            parts.append({
                "id": item.id,
                "type": "part",
                "item_id": item.part_id,  # For editing dropdown
                "part_id": item.part_id,  # For compatibility
                "name": item.part_name or (part_details.name if part_details else "Custom Part"),
                "description": part_details.description if part_details else "",
                "cost": item.cost,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total": item.cost,
                "hsn_sac_code": item.hsn_sac_code,
                "editable": True
            })

        # Combine all items for unified editing interface
        all_items = []
        for service in services:
            all_items.append(service)
        for part in parts:
            all_items.append(part)

        return {
            "services": services,
            "parts": parts,
            "items": all_items,  # Unified list for easier frontend handling
            "total_items": len(services) + len(parts),
            "editable": True,  # Indicates this invoice can be edited
            "invoice_id": invoice_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching invoice items: {str(e)}")

@app.get("/api/quotations/{quotation_id}/items")
async def get_quotation_items(quotation_id: int, db: Session = Depends(get_db)):
    """Get all items for a quotation - Enhanced for editing"""
    try:
        # Get quotation items
        quotation_items = db.query(QuotationItem).filter(QuotationItem.quotation_id == quotation_id).all()

        items = []
        services = []
        parts = []

        for item in quotation_items:
            # Calculate totals
            line_total = (item.quantity * item.rate) - item.discount
            tax_amount = (line_total * item.tax_rate) / 100 if item.tax_rate else 0
            final_total = line_total + tax_amount

            item_data = {
                "id": item.id,
                "type": item.item_type,  # service or part
                "name": item.name,
                "description": "",  # Could be enhanced with lookup
                "hsn_sac": item.hsn_sac,
                "hsn_sac_code": item.hsn_sac,  # For compatibility
                "quantity": item.quantity,
                "rate": item.rate,
                "unit_price": item.rate,  # For compatibility
                "amount": final_total,  # For compatibility
                "cost": final_total,  # For compatibility
                "discount": item.discount,
                "discount_amount": item.discount,  # For compatibility
                "tax_rate": item.tax_rate,
                "tax_amount": tax_amount,
                "line_total": line_total,
                "total": final_total,
                "editable": True,  # Indicates this item can be edited
                "item_id": None  # Could be enhanced with service/part lookup
            }

            items.append(item_data)

            # Separate by type for compatibility
            if item.item_type == "service":
                services.append(item_data)
            else:
                parts.append(item_data)

        return {
            "items": items,  # All items combined
            "services": services,  # Services only (for compatibility)
            "parts": parts,  # Parts only (for compatibility)
            "total_items": len(items),
            "editable": True,  # Indicates this quotation can be edited
            "quotation_id": quotation_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching quotation items: {str(e)}")

# Download endpoints for invoices and quotations
@app.get("/api/invoices/{invoice_id}/download")
async def download_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """Download invoice as PDF"""
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        # Get client and vehicle details
        client = db.query(Client).filter(Client.id == invoice.client_id).first()
        vehicle = db.query(Vehicle).filter(Vehicle.id == invoice.vehicle_id).first()

        # Return invoice data for PDF generation
        return {
            "invoice": {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
                "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
                "total_amount": invoice.total_amount,
                "subtotal": invoice.subtotal,
                "tax_amount": invoice.tax_amount,
                "discount_amount": invoice.discount_amount,
                "payment_status": invoice.payment_status,
                "service_type": invoice.service_type
            },
            "client": {
                "name": client.name if client else "Unknown Client",
                "phone": client.phone if client else "",
                "email": client.email if client else "",
                "address": client.address if client else ""
            },
            "vehicle": {
                "registration_number": vehicle.registration_number if vehicle else "",
                "brand": getattr(vehicle, 'brand', '') if vehicle else "",
                "model": getattr(vehicle, 'model', '') if vehicle else "",
                "year": vehicle.year if vehicle else ""
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preparing invoice download: {str(e)}")

@app.get("/api/quotations/{quotation_id}/download")
async def download_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """Download quotation as PDF"""
    try:
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")

        # Get client and vehicle details
        client = db.query(Client).filter(Client.id == quotation.client_id).first()
        vehicle = db.query(Vehicle).filter(Vehicle.id == quotation.vehicle_id).first()

        # Return quotation data for PDF generation
        return {
            "quotation": {
                "id": quotation.id,
                "quotation_number": quotation.quotation_number,
                "quotation_date": quotation.quotation_date.isoformat() if quotation.quotation_date else None,
                "valid_until": quotation.valid_until.isoformat() if quotation.valid_until else None,
                "total_amount": quotation.total_amount,
                "subtotal": quotation.subtotal,
                "status": quotation.status,
                "notes": quotation.notes
            },
            "client": {
                "name": client.name if client else "Unknown Client",
                "phone": client.phone if client else "",
                "email": client.email if client else "",
                "address": client.address if client else ""
            },
            "vehicle": {
                "registration_number": vehicle.registration_number if vehicle else "",
                "brand": getattr(vehicle, 'brand', '') if vehicle else "",
                "model": getattr(vehicle, 'model', '') if vehicle else "",
                "year": vehicle.year if vehicle else ""
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preparing quotation download: {str(e)}")

# Test endpoints for debugging
@app.get("/api/invoices/{invoice_id}/test")
async def test_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """Test endpoint for invoice debugging"""
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        return {"message": f"Invoice {invoice.invoice_number} found successfully", "invoice_id": invoice.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error testing invoice: {str(e)}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)