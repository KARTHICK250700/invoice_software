from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime

class ClientBase(BaseModel):
    name: str
    phone: str
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    billing_address: Optional[str] = None
    pickup_drop_required: Optional[bool] = False

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    billing_address: Optional[str] = None
    pickup_drop_required: Optional[bool] = None

class Client(ClientBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class ClientWithVehicles(Client):
    vehicles: List["Vehicle"] = []

    model_config = {"from_attributes": True}