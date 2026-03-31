from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.crud import vehicle as vehicle_crud, vehicle_brand, vehicle_model, client as client_crud
from backend.app.schemas.vehicle import VehicleCreate, VehicleUpdate, Vehicle
from backend.app.models.vehicle import Vehicle as VehicleModel

class VehicleService:
    @staticmethod
    def create_vehicle(db: Session, vehicle_data: VehicleCreate) -> Vehicle:
        # Check if client exists
        client = client_crud.get(db, id=vehicle_data.client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )

        # Check if vehicle model exists
        model = vehicle_model.get(db, id=vehicle_data.model_id)
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle model not found"
            )

        # Check if registration number already exists
        existing_vehicle = vehicle_crud.get_by_registration(
            db, registration_number=vehicle_data.registration_number
        )
        if existing_vehicle:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle with this registration number already exists"
            )

        # Create new vehicle
        db_vehicle = vehicle_crud.create(db, obj_in=vehicle_data)
        return Vehicle.model_validate(db_vehicle)

    @staticmethod
    def get_vehicle(db: Session, vehicle_id: int) -> Vehicle:
        db_vehicle = vehicle_crud.get_with_details(db, vehicle_id=vehicle_id)
        if not db_vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found"
            )
        return Vehicle.model_validate(db_vehicle)

    @staticmethod
    def update_vehicle(db: Session, vehicle_id: int, vehicle_data: VehicleUpdate) -> Vehicle:
        db_vehicle = vehicle_crud.get(db, id=vehicle_id)
        if not db_vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found"
            )

        # Check if registration number is being changed and already exists
        if (vehicle_data.registration_number and
            vehicle_data.registration_number != db_vehicle.registration_number):
            existing_vehicle = vehicle_crud.get_by_registration(
                db, registration_number=vehicle_data.registration_number
            )
            if existing_vehicle and existing_vehicle.id != vehicle_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vehicle with this registration number already exists"
                )

        updated_vehicle = vehicle_crud.update(db, db_obj=db_vehicle, obj_in=vehicle_data)
        return Vehicle.model_validate(updated_vehicle)

    @staticmethod
    def delete_vehicle(db: Session, vehicle_id: int) -> bool:
        db_vehicle = vehicle_crud.get(db, id=vehicle_id)
        if not db_vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found"
            )

        vehicle_crud.remove(db, id=vehicle_id)
        return True

    @staticmethod
    def get_vehicles_by_client(db: Session, client_id: int) -> List[Vehicle]:
        db_vehicles = vehicle_crud.get_by_client(db, client_id=client_id)
        return [Vehicle.model_validate(vehicle) for vehicle in db_vehicles]

    @staticmethod
    def search_vehicles(db: Session, query: str) -> List[Vehicle]:
        db_vehicles = vehicle_crud.search_vehicles(db, query=query)
        return [Vehicle.model_validate(vehicle) for vehicle in db_vehicles]

    @staticmethod
    def get_all_vehicles(db: Session, skip: int = 0, limit: int = 100) -> List[Vehicle]:
        db_vehicles = vehicle_crud.get_multi(db, skip=skip, limit=limit)
        return [Vehicle.model_validate(vehicle) for vehicle in db_vehicles]