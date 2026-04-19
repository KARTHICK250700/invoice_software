from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case
from datetime import datetime, date, timedelta
from typing import Optional
import calendar

from backend.app.db.session import get_db
from backend.app.models.invoice import Invoice

router = APIRouter()


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except Exception:
        return None


@router.get("/summary")
def get_analytics_summary(
    db: Session = Depends(get_db),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """
    Returns key financial summary stats for the given date range.
    Defaults to current month if no range given.
    """
    now = datetime.utcnow()

    # Default: current month
    start = parse_date(date_from) or datetime(now.year, now.month, 1)
    end = parse_date(date_to) or datetime(now.year, now.month, calendar.monthrange(now.year, now.month)[1], 23, 59, 59)

    # Previous period (same length)
    period_len = (end - start).days or 1
    prev_start = start - timedelta(days=period_len + 1)
    prev_end = start - timedelta(days=1)

    def period_stats(p_start, p_end):
        rows = (
            db.query(
                func.count(Invoice.id).label("count"),
                func.coalesce(func.sum(Invoice.total_amount), 0).label("total"),
                func.coalesce(func.sum(Invoice.paid_amount), 0).label("collected"),
                func.coalesce(func.sum(Invoice.tax_amount), 0).label("gst"),
                func.coalesce(func.sum(Invoice.discount_amount), 0).label("discount"),
                func.coalesce(func.sum(
                    case((Invoice.payment_status == "paid", Invoice.total_amount), else_=0)
                ), 0).label("paid_total"),
                func.coalesce(func.sum(
                    case((Invoice.payment_status == "pending", Invoice.total_amount), else_=0)
                ), 0).label("pending_total"),
                func.coalesce(func.sum(
                    case((Invoice.payment_status == "partial", Invoice.total_amount), else_=0)
                ), 0).label("partial_total"),
                func.count(
                    case((Invoice.payment_status == "paid", Invoice.id))
                ).label("paid_count"),
                func.count(
                    case((Invoice.payment_status == "pending", Invoice.id))
                ).label("pending_count"),
                func.count(
                    case((Invoice.payment_status == "partial", Invoice.id))
                ).label("partial_count"),
            )
            .filter(Invoice.invoice_date >= p_start, Invoice.invoice_date <= p_end)
            .first()
        )
        return rows

    curr = period_stats(start, end)
    prev = period_stats(prev_start, prev_end)

    def growth(curr_val, prev_val):
        if prev_val and prev_val > 0:
            return round(((curr_val - prev_val) / prev_val) * 100, 1)
        return 0.0

    # Subtotal (before tax) = total - gst
    curr_subtotal = float(curr.total) - float(curr.gst)
    prev_subtotal = float(prev.total) - float(prev.gst)

    return {
        "period": {"from": start.strftime("%Y-%m-%d"), "to": end.strftime("%Y-%m-%d")},
        "revenue": {
            "total": round(float(curr.total), 2),
            "subtotal": round(curr_subtotal, 2),
            "growth": growth(float(curr.total), float(prev.total)),
        },
        "collected": {
            "total": round(float(curr.collected), 2),
            "growth": growth(float(curr.collected), float(prev.collected)),
        },
        "gst": {
            "total": round(float(curr.gst), 2),
            "growth": growth(float(curr.gst), float(prev.gst)),
        },
        "discount": {
            "total": round(float(curr.discount), 2),
        },
        "invoices": {
            "total": int(curr.count),
            "paid": {"count": int(curr.paid_count), "amount": round(float(curr.paid_total), 2)},
            "pending": {"count": int(curr.pending_count), "amount": round(float(curr.pending_total), 2)},
            "partial": {"count": int(curr.partial_count), "amount": round(float(curr.partial_total), 2)},
        },
        "balance_due": round(float(curr.total) - float(curr.collected), 2),
        "collection_rate": round((float(curr.collected) / float(curr.total) * 100) if float(curr.total) > 0 else 0, 1),
    }


@router.get("/trend")
def get_trend(
    db: Session = Depends(get_db),
    group_by: str = Query("month", description="day | month | year"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """
    Returns revenue/collected/GST trend grouped by day, month, or year.
    """
    now = datetime.utcnow()

    if group_by == "day":
        default_start = datetime(now.year, now.month, 1)
        default_end = now
    elif group_by == "year":
        default_start = datetime(now.year - 4, 1, 1)
        default_end = now
    else:  # month
        default_start = datetime(now.year, 1, 1)
        default_end = now

    start = parse_date(date_from) or default_start
    end = parse_date(date_to) or default_end

    if group_by == "day":
        rows = (
            db.query(
                func.date(Invoice.invoice_date).label("period"),
                func.coalesce(func.sum(Invoice.total_amount), 0).label("revenue"),
                func.coalesce(func.sum(Invoice.paid_amount), 0).label("collected"),
                func.coalesce(func.sum(Invoice.tax_amount), 0).label("gst"),
                func.count(Invoice.id).label("count"),
            )
            .filter(Invoice.invoice_date >= start, Invoice.invoice_date <= end)
            .group_by(func.date(Invoice.invoice_date))
            .order_by(func.date(Invoice.invoice_date))
            .all()
        )
        result = [
            {
                "label": str(r.period),
                "revenue": round(float(r.revenue), 2),
                "collected": round(float(r.collected), 2),
                "gst": round(float(r.gst), 2),
                "profit": round(float(r.revenue) - float(r.gst), 2),
                "count": int(r.count),
            }
            for r in rows
        ]

    elif group_by == "year":
        rows = (
            db.query(
                extract("year", Invoice.invoice_date).label("yr"),
                func.coalesce(func.sum(Invoice.total_amount), 0).label("revenue"),
                func.coalesce(func.sum(Invoice.paid_amount), 0).label("collected"),
                func.coalesce(func.sum(Invoice.tax_amount), 0).label("gst"),
                func.count(Invoice.id).label("count"),
            )
            .filter(Invoice.invoice_date >= start, Invoice.invoice_date <= end)
            .group_by(extract("year", Invoice.invoice_date))
            .order_by(extract("year", Invoice.invoice_date))
            .all()
        )
        result = [
            {
                "label": str(int(r.yr)),
                "revenue": round(float(r.revenue), 2),
                "collected": round(float(r.collected), 2),
                "gst": round(float(r.gst), 2),
                "profit": round(float(r.revenue) - float(r.gst), 2),
                "count": int(r.count),
            }
            for r in rows
        ]

    else:  # month
        MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        rows = (
            db.query(
                extract("year", Invoice.invoice_date).label("yr"),
                extract("month", Invoice.invoice_date).label("mo"),
                func.coalesce(func.sum(Invoice.total_amount), 0).label("revenue"),
                func.coalesce(func.sum(Invoice.paid_amount), 0).label("collected"),
                func.coalesce(func.sum(Invoice.tax_amount), 0).label("gst"),
                func.count(Invoice.id).label("count"),
            )
            .filter(Invoice.invoice_date >= start, Invoice.invoice_date <= end)
            .group_by(extract("year", Invoice.invoice_date), extract("month", Invoice.invoice_date))
            .order_by(extract("year", Invoice.invoice_date), extract("month", Invoice.invoice_date))
            .all()
        )
        result = [
            {
                "label": f"{MONTH_NAMES[int(r.mo) - 1]} {int(r.yr)}",
                "revenue": round(float(r.revenue), 2),
                "collected": round(float(r.collected), 2),
                "gst": round(float(r.gst), 2),
                "profit": round(float(r.revenue) - float(r.gst), 2),
                "count": int(r.count),
            }
            for r in rows
        ]

    return {"group_by": group_by, "data": result}


@router.get("/invoices-table")
def get_invoices_table(
    db: Session = Depends(get_db),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    group_by: str = Query("month", description="month | year"),
):
    """
    Returns per-period invoice breakdown table: total invoices, revenue, collected, pending, GST.
    """
    now = datetime.utcnow()

    if group_by == "year":
        default_start = datetime(now.year - 4, 1, 1)
    else:
        default_start = datetime(now.year, 1, 1)

    start = parse_date(date_from) or default_start
    end = parse_date(date_to) or now

    MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    if group_by == "year":
        rows = (
            db.query(
                extract("year", Invoice.invoice_date).label("yr"),
                func.count(Invoice.id).label("count"),
                func.coalesce(func.sum(Invoice.total_amount), 0).label("revenue"),
                func.coalesce(func.sum(Invoice.paid_amount), 0).label("collected"),
                func.coalesce(func.sum(Invoice.tax_amount), 0).label("gst"),
                func.coalesce(func.sum(Invoice.discount_amount), 0).label("discount"),
                func.count(case((Invoice.payment_status == "paid", Invoice.id))).label("paid_count"),
                func.count(case((Invoice.payment_status == "pending", Invoice.id))).label("pending_count"),
                func.count(case((Invoice.payment_status == "partial", Invoice.id))).label("partial_count"),
            )
            .filter(Invoice.invoice_date >= start, Invoice.invoice_date <= end)
            .group_by(extract("year", Invoice.invoice_date))
            .order_by(extract("year", Invoice.invoice_date))
            .all()
        )
        table = [
            {
                "label": str(int(r.yr)),
                "count": int(r.count),
                "revenue": round(float(r.revenue), 2),
                "collected": round(float(r.collected), 2),
                "pending": round(float(r.revenue) - float(r.collected), 2),
                "gst": round(float(r.gst), 2),
                "discount": round(float(r.discount), 2),
                "paid_count": int(r.paid_count),
                "pending_count": int(r.pending_count),
                "partial_count": int(r.partial_count),
            }
            for r in rows
        ]
    else:
        rows = (
            db.query(
                extract("year", Invoice.invoice_date).label("yr"),
                extract("month", Invoice.invoice_date).label("mo"),
                func.count(Invoice.id).label("count"),
                func.coalesce(func.sum(Invoice.total_amount), 0).label("revenue"),
                func.coalesce(func.sum(Invoice.paid_amount), 0).label("collected"),
                func.coalesce(func.sum(Invoice.tax_amount), 0).label("gst"),
                func.coalesce(func.sum(Invoice.discount_amount), 0).label("discount"),
                func.count(case((Invoice.payment_status == "paid", Invoice.id))).label("paid_count"),
                func.count(case((Invoice.payment_status == "pending", Invoice.id))).label("pending_count"),
                func.count(case((Invoice.payment_status == "partial", Invoice.id))).label("partial_count"),
            )
            .filter(Invoice.invoice_date >= start, Invoice.invoice_date <= end)
            .group_by(extract("year", Invoice.invoice_date), extract("month", Invoice.invoice_date))
            .order_by(extract("year", Invoice.invoice_date), extract("month", Invoice.invoice_date))
            .all()
        )
        table = [
            {
                "label": f"{MONTH_NAMES[int(r.mo) - 1]} {int(r.yr)}",
                "count": int(r.count),
                "revenue": round(float(r.revenue), 2),
                "collected": round(float(r.collected), 2),
                "pending": round(float(r.revenue) - float(r.collected), 2),
                "gst": round(float(r.gst), 2),
                "discount": round(float(r.discount), 2),
                "paid_count": int(r.paid_count),
                "pending_count": int(r.pending_count),
                "partial_count": int(r.partial_count),
            }
            for r in rows
        ]

    # Totals row
    if table:
        totals = {
            "label": "TOTAL",
            "count": sum(r["count"] for r in table),
            "revenue": round(sum(r["revenue"] for r in table), 2),
            "collected": round(sum(r["collected"] for r in table), 2),
            "pending": round(sum(r["pending"] for r in table), 2),
            "gst": round(sum(r["gst"] for r in table), 2),
            "discount": round(sum(r["discount"] for r in table), 2),
            "paid_count": sum(r["paid_count"] for r in table),
            "pending_count": sum(r["pending_count"] for r in table),
            "partial_count": sum(r["partial_count"] for r in table),
        }
    else:
        totals = None

    return {"group_by": group_by, "rows": table, "totals": totals}
