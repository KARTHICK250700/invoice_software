from sqlalchemy import Column, Integer, String, DateTime, Float, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from backend.app.db.base import Base

class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)

    services = relationship("Service", back_populates="category")

class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("service_categories.id"))
    name = Column(String(200), nullable=False)
    description = Column(Text)
    service_type = Column(String(50))
    service_category = Column(String(50))
    base_price = Column(Float, default=0.0)
    labor_hours = Column(Float, default=1.0)
    labor_rate = Column(Float, default=500.0)
    hsn_sac_code = Column(String(20), default="8302")

    category = relationship("ServiceCategory", back_populates="services")
    invoice_services = relationship("InvoiceService", back_populates="service")

class ServiceItem(Base):
    __tablename__ = "service_items"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    service_date = Column(DateTime, default=datetime.utcnow)
    mileage = Column(Integer)
    description = Column(Text)
    total_amount = Column(Float, default=0.0)
    status = Column(String(20), default="completed")

    vehicle = relationship("Vehicle", back_populates="service_items")