from sqlalchemy import Column, Integer, String, DateTime, Float, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from backend.app.db.base import Base

class VehicleBrand(Base):
    __tablename__ = "vehicle_brands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    country = Column(String(50))
    logo_url = Column(String(200))

    models = relationship("VehicleModel", back_populates="brand")

class VehicleModel(Base):
    __tablename__ = "vehicle_models"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("vehicle_brands.id"))
    name = Column(String(100), nullable=False)
    year_start = Column(Integer)
    year_end = Column(Integer)
    fuel_type = Column(String(50))
    engine_type = Column(String(100))
    transmission = Column(String(50))

    brand = relationship("VehicleBrand", back_populates="models")
    vehicles = relationship("Vehicle", back_populates="model")

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    model_id = Column(Integer, ForeignKey("vehicle_models.id"))
    registration_number = Column(String(20), unique=True, nullable=False)
    vin_number = Column(String(17))
    chassis_number = Column(String(50))
    engine_number = Column(String(50))
    year = Column(Integer)
    color = Column(String(30))
    mileage = Column(Integer)
    km_reading_in = Column(Integer)
    km_reading_out = Column(Integer)
    fuel_type = Column(String(20))
    transmission = Column(String(20))
    vehicle_type = Column(String(50))
    last_service_date = Column(DateTime)
    insurance_expiry = Column(DateTime)
    puc_expiry = Column(DateTime)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="vehicles")
    model = relationship("VehicleModel", back_populates="vehicles")
    service_items = relationship("ServiceItem", back_populates="vehicle")
    invoices = relationship("Invoice", back_populates="vehicle")