from sqlalchemy import Column, Integer, String, DateTime, Float, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from backend.app.db.base import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(20), unique=True, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"))
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    invoice_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime)
    payment_status = Column(String(20), default="pending")
    service_type = Column(String(50))
    km_reading_in = Column(Integer)
    km_reading_out = Column(Integer)
    subtotal = Column(Float, default=0.0)
    gst_enabled = Column(Boolean, default=True)
    tax_rate = Column(Float, default=18.0)
    cgst_rate = Column(Float, default=9.0)
    sgst_rate = Column(Float, default=9.0)
    igst_rate = Column(Float, default=18.0)
    tax_amount = Column(Float, default=0.0)
    cgst_amount = Column(Float, default=0.0)
    sgst_amount = Column(Float, default=0.0)
    igst_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    balance_due = Column(Float, default=0.0)
    round_off = Column(Float, default=0.0)

    # Enhanced car service fields
    challan_no = Column(String(20))
    challan_date = Column(DateTime)
    eway_bill_no = Column(String(50))
    transport = Column(String(100))
    transport_id = Column(String(50))
    place_of_supply = Column(String(100), default="Tamil Nadu (33)")
    hsn_sac_code = Column(String(20), default="8302")

    # Additional car service fields
    technician_name = Column(String(100))
    work_order_no = Column(String(50))
    estimate_no = Column(String(50))
    insurance_claim = Column(Boolean, default=False)
    warranty_applicable = Column(Boolean, default=False)

    # QR code and unique access
    unique_access_code = Column(String(50), unique=True)
    qr_code_url = Column(String(200))

    # Payment Fields
    payment_method = Column(String(50), default="Cash")
    payment_reference = Column(String(100))
    payment_date = Column(DateTime)
    payment_notes = Column(Text)
    payment_type = Column(String(20), default="Full")
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
    service_name = Column(String(200))
    amount = Column(Float, nullable=False)
    hsn_sac_code = Column(String(20), default="9986")
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
    part_name = Column(String(200))
    cost = Column(Float, nullable=False)
    hsn_sac_code = Column(String(20), default="8708")
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    invoice = relationship("Invoice", back_populates="parts")
    part = relationship("Part", back_populates="invoice_parts")

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
    status = Column(String(20), default="pending")
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
    item_type = Column(String(20), nullable=False)
    name = Column(String(200), nullable=False)
    hsn_sac = Column(String(20))
    quantity = Column(Float, default=1.0)
    rate = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    tax_rate = Column(Float, default=18.0)
    total = Column(Float, nullable=False)

    quotation = relationship("Quotation", back_populates="items")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    payment_method = Column(String(20), nullable=False)
    amount = Column(Float, nullable=False)
    transaction_id = Column(String(100))
    payment_date = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)

    invoice = relationship("Invoice")

class InvoiceAttachment(Base):
    __tablename__ = "invoice_attachments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    file_name = Column(String(200), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(20))
    attachment_type = Column(String(50))
    description = Column(Text)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice")

class DigitalSignature(Base):
    __tablename__ = "digital_signatures"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    signature_type = Column(String(20), nullable=False)
    signature_data = Column(Text, nullable=False)
    signer_name = Column(String(100))
    signed_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice")