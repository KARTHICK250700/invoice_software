from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime
import uuid

from backend.app.crud import invoice as invoice_crud, client as client_crud, vehicle as vehicle_crud
from backend.app.schemas.invoice import InvoiceCreate, InvoiceUpdate, Invoice
from backend.app.models.invoice import Invoice as InvoiceModel

class InvoiceService:
    @staticmethod
    def generate_invoice_number() -> str:
        """Generate unique invoice number"""
        now = datetime.now()
        return f"INV-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

    @staticmethod
    def calculate_totals(invoice_data: InvoiceCreate) -> dict:
        """Calculate invoice totals based on services and parts"""
        subtotal = 0.0

        # Calculate services total
        for service in invoice_data.services:
            subtotal += service.total_price

        # Calculate parts total
        for part in invoice_data.parts:
            subtotal += part.total_price

        # Calculate tax
        tax_amount = 0.0
        cgst_amount = 0.0
        sgst_amount = 0.0
        igst_amount = 0.0

        if invoice_data.gst_enabled:
            if invoice_data.tax_rate:
                tax_amount = subtotal * (invoice_data.tax_rate / 100)
                # For same state (CGST + SGST)
                cgst_amount = subtotal * (invoice_data.cgst_rate / 100)
                sgst_amount = subtotal * (invoice_data.sgst_rate / 100)

        # Calculate total
        total_before_discount = subtotal + tax_amount
        total_amount = total_before_discount - invoice_data.discount_amount

        return {
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "cgst_amount": cgst_amount,
            "sgst_amount": sgst_amount,
            "igst_amount": igst_amount,
            "total_amount": total_amount,
            "balance_due": total_amount - invoice_data.paid_amount
        }

    @staticmethod
    def create_invoice(db: Session, invoice_data: InvoiceCreate) -> Invoice:
        # Validate client exists
        client = client_crud.get(db, id=invoice_data.client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )

        # Validate vehicle exists
        vehicle = vehicle_crud.get(db, id=invoice_data.vehicle_id)
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found"
            )

        # Generate invoice number if not provided
        if not invoice_data.invoice_number:
            invoice_data.invoice_number = InvoiceService.generate_invoice_number()

        # Check if invoice number already exists
        existing_invoice = invoice_crud.get_by_invoice_number(
            db, invoice_number=invoice_data.invoice_number
        )
        if existing_invoice:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invoice with this number already exists"
            )

        # Calculate totals
        totals = InvoiceService.calculate_totals(invoice_data)
        for key, value in totals.items():
            setattr(invoice_data, key, value)

        # Create invoice with items
        db_invoice = invoice_crud.create_with_items(db, obj_in=invoice_data)
        return Invoice.model_validate(db_invoice)

    @staticmethod
    def get_invoice(db: Session, invoice_id: int) -> Invoice:
        db_invoice = invoice_crud.get_with_details(db, invoice_id=invoice_id)
        if not db_invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
        return Invoice.model_validate(db_invoice)

    @staticmethod
    def update_invoice(db: Session, invoice_id: int, invoice_data: InvoiceUpdate) -> Invoice:
        db_invoice = invoice_crud.get(db, id=invoice_id)
        if not db_invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )

        updated_invoice = invoice_crud.update(db, db_obj=db_invoice, obj_in=invoice_data)
        return Invoice.model_validate(updated_invoice)

    @staticmethod
    def update_payment(
        db: Session,
        invoice_id: int,
        paid_amount: float,
        payment_method: str,
        payment_date: datetime = None
    ) -> Invoice:
        db_invoice = invoice_crud.update_payment_status(
            db,
            invoice_id=invoice_id,
            paid_amount=paid_amount,
            payment_method=payment_method,
            payment_date=payment_date
        )
        if not db_invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )
        return Invoice.model_validate(db_invoice)

    @staticmethod
    def get_invoices_by_client(db: Session, client_id: int) -> List[Invoice]:
        db_invoices = invoice_crud.get_by_client(db, client_id=client_id)
        return [Invoice.model_validate(invoice) for invoice in db_invoices]

    @staticmethod
    def get_pending_payments(db: Session) -> List[Invoice]:
        db_invoices = invoice_crud.get_pending_payments(db)
        return [Invoice.model_validate(invoice) for invoice in db_invoices]

    @staticmethod
    def get_all_invoices(db: Session, skip: int = 0, limit: int = 100) -> List[Invoice]:
        db_invoices = invoice_crud.get_multi(db, skip=skip, limit=limit)
        return [Invoice.model_validate(invoice) for invoice in db_invoices]