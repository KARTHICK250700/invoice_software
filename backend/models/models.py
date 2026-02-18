from sqlalchemy import Column, Integer, String, DateTime, Float, Text, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

from database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(100), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

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
    fuel_type = Column(String(20))  # Petrol, Diesel, Electric, Hybrid
    engine_type = Column(String(50))
    transmission = Column(String(20))  # Manual, Automatic, CVT

    brand = relationship("VehicleBrand", back_populates="models")
    vehicles = relationship("Vehicle", back_populates="model")

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(15), nullable=False)
    mobile = Column(String(15), unique=True, nullable=True, index=True)  # Mobile as optional field
    email = Column(String(100))
    address = Column(Text)
    city = Column(String(50))
    state = Column(String(50))
    pincode = Column(String(10))
    billing_address = Column(Text)  # Separate billing address
    pickup_drop_required = Column(Boolean, default=False)  # Vehicle pickup/drop
    created_at = Column(DateTime, default=datetime.utcnow)

    vehicles = relationship("Vehicle", back_populates="client")
    invoices = relationship("Invoice", back_populates="client")

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    model_id = Column(Integer, ForeignKey("vehicle_models.id"))
    registration_number = Column(String(20), unique=True, nullable=False)
    vin_number = Column(String(17))
    chassis_number = Column(String(50))  # Enhanced chassis tracking
    engine_number = Column(String(50))   # Enhanced engine tracking
    year = Column(Integer)
    color = Column(String(30))
    mileage = Column(Integer)
    km_reading_in = Column(Integer)      # KM when vehicle arrives
    km_reading_out = Column(Integer)     # KM when vehicle leaves
    fuel_type = Column(String(20))
    vehicle_type = Column(String(50))    # Hatchback, Sedan, SUV etc.
    last_service_date = Column(DateTime)
    insurance_expiry = Column(DateTime)   # Insurance expiry tracking
    puc_expiry = Column(DateTime)        # PUC certificate expiry
    notes = Column(Text)                 # Additional vehicle notes
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="vehicles")
    model = relationship("VehicleModel", back_populates="vehicles")
    service_items = relationship("ServiceItem", back_populates="vehicle")
    invoices = relationship("Invoice", back_populates="vehicle")

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
    service_type = Column(String(50))  # General Service, Periodic Maintenance, etc.
    service_category = Column(String(50))  # Engine, Body, Electrical
    base_price = Column(Float, default=0.0)
    labor_hours = Column(Float, default=1.0)
    labor_rate = Column(Float, default=500.0)  # Per hour rate
    hsn_sac_code = Column(String(20), default="8302")  # HSN/SAC for services

    category = relationship("ServiceCategory", back_populates="services")
    invoice_services = relationship("InvoiceService", back_populates="service")

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
    part_number = Column(String(100))  # SKU/Part Code
    hsn_code = Column(String(20))  # HSN Code for GST
    description = Column(Text)
    unit_price = Column(Float, default=0.0)
    stock_quantity = Column(Integer, default=0)
    minimum_stock = Column(Integer, default=5)
    supplier = Column(String(100))
    is_oem = Column(Boolean, default=True)  # OEM vs Aftermarket
    warranty_months = Column(Integer, default=12)  # Warranty in months
    auto_reduce_stock = Column(Boolean, default=True)  # Auto stock reduction

    category = relationship("PartCategory", back_populates="parts")
    invoice_parts = relationship("InvoicePart", back_populates="part")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(20), unique=True, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"))
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    invoice_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime)
    payment_status = Column(String(20), default="pending")  # paid, pending, partially_paid
    service_type = Column(String(50))  # General Service, Periodic Maintenance, etc.
    km_reading_in = Column(Integer)   # KM when arrived
    km_reading_out = Column(Integer)  # KM when delivered
    subtotal = Column(Float, default=0.0)
    gst_enabled = Column(Boolean, default=True)  # GST optional toggle
    tax_rate = Column(Float, default=18.0)  # GST percentage
    cgst_rate = Column(Float, default=9.0)  # CGST percentage
    sgst_rate = Column(Float, default=9.0)  # SGST percentage
    igst_rate = Column(Float, default=18.0)  # IGST percentage
    tax_amount = Column(Float, default=0.0)
    cgst_amount = Column(Float, default=0.0)  # CGST amount
    sgst_amount = Column(Float, default=0.0)  # SGST amount
    igst_amount = Column(Float, default=0.0)  # IGST amount
    discount_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    balance_due = Column(Float, default=0.0)
    round_off = Column(Float, default=0.0)  # Round off amount

    # Enhanced car service fields
    challan_no = Column(String(20))   # Challan number
    challan_date = Column(DateTime)   # Challan date
    eway_bill_no = Column(String(50))  # E-Way Bill number
    transport = Column(String(100))   # Transport details
    transport_id = Column(String(50)) # Transport ID
    place_of_supply = Column(String(100), default="Tamil Nadu (33)")
    hsn_sac_code = Column(String(20), default="8302")  # HSN/SAC code for services

    # Additional car service fields
    technician_name = Column(String(100))  # Technician who worked
    work_order_no = Column(String(50))     # Work order number
    estimate_no = Column(String(50))       # Estimate number
    insurance_claim = Column(Boolean, default=False)  # Insurance claim job
    warranty_applicable = Column(Boolean, default=False)  # Warranty job

    # QR code and unique access
    unique_access_code = Column(String(50), unique=True)  # For QR code access
    qr_code_url = Column(String(200))  # QR code image URL

    # Payment Fields
    payment_method = Column(String(50), default="Cash")  # Cash, Card, UPI, Bank Transfer, Cheque
    payment_reference = Column(String(100))  # Transaction ID, Cheque number
    payment_date = Column(DateTime)
    payment_notes = Column(Text)
    payment_type = Column(String(20), default="Full")  # Full, Partial, Advance
    advance_amount = Column(Float, default=0.0)
    advance_date = Column(DateTime)
    payment_due_days = Column(Integer, default=30)
    late_fee_applicable = Column(Boolean, default=False)
    late_fee_amount = Column(Float, default=0.0)
    early_payment_discount = Column(Float, default=0.0)
    preferred_payment_method = Column(String(50))
    credit_limit = Column(Float, default=0.0)
    credit_days = Column(Integer, default=0)

    # Invoice Unique Features
    invoice_unique_id = Column(String(50), unique=True)
    mobile_invoice_sent = Column(Boolean, default=False)
    email_invoice_sent = Column(Boolean, default=False)
    whatsapp_sent = Column(Boolean, default=False)
    customer_mobile_alt = Column(String(15))
    customer_email_alt = Column(String(100))

    notes = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="invoices")
    vehicle = relationship("Vehicle", back_populates="invoices")
    services = relationship("InvoiceService", back_populates="invoice")
    parts = relationship("InvoicePart", back_populates="invoice")

class InvoiceService(Base):
    __tablename__ = "invoice_services"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    service_id = Column(Integer, ForeignKey("services.id"))
    service_name = Column(String(200))  # Service name (for custom items)
    amount = Column(Float, nullable=False)  # Service cost/amount
    hsn_sac_code = Column(String(20), default="9986")  # HSN/SAC code
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    invoice = relationship("Invoice", back_populates="services")
    service = relationship("Service", back_populates="invoice_services")

class InvoicePart(Base):
    __tablename__ = "invoice_parts"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    part_id = Column(Integer, ForeignKey("parts.id"))
    part_name = Column(String(200))  # Part name (for custom items)
    cost = Column(Float, nullable=False)  # Part cost
    hsn_sac_code = Column(String(20), default="8708")  # HSN/SAC code
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    invoice = relationship("Invoice", back_populates="parts")
    part = relationship("Part", back_populates="invoice_parts")

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

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    quotation_number = Column(String(20), unique=True, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"))
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    quotation_date = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)
    subtotal = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    status = Column(String(20), default="pending")  # pending, accepted, rejected, expired, converted
    notes = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client")
    vehicle = relationship("Vehicle")
    items = relationship("QuotationItem", back_populates="quotation")

class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"))
    item_type = Column(String(20), nullable=False)  # service or part
    name = Column(String(200), nullable=False)
    hsn_sac = Column(String(20))
    quantity = Column(Float, default=1.0)
    rate = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)  # Add discount column
    tax_rate = Column(Float, default=18.0)  # Add tax_rate column
    total = Column(Float, nullable=False)

    quotation = relationship("Quotation", back_populates="items")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    payment_method = Column(String(20), nullable=False)  # UPI, Cash, Card, Bank Transfer
    amount = Column(Float, nullable=False)
    transaction_id = Column(String(100))  # For digital payments
    payment_date = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)

    invoice = relationship("Invoice")

class InvoiceAttachment(Base):
    __tablename__ = "invoice_attachments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    file_name = Column(String(200), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(20))  # image, pdf, etc.
    attachment_type = Column(String(50))  # before_service, after_service, damage, part_proof
    description = Column(Text)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice")

class DigitalSignature(Base):
    __tablename__ = "digital_signatures"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    signature_type = Column(String(20), nullable=False)  # customer, technician
    signature_data = Column(Text, nullable=False)  # Base64 encoded signature
    signer_name = Column(String(100))
    signed_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice")