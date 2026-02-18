from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Union
from pydantic import BaseModel, ValidationError, validator
from datetime import datetime
import io
import os
import uuid
import qrcode

from database.database import SessionLocal
from models.models import Invoice, InvoiceService, InvoicePart, Client, Vehicle, User, Payment
from auth.auth import get_current_user, verify_password

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class InvoiceItemCreate(BaseModel):
    item_type: Optional[str] = None  # service or part
    type: Optional[str] = None       # Alternative field name from frontend
    name: str
    hsn_sac: Optional[str] = None
    quantity: Optional[float] = None
    qty: Optional[float] = None      # Alternative field name from frontend
    rate: float
    total: float

class InvoiceCreate(BaseModel):
    client_id: Union[int, str]  # Accept both int and string
    vehicle_id: Union[int, str]  # Accept both int and string
    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

    # GST Configuration
    gst_enabled: bool = True
    tax_rate: float = 18.0
    cgst_rate: float = 9.0
    sgst_rate: float = 9.0
    igst_rate: float = 18.0

    # Amounts
    taxable_amount: Union[float, int] = 0.0
    cgst_amount: Union[float, int] = 0.0
    sgst_amount: Union[float, int] = 0.0
    igst_amount: Union[float, int] = 0.0
    discount_amount: float = 0.0
    round_off: float = 0.0
    total_amount: Union[float, int] = 0.0

    # Car Service Fields
    service_type: Optional[str] = None
    km_reading_in: Optional[int] = None
    km_reading_out: Optional[int] = None
    challan_no: Optional[str] = None
    challan_date: Optional[datetime] = None
    eway_bill_no: Optional[str] = None
    transport: Optional[str] = None
    transport_id: Optional[str] = None
    place_of_supply: str = "Tamil Nadu (33)"
    hsn_sac_code: str = "8302"

    # Additional Fields
    technician_name: Optional[str] = None
    work_order_no: Optional[str] = None
    estimate_no: Optional[str] = None
    insurance_claim: bool = False
    warranty_applicable: bool = False

    # Payment Fields
    payment_method: str = "Cash"  # Cash, Card, UPI, Bank Transfer, Cheque
    payment_reference: Optional[str] = None  # Transaction ID, Cheque number
    payment_date: Optional[datetime] = None
    payment_notes: Optional[str] = None
    payment_type: str = "Full"  # Full, Partial, Advance
    advance_amount: float = 0.0
    advance_date: Optional[datetime] = None
    payment_due_days: int = 30
    late_fee_applicable: bool = False
    late_fee_amount: float = 0.0
    early_payment_discount: float = 0.0
    preferred_payment_method: Optional[str] = None
    credit_limit: float = 0.0
    credit_days: int = 0

    # Invoice Unique Features
    invoice_unique_id: Optional[str] = None
    mobile_invoice_sent: bool = False
    email_invoice_sent: bool = False
    whatsapp_sent: bool = False
    customer_mobile_alt: Optional[str] = None
    customer_email_alt: Optional[str] = None

    notes: Optional[str] = None
    items: List[InvoiceItemCreate] = []

    @validator('client_id', pre=True)
    def parse_client_id(cls, v):
        if isinstance(v, str):
            if v == '' or v == 'NaN':
                raise ValueError("Client ID cannot be empty")
            return int(v)
        if v is None:
            raise ValueError("Client ID is required")
        return int(v)

    @validator('vehicle_id', pre=True)
    def parse_vehicle_id(cls, v):
        if isinstance(v, str):
            if v == '' or v == 'NaN':
                raise ValueError("Vehicle ID cannot be empty")
            return int(v)
        if v is None:
            raise ValueError("Vehicle ID is required")
        return int(v)

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    client_name: str
    vehicle_registration: str
    vehicle_brand: str = "N/A"
    vehicle_model: str = "N/A"
    invoice_date: datetime
    due_date: Optional[datetime]

    # GST fields
    gst_enabled: bool = True
    tax_rate: float = 18.0
    cgst_rate: float = 9.0
    sgst_rate: float = 9.0
    igst_rate: float = 18.0

    # Amounts
    subtotal: float
    tax_amount: float
    cgst_amount: float = 0.0
    sgst_amount: float = 0.0
    igst_amount: float = 0.0
    discount_amount: float
    round_off: float = 0.0
    total_amount: float
    paid_amount: float
    payment_status: str

    # Car service fields (optional for response)
    service_type: Optional[str] = None
    km_reading_in: Optional[int] = None
    km_reading_out: Optional[int] = None
    challan_no: Optional[str] = None
    eway_bill_no: Optional[str] = None
    transport: Optional[str] = None
    technician_name: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/")
async def get_invoices(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Invoice).outerjoin(Client).outerjoin(Vehicle)

    if status:
        query = query.filter(Invoice.payment_status == status)

    invoices = query.offset(skip).limit(limit).all()

    result = []
    for invoice in invoices:
        # Debug logging
        print(f"[DEBUG] Invoice {invoice.id}: client_id={invoice.client_id}, vehicle_id={invoice.vehicle_id}")
        result.append({
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,

            # Essential IDs for edit functionality
            "client_id": invoice.client_id,
            "vehicle_id": invoice.vehicle_id,

            # Display names
            "client_name": invoice.client.name,
            "vehicle_registration": invoice.vehicle.registration_number if invoice.vehicle else "",
            "invoice_date": invoice.invoice_date,
            "due_date": invoice.due_date,

            # GST fields
            "gst_enabled": getattr(invoice, 'gst_enabled', True),
            "tax_rate": getattr(invoice, 'tax_rate', 18.0),
            "cgst_rate": getattr(invoice, 'cgst_rate', 9.0),
            "sgst_rate": getattr(invoice, 'sgst_rate', 9.0),
            "igst_rate": getattr(invoice, 'igst_rate', 18.0),

            # Amounts
            "subtotal": invoice.subtotal,
            "tax_amount": invoice.tax_amount,
            "cgst_amount": getattr(invoice, 'cgst_amount', 0.0),
            "sgst_amount": getattr(invoice, 'sgst_amount', 0.0),
            "igst_amount": getattr(invoice, 'igst_amount', 0.0),
            "discount_amount": invoice.discount_amount,
            "round_off": getattr(invoice, 'round_off', 0.0),
            "total_amount": invoice.total_amount,
            "paid_amount": invoice.paid_amount,
            "payment_status": invoice.payment_status,

            # Car service fields (optional)
            "service_type": getattr(invoice, 'service_type', None),
            "km_reading_in": getattr(invoice, 'km_reading_in', None),
            "km_reading_out": getattr(invoice, 'km_reading_out', None),
            "challan_no": getattr(invoice, 'challan_no', None),
            "eway_bill_no": getattr(invoice, 'eway_bill_no', None),
            "transport": getattr(invoice, 'transport', None),
            "technician_name": getattr(invoice, 'technician_name', None)
        })

    return result


@router.post("/", response_model=InvoiceResponse)
async def create_invoice(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        # Get raw request body first
        body = await request.body()
        print(f"[DEBUG] Raw request body: {body.decode()}")

        # Parse as JSON to see the actual data structure
        import json
        raw_data = json.loads(body.decode())
        print(f"[DEBUG] Parsed JSON data: {raw_data}")

        # Try to create the InvoiceCreate object
        invoice_data = InvoiceCreate(**raw_data)
        print(f"[DEBUG] Successfully parsed InvoiceCreate object")
        print(f"[DEBUG] ========== INVOICE CREATION ATTEMPT ==========")
        print(f"[DEBUG] Client ID: {invoice_data.client_id}")
        print(f"[DEBUG] Vehicle ID: {invoice_data.vehicle_id}")
        print(f"[DEBUG] Items count: {len(invoice_data.items) if invoice_data.items else 0}")
        print(f"[DEBUG] GST enabled: {invoice_data.gst_enabled}")
        print(f"[DEBUG] Total amount: {invoice_data.total_amount}")

        if invoice_data.items:
            for i, item in enumerate(invoice_data.items):
                print(f"[DEBUG] Item {i+1}: {item.name} - Type: {item.item_type} - Rate: {item.rate}")

        print(f"[DEBUG] Full data: {invoice_data.dict()}")
        print(f"[DEBUG] =============================================")

        # Verify client exists
        client = db.query(Client).filter(Client.id == invoice_data.client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        # Verify vehicle exists
        vehicle = db.query(Vehicle).filter(Vehicle.id == invoice_data.vehicle_id).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        # Generate invoice number
        invoice_count = db.query(Invoice).count()
        invoice_number = f"INV{(invoice_count + 1):06d}"

        # Generate unique access code for QR
        unique_access_code = str(uuid.uuid4())[:12].upper()

        # Generate unique invoice ID if not provided
        invoice_unique_id = invoice_data.invoice_unique_id or f"UID-{str(uuid.uuid4())[:8].upper()}"

        # Create invoice with all new fields
        db_invoice = Invoice(
            invoice_number=invoice_number,
            client_id=invoice_data.client_id,
            vehicle_id=invoice_data.vehicle_id,
            invoice_date=invoice_data.invoice_date or datetime.utcnow(),
            due_date=invoice_data.due_date,

            # GST fields
            gst_enabled=invoice_data.gst_enabled,
            tax_rate=invoice_data.tax_rate,
            cgst_rate=invoice_data.cgst_rate,
            sgst_rate=invoice_data.sgst_rate,
            igst_rate=invoice_data.igst_rate,

            # Amount fields
            subtotal=invoice_data.taxable_amount,
            tax_amount=invoice_data.igst_amount,
            cgst_amount=invoice_data.cgst_amount,
            sgst_amount=invoice_data.sgst_amount,
            igst_amount=invoice_data.igst_amount,
            discount_amount=invoice_data.discount_amount,
            round_off=invoice_data.round_off,
            total_amount=invoice_data.total_amount,

            # Car service fields
            service_type=invoice_data.service_type,
            km_reading_in=invoice_data.km_reading_in,
            km_reading_out=invoice_data.km_reading_out,
            challan_no=invoice_data.challan_no,
            challan_date=invoice_data.challan_date,
            eway_bill_no=invoice_data.eway_bill_no,
            transport=invoice_data.transport,
            transport_id=invoice_data.transport_id,
            place_of_supply=invoice_data.place_of_supply,
            hsn_sac_code=invoice_data.hsn_sac_code,

            # Additional fields
            technician_name=invoice_data.technician_name,
            work_order_no=invoice_data.work_order_no,
            estimate_no=invoice_data.estimate_no,
            insurance_claim=invoice_data.insurance_claim,
            warranty_applicable=invoice_data.warranty_applicable,

            # Payment fields
            payment_method=invoice_data.payment_method,
            payment_reference=invoice_data.payment_reference,
            payment_date=invoice_data.payment_date,
            payment_notes=invoice_data.payment_notes,
            payment_type=invoice_data.payment_type,
            advance_amount=invoice_data.advance_amount,
            advance_date=invoice_data.advance_date,
            payment_due_days=invoice_data.payment_due_days,
            late_fee_applicable=invoice_data.late_fee_applicable,
            late_fee_amount=invoice_data.late_fee_amount,
            early_payment_discount=invoice_data.early_payment_discount,
            preferred_payment_method=invoice_data.preferred_payment_method,
            credit_limit=invoice_data.credit_limit,
            credit_days=invoice_data.credit_days,

            # Invoice unique features
            invoice_unique_id=invoice_unique_id,
            mobile_invoice_sent=invoice_data.mobile_invoice_sent,
            email_invoice_sent=invoice_data.email_invoice_sent,
            whatsapp_sent=invoice_data.whatsapp_sent,
            customer_mobile_alt=invoice_data.customer_mobile_alt,
            customer_email_alt=invoice_data.customer_email_alt,

            # QR code fields
            unique_access_code=unique_access_code,
            qr_code_url=f"/api/invoices/view/{unique_access_code}",

            notes=invoice_data.notes,
            created_by=current_user.id
        )

        db.add(db_invoice)
        db.commit()
        db.refresh(db_invoice)

        # Process invoice items (services and parts)
        if invoice_data.items:
            for item in invoice_data.items:
                # Determine item type
                item_type = getattr(item, 'item_type', None) or getattr(item, 'type', 'service')
                quantity = getattr(item, 'quantity', None) or getattr(item, 'qty', 1)

                if item_type == 'service' or item_type == 'Service':
                    # Create service
                    service = InvoiceService(
                        invoice_id=db_invoice.id,
                        service_name=item.name,
                        amount=item.rate,
                        hsn_sac_code=item.hsn_sac or "9986",
                        quantity=quantity,
                        unit_price=item.rate,
                        total_price=item.rate * quantity
                    )
                    db.add(service)
                elif item_type == 'part' or item_type == 'Part':
                    # Create part
                    part = InvoicePart(
                        invoice_id=db_invoice.id,
                        part_name=item.name,
                        cost=item.rate,
                        quantity=quantity,
                        hsn_sac_code=item.hsn_sac or "8708",
                        unit_price=item.rate,
                        total_price=item.rate * quantity
                    )
                    db.add(part)

            db.commit()

        print(f"[SUCCESS] Invoice {invoice_number} created successfully with {len(invoice_data.items)} items")

        return InvoiceResponse(
            id=db_invoice.id,
            invoice_number=db_invoice.invoice_number,
            client_name=client.name,
            vehicle_registration=vehicle.registration_number,
            invoice_date=db_invoice.invoice_date,
            due_date=db_invoice.due_date,

            # GST fields
            gst_enabled=db_invoice.gst_enabled,
            tax_rate=db_invoice.tax_rate,
            cgst_rate=db_invoice.cgst_rate,
            sgst_rate=db_invoice.sgst_rate,
            igst_rate=db_invoice.igst_rate,

            # Amounts
            subtotal=db_invoice.subtotal,
            tax_amount=db_invoice.tax_amount,
            cgst_amount=db_invoice.cgst_amount,
            sgst_amount=db_invoice.sgst_amount,
            igst_amount=db_invoice.igst_amount,
            discount_amount=db_invoice.discount_amount,
            round_off=db_invoice.round_off,
            total_amount=db_invoice.total_amount,
            paid_amount=db_invoice.paid_amount,
            payment_status=db_invoice.payment_status,

            # Car service fields
            service_type=db_invoice.service_type,
            km_reading_in=db_invoice.km_reading_in,
            km_reading_out=db_invoice.km_reading_out,
            challan_no=db_invoice.challan_no,
            eway_bill_no=db_invoice.eway_bill_no,
            transport=db_invoice.transport,
            technician_name=db_invoice.technician_name
        )

    except HTTPException:
        db.rollback()
        raise
    except ValidationError as e:
        print(f"[ERROR] Validation error in invoice creation: {str(e)}")
        print(f"[ERROR] Validation details: {e.errors()}")
        db.rollback()
        raise HTTPException(status_code=422, detail=f"Validation error: {str(e)}")
    except Exception as e:
        print(f"[ERROR] Failed to create invoice: {str(e)}")
        print(f"[ERROR] Exception type: {type(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update an existing invoice"""
    try:
        print(f"[DEBUG] Updating invoice {invoice_id}")
        print(f"[DEBUG] Received data: client_id={invoice_data.client_id}, vehicle_id={invoice_data.vehicle_id}")
        print(f"[DEBUG] Items count: {len(invoice_data.items) if invoice_data.items else 0}")

        # Get existing invoice
        db_invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not db_invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        # Verify client exists
        client = db.query(Client).filter(Client.id == invoice_data.client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        # Verify vehicle exists
        vehicle = db.query(Vehicle).filter(Vehicle.id == invoice_data.vehicle_id).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        # Update invoice fields
        db_invoice.client_id = invoice_data.client_id
        db_invoice.vehicle_id = invoice_data.vehicle_id
        db_invoice.invoice_date = invoice_data.invoice_date or db_invoice.invoice_date
        db_invoice.due_date = invoice_data.due_date

        # Update GST fields
        db_invoice.gst_enabled = invoice_data.gst_enabled
        db_invoice.tax_rate = invoice_data.tax_rate
        db_invoice.cgst_rate = invoice_data.cgst_rate
        db_invoice.sgst_rate = invoice_data.sgst_rate
        db_invoice.igst_rate = invoice_data.igst_rate

        # Update amount fields
        db_invoice.subtotal = invoice_data.taxable_amount
        db_invoice.tax_amount = invoice_data.igst_amount
        db_invoice.cgst_amount = invoice_data.cgst_amount
        db_invoice.sgst_amount = invoice_data.sgst_amount
        db_invoice.igst_amount = invoice_data.igst_amount
        db_invoice.discount_amount = invoice_data.discount_amount
        db_invoice.round_off = invoice_data.round_off
        db_invoice.total_amount = invoice_data.total_amount

        # Update car service fields
        db_invoice.service_type = invoice_data.service_type
        db_invoice.km_reading_in = invoice_data.km_reading_in
        db_invoice.km_reading_out = invoice_data.km_reading_out
        db_invoice.challan_no = invoice_data.challan_no
        db_invoice.challan_date = invoice_data.challan_date
        db_invoice.eway_bill_no = invoice_data.eway_bill_no
        db_invoice.transport = invoice_data.transport
        db_invoice.transport_id = invoice_data.transport_id
        db_invoice.place_of_supply = invoice_data.place_of_supply
        db_invoice.hsn_sac_code = invoice_data.hsn_sac_code

        # Update additional fields
        db_invoice.technician_name = invoice_data.technician_name
        db_invoice.work_order_no = invoice_data.work_order_no
        db_invoice.estimate_no = invoice_data.estimate_no
        db_invoice.insurance_claim = invoice_data.insurance_claim
        db_invoice.warranty_applicable = invoice_data.warranty_applicable

        db_invoice.notes = invoice_data.notes

        # Update invoice items (services and parts) - clear existing and recreate
        if invoice_data.items:
            # Delete existing services and parts
            db.query(InvoiceService).filter(InvoiceService.invoice_id == invoice_id).delete()
            db.query(InvoicePart).filter(InvoicePart.invoice_id == invoice_id).delete()

            # Add new items
            for item in invoice_data.items:
                # Determine item type
                item_type = getattr(item, 'item_type', None) or getattr(item, 'type', 'service')
                quantity = getattr(item, 'quantity', None) or getattr(item, 'qty', 1)

                if item_type == 'service' or item_type == 'Service':
                    # Create service with all required fields
                    service = InvoiceService(
                        invoice_id=invoice_id,
                        service_name=item.name,
                        amount=item.rate,
                        unit_price=item.rate,      # Required field
                        total_price=item.total,    # Required field
                        hsn_sac_code=item.hsn_sac or "9986",
                        quantity=quantity
                    )
                    db.add(service)
                elif item_type == 'part' or item_type == 'Part':
                    # Create part with all required fields
                    part = InvoicePart(
                        invoice_id=invoice_id,
                        part_name=item.name,
                        cost=item.rate,
                        unit_price=item.rate,      # Required field
                        total_price=item.total,    # Required field
                        quantity=int(quantity),
                        hsn_sac_code=item.hsn_sac or "8708"
                    )
                    db.add(part)

        db.commit()
        db.refresh(db_invoice)

        print(f"[SUCCESS] Invoice {db_invoice.invoice_number} updated successfully with {len(invoice_data.items) if invoice_data.items else 0} items")

        return InvoiceResponse(
            id=db_invoice.id,
            invoice_number=db_invoice.invoice_number,
            client_name=client.name,
            vehicle_registration=vehicle.registration_number,
            invoice_date=db_invoice.invoice_date,
            due_date=db_invoice.due_date,

            # GST fields
            gst_enabled=getattr(db_invoice, 'gst_enabled', True),
            tax_rate=getattr(db_invoice, 'tax_rate', 18.0),
            cgst_rate=getattr(db_invoice, 'cgst_rate', 9.0),
            sgst_rate=getattr(db_invoice, 'sgst_rate', 9.0),
            igst_rate=getattr(db_invoice, 'igst_rate', 18.0),

            # Amounts
            subtotal=db_invoice.subtotal,
            tax_amount=db_invoice.tax_amount,
            cgst_amount=getattr(db_invoice, 'cgst_amount', 0.0),
            sgst_amount=getattr(db_invoice, 'sgst_amount', 0.0),
            igst_amount=getattr(db_invoice, 'igst_amount', 0.0),
            discount_amount=db_invoice.discount_amount,
            round_off=getattr(db_invoice, 'round_off', 0.0),
            total_amount=db_invoice.total_amount,
            paid_amount=db_invoice.paid_amount,
            payment_status=db_invoice.payment_status,

            # Car service fields
            service_type=getattr(db_invoice, 'service_type', None),
            km_reading_in=getattr(db_invoice, 'km_reading_in', None),
            km_reading_out=getattr(db_invoice, 'km_reading_out', None),
            challan_no=getattr(db_invoice, 'challan_no', None),
            eway_bill_no=getattr(db_invoice, 'eway_bill_no', None),
            transport=getattr(db_invoice, 'transport', None),
            technician_name=getattr(db_invoice, 'technician_name', None)
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        print(f"[ERROR] Failed to update invoice: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{invoice_id}/preview")
async def preview_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Preview invoice as HTML"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Generate HTML preview
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Invoice {invoice.invoice_number}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            .header {{ text-align: center; margin-bottom: 30px; }}
            .details {{ margin-bottom: 20px; }}
            .items {{ width: 100%; border-collapse: collapse; }}
            .items th, .items td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
            .items th {{ background-color: #f2f2f2; }}
            .total {{ text-align: right; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>INVOICE</h1>
            <h2>{invoice.invoice_number}</h2>
        </div>

        <div class="details">
            <p><strong>Client:</strong> {invoice.client.name if invoice.client else 'N/A'}</p>
            <p><strong>Vehicle:</strong> {invoice.vehicle.registration_number if invoice.vehicle else 'N/A'}</p>
            <p><strong>Invoice Date:</strong> {invoice.invoice_date.strftime('%d-%m-%Y') if invoice.invoice_date else 'N/A'}</p>
            <p><strong>Due Date:</strong> {invoice.due_date.strftime('%d-%m-%Y') if invoice.due_date else 'N/A'}</p>
            <p><strong>Status:</strong> {invoice.payment_status}</p>
        </div>

        <div class="total">
            <p><strong>Subtotal: ₹{invoice.subtotal:.2f}</strong></p>
            <p><strong>Tax Amount: ₹{invoice.tax_amount:.2f}</strong></p>
            <p><strong>Discount: ₹{invoice.discount_amount:.2f}</strong></p>
            <p><strong>Total Amount: ₹{invoice.total_amount:.2f}</strong></p>
            <p><strong>Paid Amount: ₹{invoice.paid_amount:.2f}</strong></p>
            <p><strong>Balance Due: ₹{(invoice.total_amount - invoice.paid_amount):.2f}</strong></p>
        </div>

        {f'<p><strong>Notes:</strong> {invoice.notes}</p>' if invoice.notes else ''}
    </body>
    </html>
    """

    return {"html": html_content}



@router.get("/view/{access_code}")
async def view_invoice_by_qr(access_code: str, db: Session = Depends(get_db)):
    """View invoice via QR code access - no authentication required"""
    invoice = db.query(Invoice).filter(Invoice.unique_access_code == access_code).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Return public invoice data for QR access
    response_data = {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "client_name": invoice.client.name if invoice.client else "",
        "vehicle_registration": invoice.vehicle.registration_number if invoice.vehicle else "",
        "invoice_date": invoice.invoice_date.strftime('%Y-%m-%d') if invoice.invoice_date else None,
        "due_date": invoice.due_date.strftime('%Y-%m-%d') if invoice.due_date else None,
        "subtotal": invoice.subtotal,
        "tax_amount": invoice.tax_amount,
        "total_amount": invoice.total_amount,
        "payment_status": invoice.payment_status,
        "gst_enabled": invoice.gst_enabled,
        "service_type": invoice.service_type,
        "notes": invoice.notes
    }

    return response_data

# Test endpoint without authentication for debugging
@router.get("/{invoice_id}/test")
async def get_invoice_test(
    invoice_id: int,
    db: Session = Depends(get_db)
):
    """Get invoice without authentication for testing"""
    return await get_invoice_internal(invoice_id, db)

@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific invoice by ID with authentication"""
    return await get_invoice_internal(invoice_id, db)

async def get_invoice_internal(invoice_id: int, db: Session):
    """Internal function to get invoice data"""
    try:
        # Use left joins to handle cases where client or vehicle might be missing
        invoice = db.query(Invoice).outerjoin(Client, Invoice.client_id == Client.id).outerjoin(Vehicle, Invoice.vehicle_id == Vehicle.id).filter(Invoice.id == invoice_id).first()

        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")

        # Note: Allow invoices with missing client_id/vehicle_id for edit functionality
        # Frontend will handle validation and display warnings if needed

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Database error while fetching invoice: {str(e)}")

    # Format response for frontend compatibility
    response_data = {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "client_id": invoice.client_id,
        "vehicle_id": invoice.vehicle_id,
        "invoice_date": invoice.invoice_date.strftime('%Y-%m-%d') if invoice.invoice_date else None,
        "due_date": invoice.due_date.strftime('%Y-%m-%d') if invoice.due_date else None,

        # Amount fields with proper mappings
        "subtotal": invoice.subtotal,
        "tax_amount": invoice.tax_amount,
        "taxable_amount": invoice.subtotal,  # Add field frontend expects
        "igst_amount": getattr(invoice, 'igst_amount', invoice.tax_amount),   # Use proper field
        "cgst_amount": getattr(invoice, 'cgst_amount', 0.0),
        "sgst_amount": getattr(invoice, 'sgst_amount', 0.0),
        "discount_amount": invoice.discount_amount,
        "round_off": getattr(invoice, 'round_off', 0.0),
        "total_amount": invoice.total_amount,
        "paid_amount": invoice.paid_amount,
        "payment_status": invoice.payment_status,

        # GST configuration
        "gst_enabled": getattr(invoice, 'gst_enabled', True),
        "tax_rate": getattr(invoice, 'tax_rate', 18.0),
        "cgst_rate": getattr(invoice, 'cgst_rate', 9.0),
        "sgst_rate": getattr(invoice, 'sgst_rate', 9.0),
        "igst_rate": getattr(invoice, 'igst_rate', 18.0),

        # Additional fields
        "place_of_supply": getattr(invoice, 'place_of_supply', 'Tamil Nadu (33)'),
        "challan_no": getattr(invoice, 'challan_no', None),
        "challan_date": invoice.challan_date.strftime('%Y-%m-%d') if hasattr(invoice, 'challan_date') and invoice.challan_date else None,
        "eway_bill_no": getattr(invoice, 'eway_bill_no', None),
        "transport": getattr(invoice, 'transport', None),
        "transport_id": getattr(invoice, 'transport_id', None),
        "insurance_claim": getattr(invoice, 'insurance_claim', False),
        "warranty_applicable": getattr(invoice, 'warranty_applicable', False),
        "notes": getattr(invoice, 'notes', None),

        "client_name": invoice.client.name if invoice.client else "",
        "vehicle_registration": invoice.vehicle.registration_number if invoice.vehicle else "",
        "vehicle_brand": invoice.vehicle.model.brand.name if invoice.vehicle and invoice.vehicle.model and invoice.vehicle.model.brand else "N/A",
        "vehicle_model": invoice.vehicle.model.name if invoice.vehicle and invoice.vehicle.model else "N/A",

        # Complete client and vehicle objects for edit functionality with error handling
        "client": {
            "id": getattr(invoice.client, 'id', None),
            "name": getattr(invoice.client, 'name', '') or "",
            "phone": getattr(invoice.client, 'phone', '') or "",
            "mobile": getattr(invoice.client, 'mobile', '') or "",
            "email": getattr(invoice.client, 'email', '') or "",
            "address": getattr(invoice.client, 'address', '') or "",
            "city": getattr(invoice.client, 'city', '') or "",
            "state": getattr(invoice.client, 'state', '') or "",
            "pincode": getattr(invoice.client, 'pincode', '') or ""
        } if invoice.client else {
            "id": None,
            "name": "Client data not available",
            "phone": "",
            "mobile": "",
            "email": "",
            "address": "",
            "city": "",
            "state": "",
            "pincode": ""
        },

        "vehicle": {
            "id": getattr(invoice.vehicle, 'id', None),
            "registration_number": getattr(invoice.vehicle, 'registration_number', '') or "",
            "client_id": getattr(invoice.vehicle, 'client_id', None),
            "model_id": getattr(invoice.vehicle, 'model_id', None),
            "year": getattr(invoice.vehicle, 'year', None),
            "color": getattr(invoice.vehicle, 'color', '') or "",
            "fuel_type": getattr(invoice.vehicle, 'fuel_type', '') or "",
            "vehicle_type": getattr(invoice.vehicle, 'vehicle_type', '') or "",
            "engine_number": getattr(invoice.vehicle, 'engine_number', '') or "",
            "chassis_number": getattr(invoice.vehicle, 'chassis_number', '') or "",
            "vin_number": getattr(invoice.vehicle, 'vin_number', '') or "",
            "insurance_expiry": invoice.vehicle.insurance_expiry.strftime('%Y-%m-%d') if hasattr(invoice.vehicle, 'insurance_expiry') and invoice.vehicle.insurance_expiry else None,
            "puc_expiry": invoice.vehicle.puc_expiry.strftime('%Y-%m-%d') if hasattr(invoice.vehicle, 'puc_expiry') and invoice.vehicle.puc_expiry else None,
            "notes": getattr(invoice.vehicle, 'notes', '') or "",
            "brand_name": (invoice.vehicle.model.brand.name if hasattr(invoice.vehicle, 'model') and invoice.vehicle.model and hasattr(invoice.vehicle.model, 'brand') and invoice.vehicle.model.brand else "N/A"),\
            "model_name": (invoice.vehicle.model.name if hasattr(invoice.vehicle, 'model') and invoice.vehicle.model else "N/A")
        } if invoice.vehicle else {
            "id": None,
            "registration_number": "Vehicle data not available",
            "client_id": None,
            "model_id": None,
            "year": None,
            "color": "",
            "fuel_type": "",
            "vehicle_type": "",
            "engine_number": "",
            "chassis_number": "",
            "vin_number": "",
            "insurance_expiry": None,
            "puc_expiry": None,
            "notes": "",
            "brand_name": "N/A",
            "model_name": "N/A"
        },

        # Fetch invoice items (services and parts)
        "items": []
    }

    # Fetch invoice services and parts
    try:
        services = db.query(InvoiceService).filter(InvoiceService.invoice_id == invoice_id).all()
        parts = db.query(InvoicePart).filter(InvoicePart.invoice_id == invoice_id).all()

        items = []

        # Add services to items
        for service in services:
            items.append({
                "id": f"service_{service.id}",
                "type": "service",
                "item_type": "service",  # Add field frontend expects
                "service_id": service.service_id,
                "name": service.service_name or f"Service {service.service_id}",
                "description": service.service_name or "",
                "quantity": float(service.quantity),
                "unit_price": float(service.unit_price),
                "rate": float(service.unit_price),  # Add field frontend expects
                "total": float(service.total_price),
                "hsn_code": service.hsn_sac_code or "",
                "hsn_sac": service.hsn_sac_code or "",  # Add field frontend expects
                "discount": 0.0  # Calculate discount if needed
            })

        # Add parts to items
        for part in parts:
            items.append({
                "id": f"part_{part.id}",
                "type": "part",
                "item_type": "part",  # Add field frontend expects
                "part_id": part.part_id,
                "name": part.part_name or f"Part {part.part_id}",
                "description": part.part_name or "",
                "quantity": int(part.quantity),
                "unit_price": float(part.unit_price),
                "rate": float(part.unit_price),  # Add field frontend expects
                "total": float(part.total_price),
                "hsn_code": part.hsn_sac_code or "",
                "hsn_sac": part.hsn_sac_code or "",  # Add field frontend expects
                "discount": 0.0  # Calculate discount if needed
            })

        response_data["items"] = items

    except Exception as e:
        print(f"[WARNING] Failed to fetch invoice items for invoice {invoice_id}: {str(e)}")
        response_data["items"] = []

    return response_data


class DeleteRequest(BaseModel):
    password: str

@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    delete_data: DeleteRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete an invoice and all its associated items with password verification"""
    try:
        # Get password from request
        password = delete_data.password
        if not password:
            raise HTTPException(status_code=400, detail="Password is required for deletion")

        # Verify password
        if not verify_password(password, current_user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid password")

        # Check if invoice exists
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        invoice_number = invoice.invoice_number

        # Delete associated invoice services
        db.query(InvoiceService).filter(InvoiceService.invoice_id == invoice_id).delete()

        # Delete associated invoice parts
        db.query(InvoicePart).filter(InvoicePart.invoice_id == invoice_id).delete()

        # Delete the invoice
        db.delete(invoice)
        db.commit()

        return {"message": f"Invoice #{invoice_number} deleted successfully"}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error deleting invoice {invoice_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete invoice: {str(e)}")


@router.patch("/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: int,
    status_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update invoice payment status"""
    try:
        # Get the new status from request
        new_status = status_data.get("payment_status")
        if not new_status:
            raise HTTPException(status_code=400, detail="Payment status is required")

        # Validate status
        valid_statuses = ["pending", "paid", "partially_paid"]
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

        # Check if invoice exists
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        # Update status
        old_status = invoice.payment_status
        invoice.payment_status = new_status

        # Update paid amount if status is paid
        if new_status == "paid":
            invoice.paid_amount = invoice.total_amount
            invoice.balance_due = 0.0
        elif new_status == "pending":
            invoice.paid_amount = 0.0
            invoice.balance_due = invoice.total_amount

        db.commit()

        return {
            "message": f"Invoice #{invoice.invoice_number} status updated from '{old_status}' to '{new_status}'",
            "invoice_id": invoice_id,
            "old_status": old_status,
            "new_status": new_status,
            "paid_amount": invoice.paid_amount,
            "balance_due": invoice.balance_due
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error updating invoice status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update invoice status: {str(e)}")

@router.get("/{invoice_id}/verify")
async def verify_invoice(
    invoice_id: int,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to verify invoice authenticity via QR code
    No authentication required for verification
    """
    try:
        print(f"[INFO] Verifying invoice ID: {invoice_id}")

        # Fetch invoice with related data
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        # Fetch client details
        client = None
        if invoice.client_id:
            client = db.query(Client).filter(Client.id == invoice.client_id).first()

        # Fetch vehicle details
        vehicle = None
        if invoice.vehicle_id:
            vehicle = db.query(Vehicle).filter(Vehicle.id == invoice.vehicle_id).first()

        # Fetch invoice items (services and parts)
        services = db.query(InvoiceService).filter(InvoiceService.invoice_id == invoice_id).all()
        parts = db.query(InvoicePart).filter(InvoicePart.invoice_id == invoice_id).all()

        # Build items list
        items = []

        # Add services
        for service in services:
            items.append({
                "id": f"service_{service.id}",
                "item_type": "service",
                "name": service.description or "Service",
                "hsn_sac": service.hsn_sac_code or "9986",
                "quantity": int(service.quantity or 1),
                "rate": float(service.unit_price or 0),
                "total": float(service.total_price or 0)
            })

        # Add parts
        for part in parts:
            items.append({
                "id": f"part_{part.id}",
                "item_type": "part",
                "name": part.description or "Auto Part",
                "hsn_sac": part.hsn_sac_code or "8708",
                "quantity": int(part.quantity or 1),
                "rate": float(part.unit_price or 0),
                "total": float(part.total_price or 0)
            })

        # Build response data
        verification_data = {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "client_id": invoice.client_id,
            "vehicle_id": invoice.vehicle_id,
            "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
            "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
            "total_amount": float(invoice.total_amount or 0),
            "taxable_amount": float(invoice.taxable_amount or 0),
            "gst_enabled": bool(invoice.gst_enabled),
            "tax_rate": float(invoice.tax_rate or 0),
            "cgst_amount": float(invoice.cgst_amount or 0),
            "sgst_amount": float(invoice.sgst_amount or 0),
            "igst_amount": float(invoice.igst_amount or 0),
            "discount_amount": float(invoice.discount_amount or 0),
            "round_off": float(invoice.round_off or 0),
            "service_type": invoice.service_type,
            "place_of_supply": invoice.place_of_supply,
            "insurance_claim": bool(invoice.insurance_claim),
            "warranty_applicable": bool(invoice.warranty_applicable),
            "notes": invoice.notes,
            "items": items,
            "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
            "updated_at": invoice.updated_at.isoformat() if invoice.updated_at else None,
        }

        # Add client data if available
        if client:
            verification_data["client"] = {
                "name": client.name,
                "phone": client.phone,
                "mobile": client.mobile,
                "address": client.address,
                "gst_number": client.gst_number
            }

        # Add vehicle data if available
        if vehicle:
            verification_data["vehicle"] = {
                "registration_number": vehicle.registration_number,
                "brand_name": vehicle.brand_name,
                "model_name": vehicle.model_name
            }

        print(f"[SUCCESS] Invoice {invoice_id} verified successfully")
        return verification_data

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Error verifying invoice {invoice_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to verify invoice: {str(e)}")

# Payment Schema
class PaymentCreate(BaseModel):
    amount: float
    payment_method: str = "Cash"  # Cash, UPI, Card, Bank Transfer, Cheque
    transaction_id: Optional[str] = None
    payment_date: Optional[datetime] = None
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    invoice_id: int
    amount: float
    payment_method: str
    transaction_id: Optional[str]
    payment_date: datetime
    notes: Optional[str]

# Payment Endpoints
@router.post("/{invoice_id}/payment", response_model=PaymentResponse)
async def record_payment(
    invoice_id: int,
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Record a payment for an invoice"""
    # Get the invoice
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Create payment record
    db_payment = Payment(
        invoice_id=invoice_id,
        amount=payment.amount,
        payment_method=payment.payment_method,
        transaction_id=payment.transaction_id,
        payment_date=payment.payment_date or datetime.now(),
        notes=payment.notes
    )
    db.add(db_payment)

    # Update invoice payment status and paid amount
    invoice.paid_amount = (invoice.paid_amount or 0) + payment.amount

    # Determine payment status
    if invoice.paid_amount >= invoice.total_amount:
        invoice.payment_status = "paid"
    elif invoice.paid_amount > 0:
        invoice.payment_status = "partially_paid"
    else:
        invoice.payment_status = "pending"

    db.commit()
    db.refresh(db_payment)

    return PaymentResponse(
        id=db_payment.id,
        invoice_id=db_payment.invoice_id,
        amount=db_payment.amount,
        payment_method=db_payment.payment_method,
        transaction_id=db_payment.transaction_id,
        payment_date=db_payment.payment_date,
        notes=db_payment.notes
    )

@router.get("/{invoice_id}/payments", response_model=List[PaymentResponse])
async def get_invoice_payments(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all payments for an invoice"""
    # Check if invoice exists
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Get payments
    payments = db.query(Payment).filter(Payment.invoice_id == invoice_id).all()

    return [PaymentResponse(
        id=payment.id,
        invoice_id=payment.invoice_id,
        amount=payment.amount,
        payment_method=payment.payment_method,
        transaction_id=payment.transaction_id,
        payment_date=payment.payment_date,
        notes=payment.notes
    ) for payment in payments]
