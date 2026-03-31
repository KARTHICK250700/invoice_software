from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.vehicle import Vehicle, VehicleCreate, VehicleUpdate
from backend.app.services.vehicle_service import VehicleService

router = APIRouter()

@router.post("/", response_model=Vehicle)
def create_vehicle(
    *,
    db: Session = Depends(get_db),
    vehicle_in: VehicleCreate
):
    """Create new vehicle"""
    return VehicleService.create_vehicle(db=db, vehicle_data=vehicle_in)

@router.get("/", response_model=List[Vehicle])
def get_vehicles(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: str = Query(None, description="Search vehicles by registration number"),
    client_id: int = Query(None, description="Filter by client ID")
):
    """Get all vehicles with optional search and filtering"""
    if search:
        return VehicleService.search_vehicles(db=db, query=search)
    elif client_id:
        return VehicleService.get_vehicles_by_client(db=db, client_id=client_id)
    return VehicleService.get_all_vehicles(db=db, skip=skip, limit=limit)

@router.get("/{vehicle_id}", response_model=Vehicle)
def get_vehicle(
    *,
    db: Session = Depends(get_db),
    vehicle_id: int
):
    """Get vehicle by ID"""
    return VehicleService.get_vehicle(db=db, vehicle_id=vehicle_id)

@router.put("/{vehicle_id}", response_model=Vehicle)
def update_vehicle(
    *,
    db: Session = Depends(get_db),
    vehicle_id: int,
    vehicle_in: VehicleUpdate
):
    """Update vehicle"""
    return VehicleService.update_vehicle(db=db, vehicle_id=vehicle_id, vehicle_data=vehicle_in)

@router.delete("/{vehicle_id}")
def delete_vehicle(
    *,
    db: Session = Depends(get_db),
    vehicle_id: int
):
    """Delete vehicle"""
    success = VehicleService.delete_vehicle(db=db, vehicle_id=vehicle_id)
    return {"message": "Vehicle deleted successfully" if success else "Failed to delete vehicle"}