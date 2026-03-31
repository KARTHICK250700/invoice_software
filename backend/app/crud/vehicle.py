from typing import List, Optional
from sqlalchemy.orm import Session, joinedload

from backend.app.crud.base import CRUDBase
from backend.app.models.vehicle import Vehicle, VehicleBrand, VehicleModel
from backend.app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleBrandCreate, VehicleModelCreate

class CRUDVehicle(CRUDBase[Vehicle, VehicleCreate, VehicleUpdate]):
    def get_by_registration(self, db: Session, *, registration_number: str) -> Optional[Vehicle]:
        return db.query(Vehicle).filter(Vehicle.registration_number == registration_number).first()

    def get_by_client(self, db: Session, *, client_id: int) -> List[Vehicle]:
        return db.query(Vehicle).filter(Vehicle.client_id == client_id).all()

    def get_with_details(self, db: Session, *, vehicle_id: int) -> Optional[Vehicle]:
        return db.query(Vehicle).options(
            joinedload(Vehicle.model).joinedload(VehicleModel.brand),
            joinedload(Vehicle.client)
        ).filter(Vehicle.id == vehicle_id).first()

    def search_vehicles(self, db: Session, *, query: str) -> List[Vehicle]:
        return db.query(Vehicle).filter(
            Vehicle.registration_number.ilike(f"%{query}%")
        ).all()

class CRUDVehicleBrand(CRUDBase[VehicleBrand, VehicleBrandCreate, dict]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[VehicleBrand]:
        return db.query(VehicleBrand).filter(VehicleBrand.name == name).first()

class CRUDVehicleModel(CRUDBase[VehicleModel, VehicleModelCreate, dict]):
    def get_by_brand(self, db: Session, *, brand_id: int) -> List[VehicleModel]:
        return db.query(VehicleModel).filter(VehicleModel.brand_id == brand_id).all()

    def get_by_brand_and_name(self, db: Session, *, brand_id: int, name: str) -> Optional[VehicleModel]:
        return db.query(VehicleModel).filter(
            VehicleModel.brand_id == brand_id,
            VehicleModel.name == name
        ).first()

vehicle = CRUDVehicle(Vehicle)
vehicle_brand = CRUDVehicleBrand(VehicleBrand)
vehicle_model = CRUDVehicleModel(VehicleModel)