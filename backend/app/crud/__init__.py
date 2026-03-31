from backend.app.crud.client import client
from backend.app.crud.vehicle import vehicle, vehicle_brand, vehicle_model
from backend.app.crud.invoice import invoice

__all__ = [
    "client",
    "vehicle", "vehicle_brand", "vehicle_model",
    "invoice"
]