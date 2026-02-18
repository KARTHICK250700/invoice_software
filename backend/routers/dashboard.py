from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from database.database import SessionLocal
from models.models import Invoice, Client, Vehicle, Service
from auth.auth import get_current_user

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Total clients
    total_clients = db.query(Client).count()

    # Total vehicles
    total_vehicles = db.query(Vehicle).count()

    # Total invoices
    total_invoices = db.query(Invoice).count()

    # Pending invoices
    pending_invoices = db.query(Invoice).filter(Invoice.payment_status == "pending").count()

    # Total revenue (this month)
    start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_revenue = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.invoice_date >= start_of_month,
        Invoice.payment_status == "paid"
    ).scalar() or 0

    # Total outstanding amount
    outstanding_amount = db.query(func.sum(Invoice.total_amount - Invoice.paid_amount)).filter(
        Invoice.payment_status != "paid"
    ).scalar() or 0

    # Recent invoices
    recent_invoices = db.query(Invoice).join(Client).order_by(
        Invoice.created_at.desc()
    ).limit(5).all()

    recent_invoices_data = []
    for invoice in recent_invoices:
        recent_invoices_data.append({
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "client_name": invoice.client.name,
            "total_amount": invoice.total_amount,
            "status": invoice.payment_status,
            "issue_date": invoice.invoice_date
        })

    return {
        "total_clients": total_clients,
        "total_vehicles": total_vehicles,
        "total_invoices": total_invoices,
        "pending_invoices": pending_invoices,
        "monthly_revenue": monthly_revenue,
        "outstanding_amount": outstanding_amount,
        "recent_invoices": recent_invoices_data
    }

@router.get("/revenue-chart")
async def get_revenue_chart(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Get revenue for last 12 months
    chart_data = []
    for i in range(12):
        month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=30*i)
        month_end = month_start + timedelta(days=30)

        revenue = db.query(func.sum(Invoice.total_amount)).filter(
            Invoice.invoice_date >= month_start,
            Invoice.invoice_date < month_end,
            Invoice.payment_status == "paid"
        ).scalar() or 0

        chart_data.append({
            "month": month_start.strftime("%b %Y"),
            "revenue": float(revenue)
        })

    chart_data.reverse()  # Show chronological order
    return chart_data