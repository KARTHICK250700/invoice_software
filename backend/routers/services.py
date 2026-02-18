from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database.database import SessionLocal
from models.models import Service, ServiceCategory, Part, PartCategory
from auth.auth import get_current_user

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ServiceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    base_price: float
    labor_hours: float
    category_name: str
    hsn_sac_code: Optional[str]

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    base_price: float
    labor_hours: float = 1.0
    category_id: int
    hsn_sac_code: Optional[str] = None

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    labor_hours: Optional[float] = None
    category_id: Optional[int] = None
    hsn_sac_code: Optional[str] = None

class PartResponse(BaseModel):
    id: int
    name: str
    part_number: Optional[str]
    description: Optional[str]
    unit_price: float
    stock_quantity: int
    category_name: str
    hsn_code: Optional[str]

# Root endpoint for /api/services/ (what frontend expects)
@router.get("/", response_model=List[ServiceResponse])
async def get_all_services(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all services - main endpoint for frontend"""
    query = db.query(Service).join(ServiceCategory)

    if category_id:
        query = query.filter(Service.category_id == category_id)

    if search:
        query = query.filter(
            (Service.name.contains(search)) |
            (Service.description.contains(search))
        )

    services = query.offset(skip).limit(limit).all()

    result = []
    for service in services:
        result.append({
            "id": service.id,
            "name": service.name,
            "description": service.description,
            "base_price": service.base_price,
            "labor_hours": service.labor_hours,
            "category_name": service.category.name if service.category else "Unknown",
            "hsn_sac_code": service.hsn_sac_code
        })

    return result

@router.get("/services", response_model=List[ServiceResponse])
async def get_services(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Service).join(ServiceCategory)

    if category_id:
        query = query.filter(Service.category_id == category_id)

    if search:
        query = query.filter(
            (Service.name.contains(search)) |
            (Service.description.contains(search))
        )

    services = query.offset(skip).limit(limit).all()

    result = []
    for service in services:
        result.append({
            "id": service.id,
            "name": service.name,
            "description": service.description,
            "base_price": service.base_price,
            "labor_hours": service.labor_hours,
            "category_name": service.category.name,
            "hsn_sac_code": service.hsn_sac_code
        })

    return result

@router.get("/services/search")
async def search_services_public(
    search: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Public endpoint for auto-fill services search"""
    query = db.query(Service).join(ServiceCategory)

    if search:
        query = query.filter(
            Service.name.ilike(f"%{search}%")
        )

    services = query.limit(limit).all()

    result = []
    for service in services:
        result.append({
            "id": service.id,
            "name": service.name,
            "description": service.description,
            "base_price": service.base_price,
            "labor_hours": service.labor_hours,
            "category_name": service.category.name,
            "hsn_sac_code": service.hsn_sac_code
        })

    return result

@router.get("/parts", response_model=List[PartResponse])
async def get_parts(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Part).join(PartCategory)

    if category_id:
        query = query.filter(Part.category_id == category_id)

    if search:
        query = query.filter(
            (Part.name.contains(search)) |
            (Part.part_number.contains(search)) |
            (Part.description.contains(search))
        )

    parts = query.offset(skip).limit(limit).all()

    result = []
    for part in parts:
        result.append({
            "id": part.id,
            "name": part.name,
            "part_number": part.part_number,
            "description": part.description,
            "unit_price": part.unit_price,
            "stock_quantity": part.stock_quantity,
            "category_name": part.category.name,
            "hsn_code": part.hsn_code
        })

    return result

@router.get("/parts/search")
async def search_parts_public(
    search: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Public endpoint for auto-fill parts search"""
    query = db.query(Part).join(PartCategory)

    if search:
        query = query.filter(
            (Part.name.ilike(f"%{search}%")) |
            (Part.part_number.ilike(f"%{search}%"))
        )

    parts = query.limit(limit).all()

    result = []
    for part in parts:
        result.append({
            "id": part.id,
            "name": part.name,
            "part_number": part.part_number,
            "description": part.description,
            "unit_price": part.unit_price,
            "stock_quantity": part.stock_quantity,
            "category_name": part.category.name,
            "hsn_code": part.hsn_code
        })

    return result

@router.get("/categories")
async def get_categories(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service_categories = db.query(ServiceCategory).all()
    part_categories = db.query(PartCategory).all()

    return {
        "service_categories": [{"id": cat.id, "name": cat.name} for cat in service_categories],
        "part_categories": [{"id": cat.id, "name": cat.name} for cat in part_categories]
    }

# CRUD Operations for Services
@router.post("/", response_model=ServiceResponse)
async def create_service(
    service: ServiceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new service"""
    # Check if category exists
    category = db.query(ServiceCategory).filter(ServiceCategory.id == service.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Service category not found")

    db_service = Service(
        name=service.name,
        description=service.description,
        base_price=service.base_price,
        labor_hours=service.labor_hours,
        category_id=service.category_id,
        hsn_sac_code=service.hsn_sac_code
    )
    db.add(db_service)
    db.commit()
    db.refresh(db_service)

    return {
        "id": db_service.id,
        "name": db_service.name,
        "description": db_service.description,
        "base_price": db_service.base_price,
        "labor_hours": db_service.labor_hours,
        "category_name": category.name,
        "hsn_sac_code": db_service.hsn_sac_code
    }

@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    service_update: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update an existing service"""
    db_service = db.query(Service).filter(Service.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Update fields if provided
    if service_update.name is not None:
        db_service.name = service_update.name
    if service_update.description is not None:
        db_service.description = service_update.description
    if service_update.base_price is not None:
        db_service.base_price = service_update.base_price
    if service_update.labor_hours is not None:
        db_service.labor_hours = service_update.labor_hours
    if service_update.category_id is not None:
        category = db.query(ServiceCategory).filter(ServiceCategory.id == service_update.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Service category not found")
        db_service.category_id = service_update.category_id
    if service_update.hsn_sac_code is not None:
        db_service.hsn_sac_code = service_update.hsn_sac_code

    db.commit()
    db.refresh(db_service)

    return {
        "id": db_service.id,
        "name": db_service.name,
        "description": db_service.description,
        "base_price": db_service.base_price,
        "labor_hours": db_service.labor_hours,
        "category_name": db_service.category.name,
        "hsn_sac_code": db_service.hsn_sac_code
    }

@router.delete("/{service_id}")
async def delete_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a service"""
    db_service = db.query(Service).filter(Service.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")

    db.delete(db_service)
    db.commit()

    return {"detail": "Service deleted successfully"}

@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific service by ID"""
    db_service = db.query(Service).join(ServiceCategory).filter(Service.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")

    return {
        "id": db_service.id,
        "name": db_service.name,
        "description": db_service.description,
        "base_price": db_service.base_price,
        "labor_hours": db_service.labor_hours,
        "category_name": db_service.category.name,
        "hsn_sac_code": db_service.hsn_sac_code
    }