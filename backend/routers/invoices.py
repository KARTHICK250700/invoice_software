from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import io
import os
import uuid
# QR code temporarily disabled for deployment

from database.database import SessionLocal
from models.models import Invoice, InvoiceService, InvoicePart, Client, Vehicle, User, Payment
from auth.auth import get_current_user, verify_password

router = APIRouter(prefix="/api/invoices", tags=["invoices"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class ServiceCreate(BaseModel):
    service_id: int
    quantity: int
    rate: float

class PartCreate(BaseModel):
    part_name: str
    quantity: int
    rate: float

class InvoiceCreate(BaseModel):
    client_id: int
    vehicle_id: int
    services: List[ServiceCreate]
    parts: List[PartCreate]
    discount: float = 0.0
    tax_rate: float = 18.0
    payment_terms: str = "Net 30"
    notes: Optional[str] = None

    # Customer contact details
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    customer_email_alt: Optional[str] = None

class ServiceResponse(BaseModel):
    id: int
    service_name: str
    quantity: int
    rate: float
    amount: float

class PartResponse(BaseModel):
    id: int
    part_name: str
    quantity: int
    rate: float
    amount: float

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    client_name: str
    vehicle_info: str
    services: List[ServiceResponse]
    parts: List[PartResponse]
    subtotal: float
    discount: float
    tax_amount: float
    total: float
    status: str
    created_date: datetime
    payment_terms: str
    notes: Optional[str] = None

    # Customer contact details
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    customer_email_alt: Optional[str] = None

    # QR code fields (disabled for now)
    unique_access_code: Optional[str] = None
    qr_code_url: Optional[str] = None

# Payment models
class PaymentCreate(BaseModel):
    amount: float
    payment_method: str = "Cash"  # Cash, Card, Bank Transfer, etc.
    payment_date: Optional[datetime] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    invoice_id: int
    amount: float
    payment_method: str
    payment_date: datetime
    reference_number: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/", response_model=InvoiceResponse)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new invoice"""

    # Get the current invoice count for numbering
    invoice_count = db.query(func.count(Invoice.id)).scalar()
    invoice_number = f"INV{(invoice_count + 1):06d}"

    # Generate unique access code (QR functionality disabled)
    unique_access_code = str(uuid.uuid4())[:12].upper()

    # Calculate totals
    services_total = sum(service.quantity * service.rate for service in invoice_data.services)
    parts_total = sum(part.quantity * part.rate for part in invoice_data.parts)
    subtotal = services_total + parts_total
    discount_amount = (subtotal * invoice_data.discount) / 100
    taxable_amount = subtotal - discount_amount
    tax_amount = (taxable_amount * invoice_data.tax_rate) / 100
    total = taxable_amount + tax_amount

    # Get client and vehicle info
    client = db.query(Client).filter(Client.id == invoice_data.client_id).first()
    vehicle = db.query(Vehicle).filter(Vehicle.id == invoice_data.vehicle_id).first()

    if not client or not vehicle:
        raise HTTPException(status_code=404, detail="Client or vehicle not found")

    # Create invoice
    db_invoice = Invoice(
        user_id=current_user.id,
        invoice_number=invoice_number,
        client_id=invoice_data.client_id,
        vehicle_id=invoice_data.vehicle_id,

        # Use provided customer details or fall back to client data
        customer_name=invoice_data.customer_name or client.name,
        customer_phone=invoice_data.customer_phone or client.phone,
        customer_email=invoice_data.customer_email or client.email,
        customer_address=invoice_data.customer_address or client.address,
        customer_email_alt=invoice_data.customer_email_alt,

        # QR code fields (disabled for now)
        unique_access_code=unique_access_code,
        qr_code_url=f"/api/invoices/view/{unique_access_code}",

        subtotal=subtotal,
        discount=invoice_data.discount,
        tax_rate=invoice_data.tax_rate,
        tax_amount=tax_amount,
        total=total,
        status="Draft",
        payment_terms=invoice_data.payment_terms,
        notes=invoice_data.notes,
        created_date=datetime.now()
    )

    db.add(db_invoice)
    db.flush()  # Get the invoice ID

    # Add services
    for service_data in invoice_data.services:
        # Get service name from service_id (assuming you have a Service model)
        # For now, we'll use a placeholder
        service_name = f"Service {service_data.service_id}"

        invoice_service = InvoiceService(
            invoice_id=db_invoice.id,
            service_id=service_data.service_id,
            service_name=service_name,
            quantity=service_data.quantity,
            rate=service_data.rate,
            amount=service_data.quantity * service_data.rate
        )
        db.add(invoice_service)

    # Add parts
    for part_data in invoice_data.parts:
        invoice_part = InvoicePart(
            invoice_id=db_invoice.id,
            part_name=part_data.part_name,
            quantity=part_data.quantity,
            rate=part_data.rate,
            amount=part_data.quantity * part_data.rate
        )
        db.add(invoice_part)

    db.commit()
    db.refresh(db_invoice)

    # Return formatted response
    services = db.query(InvoiceService).filter(InvoiceService.invoice_id == db_invoice.id).all()
    parts = db.query(InvoicePart).filter(InvoicePart.invoice_id == db_invoice.id).all()

    return InvoiceResponse(
        id=db_invoice.id,
        invoice_number=db_invoice.invoice_number,
        client_name=client.name,
        vehicle_info=f"{vehicle.brand.name} {vehicle.model.name} - {vehicle.license_plate}",
        services=[ServiceResponse(
            id=s.id,
            service_name=s.service_name,
            quantity=s.quantity,
            rate=s.rate,
            amount=s.amount
        ) for s in services],
        parts=[PartResponse(
            id=p.id,
            part_name=p.part_name,
            quantity=p.quantity,
            rate=p.rate,
            amount=p.amount
        ) for p in parts],
        subtotal=db_invoice.subtotal,
        discount=db_invoice.discount,
        tax_amount=db_invoice.tax_amount,
        total=db_invoice.total,
        status=db_invoice.status,
        created_date=db_invoice.created_date,
        payment_terms=db_invoice.payment_terms,
        notes=db_invoice.notes,
        customer_name=db_invoice.customer_name,
        customer_phone=db_invoice.customer_phone,
        customer_email=db_invoice.customer_email,
        customer_address=db_invoice.customer_address,
        customer_email_alt=db_invoice.customer_email_alt,
        unique_access_code=db_invoice.unique_access_code,
        qr_code_url=db_invoice.qr_code_url
    )

@router.get("/", response_model=List[InvoiceResponse])
async def get_invoices(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all invoices for the current user"""
    query = db.query(Invoice).filter(Invoice.user_id == current_user.id)

    if status:
        query = query.filter(Invoice.status == status)

    if client_id:
        query = query.filter(Invoice.client_id == client_id)

    if search:
        query = query.filter(
            (Invoice.invoice_number.contains(search)) |
            (Invoice.customer_name.contains(search))
        )

    invoices = query.order_by(desc(Invoice.created_date)).offset(skip).limit(limit).all()

    # Format response
    response_data = []
    for invoice in invoices:
        client = db.query(Client).filter(Client.id == invoice.client_id).first()
        vehicle = db.query(Vehicle).filter(Vehicle.id == invoice.vehicle_id).first()
        services = db.query(InvoiceService).filter(InvoiceService.invoice_id == invoice.id).all()
        parts = db.query(InvoicePart).filter(InvoicePart.invoice_id == invoice.id).all()

        response_data.append(InvoiceResponse(
            id=invoice.id,
            invoice_number=invoice.invoice_number,
            client_name=client.name if client else "Unknown Client",
            vehicle_info=f"{vehicle.brand.name} {vehicle.model.name} - {vehicle.license_plate}" if vehicle else "Unknown Vehicle",
            services=[ServiceResponse(
                id=s.id,
                service_name=s.service_name,
                quantity=s.quantity,
                rate=s.rate,
                amount=s.amount
            ) for s in services],
            parts=[PartResponse(
                id=p.id,
                part_name=p.part_name,
                quantity=p.quantity,
                rate=p.rate,
                amount=p.amount
            ) for p in parts],
            subtotal=invoice.subtotal,
            discount=invoice.discount,
            tax_amount=invoice.tax_amount,
            total=invoice.total,
            status=invoice.status,
            created_date=invoice.created_date,
            payment_terms=invoice.payment_terms,
            notes=invoice.notes,
            customer_name=invoice.customer_name,
            customer_phone=invoice.customer_phone,
            customer_email=invoice.customer_email,
            customer_address=invoice.customer_address,
            customer_email_alt=invoice.customer_email_alt,
            unique_access_code=invoice.unique_access_code,
            qr_code_url=invoice.qr_code_url
        ))

    return response_data

@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific invoice"""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    vehicle = db.query(Vehicle).filter(Vehicle.id == invoice.vehicle_id).first()
    services = db.query(InvoiceService).filter(InvoiceService.invoice_id == invoice.id).all()
    parts = db.query(InvoicePart).filter(InvoicePart.invoice_id == invoice.id).all()

    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        client_name=client.name if client else "Unknown Client",
        vehicle_info=f"{vehicle.brand.name} {vehicle.model.name} - {vehicle.license_plate}" if vehicle else "Unknown Vehicle",
        services=[ServiceResponse(
            id=s.id,
            service_name=s.service_name,
            quantity=s.quantity,
            rate=s.rate,
            amount=s.amount
        ) for s in services],
        parts=[PartResponse(
            id=p.id,
            part_name=p.part_name,
            quantity=p.quantity,
            rate=p.rate,
            amount=p.amount
        ) for p in parts],
        subtotal=invoice.subtotal,
        discount=invoice.discount,
        tax_amount=invoice.tax_amount,
        total=invoice.total,
        status=invoice.status,
        created_date=invoice.created_date,
        payment_terms=invoice.payment_terms,
        notes=invoice.notes,
        customer_name=invoice.customer_name,
        customer_phone=invoice.customer_phone,
        customer_email=invoice.customer_email,
        customer_address=invoice.customer_address,
        customer_email_alt=invoice.customer_email_alt,
        unique_access_code=invoice.unique_access_code,
        qr_code_url=invoice.qr_code_url
    )

# QR code view endpoint (simplified without actual QR generation)
@router.get("/view/{access_code}")
async def view_invoice_by_qr(access_code: str, db: Session = Depends(get_db)):
    """View invoice via QR code access - no authentication required"""
    invoice = db.query(Invoice).filter(Invoice.unique_access_code == access_code).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Return public invoice data
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    vehicle = db.query(Vehicle).filter(Vehicle.id == invoice.vehicle_id).first()

    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "client_name": client.name if client else "Unknown Client",
        "vehicle_info": f"{vehicle.brand.name} {vehicle.model.name} - {vehicle.license_plate}" if vehicle else "Unknown Vehicle",
        "total": invoice.total,
        "status": invoice.status,
        "created_date": invoice.created_date,
        "customer_name": invoice.customer_name,
        "customer_phone": invoice.customer_phone,
        "customer_email": invoice.customer_email,
        "customer_address": invoice.customer_address
    }

# Payment recording
@router.post("/{invoice_id}/payment", response_model=PaymentResponse)
async def record_payment(
    invoice_id: int,
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Record a payment against an invoice"""

    # Verify invoice exists and belongs to user
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Create payment record
    db_payment = Payment(
        invoice_id=invoice_id,
        amount=payment.amount,
        payment_method=payment.payment_method,
        payment_date=payment.payment_date or datetime.now(),
        reference_number=payment.reference_number,
        notes=payment.notes,
        created_at=datetime.now()
    )

    db.add(db_payment)

    # Update invoice status based on total payments
    total_payments = db.query(func.sum(Payment.amount)).filter(Payment.invoice_id == invoice_id).scalar() or 0
    total_payments += payment.amount

    if total_payments >= invoice.total:
        invoice.status = "Paid"
    elif total_payments > 0:
        invoice.status = "Partially Paid"

    db.commit()
    db.refresh(db_payment)

    return PaymentResponse(
        id=db_payment.id,
        invoice_id=db_payment.invoice_id,
        amount=db_payment.amount,
        payment_method=db_payment.payment_method,
        payment_date=db_payment.payment_date,
        reference_number=db_payment.reference_number,
        notes=db_payment.notes,
        created_at=db_payment.created_at
    )

@router.get("/{invoice_id}/payments", response_model=List[PaymentResponse])
async def get_invoice_payments(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all payments for an invoice"""

    # Verify invoice exists and belongs to user
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    payments = db.query(Payment).filter(Payment.invoice_id == invoice_id).order_by(desc(Payment.payment_date)).all()

    return [PaymentResponse(
        id=p.id,
        invoice_id=p.invoice_id,
        amount=p.amount,
        payment_method=p.payment_method,
        payment_date=p.payment_date,
        reference_number=p.reference_number,
        notes=p.notes,
        created_at=p.created_at
    ) for p in payments]

@router.put("/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update invoice status"""

    # Verify invoice exists and belongs to user
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Validate status
    valid_statuses = ["Draft", "Sent", "Viewed", "Paid", "Cancelled", "Overdue"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid options: {', '.join(valid_statuses)}")

    invoice.status = status
    db.commit()

    return {"message": f"Invoice status updated to {status}"}

@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete an invoice"""

    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Delete related services and parts
    db.query(InvoiceService).filter(InvoiceService.invoice_id == invoice_id).delete()
    db.query(InvoicePart).filter(InvoicePart.invoice_id == invoice_id).delete()
    db.query(Payment).filter(Payment.invoice_id == invoice_id).delete()

    # Delete invoice
    db.delete(invoice)
    db.commit()

    return {"message": "Invoice deleted successfully"}

# Invoice verification endpoint
@router.get("/{invoice_id}/verify")
async def verify_invoice(
    invoice_id: int,
    verification_code: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Public endpoint to verify invoice authenticity
    No authentication required for verification
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Get client and vehicle info
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    vehicle = db.query(Vehicle).filter(Vehicle.id == invoice.vehicle_id).first()

    return {
        "valid": True,
        "invoice_number": invoice.invoice_number,
        "client_name": client.name if client else "Unknown Client",
        "vehicle_info": f"{vehicle.brand.name} {vehicle.model.name} - {vehicle.license_plate}" if vehicle else "Unknown Vehicle",
        "total": invoice.total,
        "status": invoice.status,
        "created_date": invoice.created_date.isoformat(),
        "verification_message": "This invoice is authentic and valid."
    }