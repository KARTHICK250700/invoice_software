from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, validator
from datetime import datetime

from database.database import SessionLocal
from models.models import Vehicle, VehicleBrand, VehicleModel, Client, User
from auth.auth import get_current_user, verify_password

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class VehicleCreate(BaseModel):
    model_config = {'protected_namespaces': ()}

    client_id: int
    model_id: int
    registration_number: str
    vin_number: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    mileage: Optional[int] = None
    fuel_type: Optional[str] = None
    vehicle_type: Optional[str] = None
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    insurance_expiry: Optional[str] = None
    puc_expiry: Optional[str] = None
    notes: Optional[str] = None

class VehicleResponse(BaseModel):
    model_config = {'protected_namespaces': (), 'from_attributes': True}

    id: int
    client_id: int
    model_id: int
    registration_number: str
    vin_number: Optional[str]
    year: Optional[int]
    color: Optional[str]
    mileage: Optional[int]
    fuel_type: Optional[str]
    vehicle_type: Optional[str]
    engine_number: Optional[str]
    chassis_number: Optional[str]
    insurance_expiry: Optional[str]
    puc_expiry: Optional[str]
    notes: Optional[str]
    client_name: str
    brand_name: str
    model_name: str

class BrandResponse(BaseModel):
    id: int
    name: str
    country: Optional[str]
    models: List[dict] = []

class ModelResponse(BaseModel):
    id: int
    name: str
    year_start: Optional[int]
    year_end: Optional[int]
    fuel_type: Optional[str]

@router.get("/brands", response_model=List[BrandResponse])
async def get_vehicle_brands(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    brands = db.query(VehicleBrand).all()
    result = []
    for brand in brands:
        brand_data = {
            "id": brand.id,
            "name": brand.name,
            "country": brand.country,
            "models": [{"id": m.id, "name": m.name} for m in brand.models]
        }
        result.append(brand_data)
    return result

@router.get("/models/{brand_id}", response_model=List[ModelResponse])
async def get_vehicle_models(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    models = db.query(VehicleModel).filter(VehicleModel.brand_id == brand_id).all()
    return models

@router.get("/", response_model=List[VehicleResponse])
async def get_vehicles(
    skip: int = 0,
    limit: int = 100,
    client_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Vehicle).join(Client).join(VehicleModel).join(VehicleBrand)

    if client_id:
        query = query.filter(Vehicle.client_id == client_id)

    if search:
        query = query.filter(
            (Vehicle.registration_number.contains(search)) |
            (Client.name.contains(search)) |
            (VehicleBrand.name.contains(search)) |
            (VehicleModel.name.contains(search))
        )

    vehicles = query.offset(skip).limit(limit).all()

    result = []
    for vehicle in vehicles:
        # Convert datetime objects to string for date fields
        insurance_expiry = vehicle.insurance_expiry.strftime('%Y-%m-%d') if vehicle.insurance_expiry else None
        puc_expiry = vehicle.puc_expiry.strftime('%Y-%m-%d') if vehicle.puc_expiry else None

        vehicle_data = VehicleResponse(
            id=vehicle.id,
            client_id=vehicle.client_id,
            model_id=vehicle.model_id,
            registration_number=vehicle.registration_number,
            vin_number=vehicle.vin_number,
            year=vehicle.year,
            color=vehicle.color,
            mileage=vehicle.mileage,
            fuel_type=vehicle.fuel_type,
            vehicle_type=vehicle.vehicle_type,
            engine_number=vehicle.engine_number,
            chassis_number=vehicle.chassis_number,
            insurance_expiry=insurance_expiry,
            puc_expiry=puc_expiry,
            notes=vehicle.notes,
            client_name=vehicle.client.name,
            brand_name=vehicle.model.brand.name,
            model_name=vehicle.model.name
        )
        result.append(vehicle_data)

    return result

@router.post("/", response_model=VehicleResponse)
async def create_vehicle(
    vehicle: VehicleCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if registration number already exists
    existing_vehicle = db.query(Vehicle).filter(
        Vehicle.registration_number == vehicle.registration_number
    ).first()
    if existing_vehicle:
        raise HTTPException(status_code=400, detail="Registration number already exists")

    # Create vehicle with the provided fields
    vehicle_data = vehicle.dict()

    # Convert empty strings to None for optional fields
    for field in ['vin_number', 'chassis_number', 'engine_number', 'color', 'notes']:
        if vehicle_data.get(field) == '':
            vehicle_data[field] = None

    # Convert year from string to int if needed
    if isinstance(vehicle_data.get('year'), str):
        try:
            vehicle_data['year'] = int(vehicle_data['year']) if vehicle_data['year'] else None
        except:
            vehicle_data['year'] = None

    # Convert date strings to datetime objects for database
    if vehicle_data.get('insurance_expiry') and vehicle_data['insurance_expiry'].strip():
        try:
            vehicle_data['insurance_expiry'] = datetime.strptime(vehicle_data['insurance_expiry'], '%Y-%m-%d')
        except:
            vehicle_data['insurance_expiry'] = None
    else:
        vehicle_data['insurance_expiry'] = None

    if vehicle_data.get('puc_expiry') and vehicle_data['puc_expiry'].strip():
        try:
            vehicle_data['puc_expiry'] = datetime.strptime(vehicle_data['puc_expiry'], '%Y-%m-%d')
        except:
            vehicle_data['puc_expiry'] = None
    else:
        vehicle_data['puc_expiry'] = None

    # Add default values for database fields not included in the create schema
    vehicle_data.update({
        'km_reading_in': None,
        'km_reading_out': None,
        'last_service_date': None
    })

    db_vehicle = Vehicle(**vehicle_data)
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)

    # Convert datetime objects to string for date fields
    insurance_expiry = db_vehicle.insurance_expiry.strftime('%Y-%m-%d') if db_vehicle.insurance_expiry else None
    puc_expiry = db_vehicle.puc_expiry.strftime('%Y-%m-%d') if db_vehicle.puc_expiry else None

    return VehicleResponse(
        id=db_vehicle.id,
        client_id=db_vehicle.client_id,
        model_id=db_vehicle.model_id,
        registration_number=db_vehicle.registration_number,
        vin_number=db_vehicle.vin_number,
        year=db_vehicle.year,
        color=db_vehicle.color,
        mileage=db_vehicle.mileage,
        fuel_type=db_vehicle.fuel_type,
        vehicle_type=db_vehicle.vehicle_type,
        engine_number=db_vehicle.engine_number,
        chassis_number=db_vehicle.chassis_number,
        insurance_expiry=insurance_expiry,
        puc_expiry=puc_expiry,
        notes=db_vehicle.notes,
        client_name=db_vehicle.client.name,
        brand_name=db_vehicle.model.brand.name,
        model_name=db_vehicle.model.name
    )

@router.get("/search/models")
async def search_models(
    q: str,  # Search query - required
    brand_id: Optional[int] = None,  # Optional brand filter
    limit: int = 20,  # Limit for search results
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Search vehicle models by name with optional brand filter for auto-complete"""
    query = db.query(VehicleModel)

    # Filter by brand if specified
    if brand_id:
        query = query.filter(VehicleModel.brand_id == brand_id)

    # Search by model name
    query = query.filter(VehicleModel.name.ilike(f"%{q}%"))

    # Join with brand for response
    query = query.join(VehicleBrand).limit(limit)

    models = query.all()

    # Create simple search response
    result = []
    for model in models:
        result.append({
            "id": model.id,
            "name": model.name,
            "brand_id": model.brand_id,
            "brand_name": model.brand.name,
            "year_start": model.year_start,
            "year_end": model.year_end,
            "fuel_type": model.fuel_type
        })

    return result


# Individual vehicle endpoints - These MUST come AFTER all specific routes
class VehicleUpdate(BaseModel):
    model_config = {'protected_namespaces': ()}

    client_id: Optional[int] = None
    model_id: Optional[int] = None
    registration_number: Optional[str] = None
    vin_number: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    mileage: Optional[int] = None
    fuel_type: Optional[str] = None
    vehicle_type: Optional[str] = None
    chassis_number: Optional[str] = None
    engine_number: Optional[str] = None
    insurance_expiry: Optional[str] = None
    puc_expiry: Optional[str] = None
    notes: Optional[str] = None

@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a single vehicle by ID"""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Convert datetime objects to string for date fields
    insurance_expiry = vehicle.insurance_expiry.strftime('%Y-%m-%d') if vehicle.insurance_expiry else None
    puc_expiry = vehicle.puc_expiry.strftime('%Y-%m-%d') if vehicle.puc_expiry else None

    return VehicleResponse(
        id=vehicle.id,
        client_id=vehicle.client_id,
        model_id=vehicle.model_id,
        registration_number=vehicle.registration_number,
        vin_number=vehicle.vin_number,
        year=vehicle.year,
        color=vehicle.color,
        mileage=vehicle.mileage,
        fuel_type=vehicle.fuel_type,
        vehicle_type=vehicle.vehicle_type,
        engine_number=vehicle.engine_number,
        chassis_number=vehicle.chassis_number,
        insurance_expiry=insurance_expiry,
        puc_expiry=puc_expiry,
        notes=vehicle.notes,
        client_name=vehicle.client.name,
        brand_name=vehicle.model.brand.name,
        model_name=vehicle.model.name
    )

@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: int,
    vehicle_update: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update a vehicle"""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Check if registration number already exists (if being updated)
    if vehicle_update.registration_number and vehicle_update.registration_number != vehicle.registration_number:
        existing_vehicle = db.query(Vehicle).filter(
            Vehicle.registration_number == vehicle_update.registration_number
        ).first()
        if existing_vehicle:
            raise HTTPException(status_code=400, detail="Registration number already exists")

    # Update only the provided fields
    update_data = vehicle_update.dict(exclude_unset=True)

    # Handle date fields conversion
    if 'insurance_expiry' in update_data:
        if update_data['insurance_expiry'] == '':
            update_data['insurance_expiry'] = None
        elif isinstance(update_data['insurance_expiry'], str) and update_data['insurance_expiry']:
            try:
                update_data['insurance_expiry'] = datetime.strptime(update_data['insurance_expiry'], '%Y-%m-%d').date()
            except ValueError:
                update_data['insurance_expiry'] = None

    if 'puc_expiry' in update_data:
        if update_data['puc_expiry'] == '':
            update_data['puc_expiry'] = None
        elif isinstance(update_data['puc_expiry'], str) and update_data['puc_expiry']:
            try:
                update_data['puc_expiry'] = datetime.strptime(update_data['puc_expiry'], '%Y-%m-%d').date()
            except ValueError:
                update_data['puc_expiry'] = None

    for field, value in update_data.items():
        setattr(vehicle, field, value)

    db.commit()
    db.refresh(vehicle)

    # Convert datetime objects to string for date fields
    insurance_expiry = vehicle.insurance_expiry.strftime('%Y-%m-%d') if vehicle.insurance_expiry else None
    puc_expiry = vehicle.puc_expiry.strftime('%Y-%m-%d') if vehicle.puc_expiry else None

    return VehicleResponse(
        id=vehicle.id,
        client_id=vehicle.client_id,
        model_id=vehicle.model_id,
        registration_number=vehicle.registration_number,
        vin_number=vehicle.vin_number,
        year=vehicle.year,
        color=vehicle.color,
        mileage=vehicle.mileage,
        fuel_type=vehicle.fuel_type,
        vehicle_type=vehicle.vehicle_type,
        engine_number=vehicle.engine_number,
        chassis_number=vehicle.chassis_number,
        insurance_expiry=insurance_expiry,
        puc_expiry=puc_expiry,
        notes=vehicle.notes,
        client_name=vehicle.client.name,
        brand_name=vehicle.model.brand.name,
        model_name=vehicle.model.name
    )

class DeleteRequest(BaseModel):
    password: str

@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: int,
    delete_data: DeleteRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a vehicle with password verification"""
    try:
        # Get password from request
        password = delete_data.password
        if not password:
            raise HTTPException(status_code=400, detail="Password is required for deletion")

        # Verify password
        if not verify_password(password, current_user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid password")

        # Check if vehicle exists
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        registration_number = vehicle.registration_number

        # Check if vehicle has associated invoices
        from models.models import Invoice
        associated_invoices = db.query(Invoice).filter(Invoice.vehicle_id == vehicle_id).count()
        if associated_invoices > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete vehicle. It has {associated_invoices} associated invoice(s). Please delete those invoices first."
            )

        db.delete(vehicle)
        db.commit()

        return {"message": f"Vehicle {registration_number} deleted successfully"}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error deleting vehicle {vehicle_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete vehicle: {str(e)}")