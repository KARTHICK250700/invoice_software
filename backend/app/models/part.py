from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship

from backend.app.db.base import Base

class PartCategory(Base):
    __tablename__ = "part_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)

    parts = relationship("Part", back_populates="category")

class Part(Base):
    __tablename__ = "parts"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("part_categories.id"))
    name = Column(String(200), nullable=False)
    part_number = Column(String(100))
    hsn_code = Column(String(20))
    description = Column(Text)
    unit_price = Column(Float, default=0.0)
    stock_quantity = Column(Integer, default=0)
    minimum_stock = Column(Integer, default=5)
    supplier = Column(String(100))
    is_oem = Column(Boolean, default=True)
    warranty_months = Column(Integer, default=12)
    auto_reduce_stock = Column(Boolean, default=True)

    category = relationship("PartCategory", back_populates="parts")
    invoice_parts = relationship("InvoicePart", back_populates="part")