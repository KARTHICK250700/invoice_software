from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

from backend.app.crud.base import CRUDBase
from backend.app.models.invoice import Invoice, InvoiceService, InvoicePart
from backend.app.schemas.invoice import InvoiceCreate, InvoiceUpdate

class CRUDInvoice(CRUDBase[Invoice, InvoiceCreate, InvoiceUpdate]):
    def get_by_invoice_number(self, db: Session, *, invoice_number: str) -> Optional[Invoice]:
        return db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()

    def get_by_client(self, db: Session, *, client_id: int) -> List[Invoice]:
        return db.query(Invoice).filter(Invoice.client_id == client_id).all()

    def get_by_vehicle(self, db: Session, *, vehicle_id: int) -> List[Invoice]:
        return db.query(Invoice).filter(Invoice.vehicle_id == vehicle_id).all()

    def get_with_details(self, db: Session, *, invoice_id: int) -> Optional[Invoice]:
        return db.query(Invoice).options(
            joinedload(Invoice.client),
            joinedload(Invoice.vehicle),
            joinedload(Invoice.services),
            joinedload(Invoice.parts)
        ).filter(Invoice.id == invoice_id).first()

    def get_pending_payments(self, db: Session) -> List[Invoice]:
        return db.query(Invoice).filter(
            Invoice.payment_status.in_(["pending", "partially_paid"])
        ).all()

    def get_by_date_range(
        self,
        db: Session,
        *,
        start_date: datetime,
        end_date: datetime
    ) -> List[Invoice]:
        return db.query(Invoice).filter(
            Invoice.invoice_date >= start_date,
            Invoice.invoice_date <= end_date
        ).all()

    def create_with_items(self, db: Session, *, obj_in: InvoiceCreate) -> Invoice:
        # Create invoice
        invoice_data = obj_in.model_dump(exclude={"services", "parts"})
        db_invoice = Invoice(**invoice_data)
        db.add(db_invoice)
        db.commit()
        db.refresh(db_invoice)

        # Add services
        for service_data in obj_in.services:
            service_obj = InvoiceService(
                invoice_id=db_invoice.id,
                **service_data.model_dump()
            )
            db.add(service_obj)

        # Add parts
        for part_data in obj_in.parts:
            part_obj = InvoicePart(
                invoice_id=db_invoice.id,
                **part_data.model_dump()
            )
            db.add(part_obj)

        db.commit()
        db.refresh(db_invoice)
        return db_invoice

    def update_payment_status(
        self,
        db: Session,
        *,
        invoice_id: int,
        paid_amount: float,
        payment_method: str,
        payment_date: datetime = None
    ) -> Invoice:
        db_invoice = self.get(db, id=invoice_id)
        if db_invoice:
            db_invoice.paid_amount = paid_amount
            db_invoice.balance_due = db_invoice.total_amount - paid_amount
            db_invoice.payment_method = payment_method
            db_invoice.payment_date = payment_date or datetime.utcnow()

            if paid_amount >= db_invoice.total_amount:
                db_invoice.payment_status = "paid"
            elif paid_amount > 0:
                db_invoice.payment_status = "partially_paid"
            else:
                db_invoice.payment_status = "pending"

            db.commit()
            db.refresh(db_invoice)
        return db_invoice

invoice = CRUDInvoice(Invoice)