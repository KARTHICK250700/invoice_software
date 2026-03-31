from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class VehicleBrandBase(BaseModel):
    name: str
    country: Optional[str] = None
    logo_url: Optional[str] = None

class VehicleBrandCreate(VehicleBrandBase):
    pass

class VehicleBrand(VehicleBrandBase):
    id: int

    model_config = {"from_attributes": True}

class VehicleModelBase(BaseModel):
    brand_id: int
    name: str
    year_start: Optional[int] = None
    year_end: Optional[int] = None
    fuel_type: Optional[str] = None
    engine_type: Optional[str] = None
    transmission: Optional[str] = None

class VehicleModelCreate(VehicleModelBase):
    pass

class VehicleModel(VehicleModelBase):
    id: int
    brand: Optional[VehicleBrand] = None

    model_config = {"from_attributes": True}

class VehicleBase(BaseModel):
    client_id: int
    model_id: int
    registration_number: str
    vin_number: Optional[str] = None
    chassis_number: Optional[str] = None
    engine_number: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    mileage: Optional[int] = None
    km_reading_in: Optional[int] = None
    km_reading_out: Optional[int] = None
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    vehicle_type: Optional[str] = None
    last_service_date: Optional[datetime] = None
    insurance_expiry: Optional[datetime] = None
    puc_expiry: Optional[datetime] = None
    notes: Optional[str] = None

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    client_id: Optional[int] = None
    model_id: Optional[int] = None
    registration_number: Optional[str] = None
    vin_number: Optional[str] = None
    chassis_number: Optional[str] = None
    engine_number: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    mileage: Optional[int] = None
    km_reading_in: Optional[int] = None
    km_reading_out: Optional[int] = None
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    vehicle_type: Optional[str] = None
    last_service_date: Optional[datetime] = None
    insurance_expiry: Optional[datetime] = None
    puc_expiry: Optional[datetime] = None
    notes: Optional[str] = None

class Vehicle(VehicleBase):
    id: int
    created_at: datetime
    model: Optional[VehicleModel] = None

    model_config = {"from_attributes": True}