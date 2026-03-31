from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.db.session import get_db
from backend.app.schemas.invoice import Invoice, InvoiceCreate, InvoiceUpdate, InvoiceWithDetails
from backend.app.services.invoice_service import InvoiceService

router = APIRouter()

@router.post("/", response_model=Invoice)
def create_invoice(
    *,
    db: Session = Depends(get_db),
    invoice_in: InvoiceCreate
):
    """Create new invoice"""
    return InvoiceService.create_invoice(db=db, invoice_data=invoice_in)

@router.get("/", response_model=List[Invoice])
def get_invoices(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    client_id: int = Query(None, description="Filter by client ID"),
    pending_only: bool = Query(False, description="Get only pending payments")
):
    """Get all invoices with optional filtering"""
    if pending_only:
        return InvoiceService.get_pending_payments(db=db)
    elif client_id:
        return InvoiceService.get_invoices_by_client(db=db, client_id=client_id)
    return InvoiceService.get_all_invoices(db=db, skip=skip, limit=limit)

@router.get("/{invoice_id}", response_model=Invoice)
def get_invoice(
    *,
    db: Session = Depends(get_db),
    invoice_id: int
):
    """Get invoice by ID"""
    return InvoiceService.get_invoice(db=db, invoice_id=invoice_id)

@router.put("/{invoice_id}", response_model=Invoice)
def update_invoice(
    *,
    db: Session = Depends(get_db),
    invoice_id: int,
    invoice_in: InvoiceUpdate
):
    """Update invoice"""
    return InvoiceService.update_invoice(db=db, invoice_id=invoice_id, invoice_data=invoice_in)

@router.patch("/{invoice_id}/payment", response_model=Invoice)
def update_payment(
    *,
    db: Session = Depends(get_db),
    invoice_id: int,
    paid_amount: float,
    payment_method: str,
    payment_date: datetime = None
):
    """Update invoice payment status"""
    return InvoiceService.update_payment(
        db=db,
        invoice_id=invoice_id,
        paid_amount=paid_amount,
        payment_method=payment_method,
        payment_date=payment_date
    )