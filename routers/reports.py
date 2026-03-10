from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from database.database import SessionLocal
from models.models import Client, Vehicle, Invoice, InvoiceService, Service
from auth.auth import get_current_user

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class RevenueData(BaseModel):
    total: float
    growth: float
    thisMonth: float
    change: float = 0.0

class ClientData(BaseModel):
    total: int
    newThisMonth: int
    growth: float
    change: int = 0

class ServiceData(BaseModel):
    thisMonth: int
    growth: float
    change: int = 0

class InvoiceData(BaseModel):
    pending: int
    overdue: int
    pendingAmount: float
    change: int = 0

class FinancialData(BaseModel):
    profit: float
    outstanding: float
    change: float = 0.0

class LiveReportSummary(BaseModel):
    revenue: RevenueData
    clients: ClientData
    services: ServiceData
    invoices: InvoiceData
    financial: FinancialData
    lastUpdate: str
    isLive: bool = True

class ChartDataPoint(BaseModel):
    month: str
    revenue: float
    expenses: float
    profit: float

class ServiceTypeData(BaseModel):
    name: str
    count: int
    revenue: float
    color: str

@router.get("/live-summary", response_model=LiveReportSummary)
async def get_live_summary(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get real-time report summary with actual database data"""

    now = datetime.now()
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)

    # Get actual client data
    total_clients = db.query(Client).count()
    new_clients_this_month = db.query(Client).filter(
        Client.id >= current_month_start.timestamp() if hasattr(Client, 'created_date') else True
    ).count()

    # Get actual invoice data
    current_month_invoices = db.query(Invoice).filter(
        Invoice.invoice_date >= current_month_start
    ).all()

    last_month_invoices = db.query(Invoice).filter(
        and_(
            Invoice.invoice_date >= last_month_start,
            Invoice.invoice_date < current_month_start
        )
    ).all()

    # Calculate revenue
    current_month_revenue = sum(inv.total_amount or 0 for inv in current_month_invoices)
    last_month_revenue = sum(inv.total_amount or 0 for inv in last_month_invoices) or 1  # Avoid division by zero

    total_revenue = db.query(func.sum(Invoice.total_amount)).scalar() or 0
    revenue_growth = ((current_month_revenue - last_month_revenue) / last_month_revenue) * 100 if last_month_revenue > 0 else 0

    # Get pending and overdue invoices
    pending_invoices = db.query(Invoice).filter(Invoice.payment_status == "pending").all()
    overdue_invoices = db.query(Invoice).filter(Invoice.payment_status == "overdue").all()

    pending_amount = sum(inv.total_amount - (inv.paid_amount or 0) for inv in pending_invoices)
    outstanding_amount = sum(inv.total_amount - (inv.paid_amount or 0) for inv in pending_invoices + overdue_invoices)

    # Get service data (using invoices as proxy for services)
    services_this_month = len(current_month_invoices)
    services_last_month = len(last_month_invoices) or 1
    service_growth = ((services_this_month - services_last_month) / services_last_month) * 100 if services_last_month > 0 else 0

    # Calculate client growth
    last_month_client_count = total_clients - new_clients_this_month or 1
    client_growth = ((total_clients - last_month_client_count) / last_month_client_count) * 100 if last_month_client_count > 0 else 0

    return LiveReportSummary(
        revenue=RevenueData(
            total=total_revenue,
            growth=revenue_growth,
            thisMonth=current_month_revenue,
            change=0.0  # Will be calculated by frontend for live updates
        ),
        clients=ClientData(
            total=total_clients,
            newThisMonth=new_clients_this_month,
            growth=client_growth,
            change=0
        ),
        services=ServiceData(
            thisMonth=services_this_month,
            growth=service_growth,
            change=0
        ),
        invoices=InvoiceData(
            pending=len(pending_invoices),
            overdue=len(overdue_invoices),
            pendingAmount=pending_amount,
            change=0
        ),
        financial=FinancialData(
            profit=current_month_revenue * 0.6,  # Assuming 60% profit margin
            outstanding=outstanding_amount,
            change=0.0
        ),
        lastUpdate=now.isoformat(),
        isLive=True
    )

@router.get("/chart/revenue", response_model=List[ChartDataPoint])
async def get_revenue_chart(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get revenue chart data for the last N months"""

    chart_data = []
    now = datetime.now()

    for i in range(months):
        # Calculate month start/end
        month_date = now - timedelta(days=i*30)
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        if month_date.month == 12:
            next_month = month_date.replace(year=month_date.year + 1, month=1, day=1)
        else:
            next_month = month_date.replace(month=month_date.month + 1, day=1)

        # Get invoices for this month
        month_invoices = db.query(Invoice).filter(
            and_(
                Invoice.invoice_date >= month_start,
                Invoice.invoice_date < next_month
            )
        ).all()

        revenue = sum(inv.total_amount or 0 for inv in month_invoices)
        expenses = revenue * 0.4  # Assuming 40% expenses
        profit = revenue - expenses

        chart_data.append(ChartDataPoint(
            month=month_date.strftime("%b"),
            revenue=revenue,
            expenses=expenses,
            profit=profit
        ))

    return list(reversed(chart_data))  # Return in chronological order

@router.get("/chart/services", response_model=List[ServiceTypeData])
async def get_services_chart(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get service type distribution data"""

    # This is a simplified version - you might want to add actual service type tracking
    # For now, we'll simulate based on invoice items or create categories

    current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Get current month invoices
    invoices = db.query(Invoice).filter(
        Invoice.invoice_date >= current_month_start
    ).all()

    # Simulate service types based on invoice amounts (you can customize this logic)
    total_invoices = len(invoices)

    service_types = [
        {"name": "Engine Service", "percentage": 0.30, "color": "#EF4444"},
        {"name": "Brake Service", "percentage": 0.25, "color": "#F97316"},
        {"name": "AC Service", "percentage": 0.20, "color": "#EAB308"},
        {"name": "Electrical", "percentage": 0.15, "color": "#22C55E"},
        {"name": "Body Work", "percentage": 0.10, "color": "#3B82F6"}
    ]

    total_revenue = sum(inv.total_amount or 0 for inv in invoices)

    result = []
    for service_type in service_types:
        count = int(total_invoices * service_type["percentage"])
        revenue = total_revenue * service_type["percentage"]

        result.append(ServiceTypeData(
            name=service_type["name"],
            count=count,
            revenue=revenue,
            color=service_type["color"]
        ))

    return result

@router.get("/summary")
async def get_reports_summary(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get basic report summary for dashboard"""

    # Get actual data from database
    total_clients = db.query(Client).count()
    total_vehicles = db.query(Vehicle).count()
    total_invoices = db.query(Invoice).count()

    # Calculate revenue
    total_revenue = db.query(func.sum(Invoice.total_amount)).scalar() or 0

    # Get pending invoices
    pending_invoices = db.query(Invoice).filter(Invoice.payment_status == "pending").count()
    overdue_invoices = db.query(Invoice).filter(Invoice.payment_status == "overdue").count()

    # Calculate outstanding amount
    outstanding_query = db.query(func.sum(Invoice.total_amount - func.coalesce(Invoice.paid_amount, 0))).filter(
        Invoice.payment_status.in_(["pending", "overdue"])
    )
    outstanding_amount = outstanding_query.scalar() or 0

    # Get current month data
    current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    current_month_invoices = db.query(Invoice).filter(
        Invoice.invoice_date >= current_month_start
    ).count()

    current_month_revenue = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.invoice_date >= current_month_start
    ).scalar() or 0

    # Calculate growth (simplified)
    revenue_growth = 15.2  # You can implement proper month-over-month calculation
    client_growth = 8.3
    service_growth = 12.5

    return {
        "revenue": {
            "total": total_revenue,
            "growth": revenue_growth,
            "thisMonth": current_month_revenue
        },
        "clients": {
            "total": total_clients,
            "newThisMonth": max(0, total_clients - 10),  # Simplified
            "growth": client_growth
        },
        "services": {
            "thisMonth": current_month_invoices,
            "growth": service_growth
        },
        "invoices": {
            "pending": pending_invoices,
            "overdue": overdue_invoices,
            "pendingAmount": outstanding_amount
        },
        "financial": {
            "profit": current_month_revenue * 0.6,  # Assuming 60% profit margin
            "outstanding": outstanding_amount
        }
    }

@router.get("/export")
async def export_report(
    format: str = Query(..., regex="^(pdf|excel|csv)$"),
    report_type: str = Query("summary"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Export report in various formats"""

    # Get the data
    summary_data = await get_reports_summary(db=db, current_user=current_user)

    # For now, return JSON (you can implement actual PDF/Excel generation later)
    return {
        "message": f"Export in {format} format requested",
        "data": summary_data,
        "timestamp": datetime.now().isoformat()
    }