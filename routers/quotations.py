from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from typing import List, Optional, Union
from pydantic import BaseModel, validator
from datetime import datetime, date
import json

from database.database import SessionLocal
from models.models import Quotation, QuotationItem, Client, Vehicle
from auth.auth import get_current_user

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class QuotationItemCreate(BaseModel):
    item_type: Optional[str] = None  # service or part
    type: Optional[str] = None       # Alternative field name from frontend
    name: str
    hsn_sac: Optional[str] = None
    quantity: Optional[float] = None
    qty: Optional[float] = None      # Alternative field name from frontend
    rate: float
    discount: Optional[float] = 0.0  # Add discount field from frontend
    tax_rate: Optional[float] = 18.0 # Add tax_rate field from frontend
    total: float

class QuotationItemResponse(BaseModel):
    id: int
    item_type: str
    name: str
    hsn_sac: Optional[str]
    quantity: float
    rate: float
    discount: Optional[float] = 0.0
    tax_rate: Optional[float] = 18.0
    total: float

    class Config:
        from_attributes = True

class QuotationCreate(BaseModel):
    client_id: Union[int, str]  # Accept both int and string
    vehicle_id: Union[int, str]  # Accept both int and string
    quotation_date: Union[date, str]
    valid_until: Optional[Union[date, str]] = None
    notes: Optional[str] = None
    items: List[QuotationItemCreate]
    subtotal: Union[float, int]
    total_discount: Optional[Union[float, int]] = 0.0  # Add from frontend
    taxable_amount: Optional[Union[float, int]] = 0.0  # Add from frontend
    cgst_amount: Optional[Union[float, int]] = 0.0     # Add from frontend
    sgst_amount: Optional[Union[float, int]] = 0.0     # Add from frontend
    igst_amount: Optional[Union[float, int]] = 0.0     # Add from frontend
    total_tax: Optional[Union[float, int]] = 0.0       # Add from frontend
    round_off: Optional[Union[float, int]] = 0.0       # Add from frontend
    total_amount: Union[float, int]
    status: Optional[str] = "pending"  # Add status field to match frontend

    @validator('client_id', pre=True)
    def parse_client_id(cls, v):
        print(f"[DEBUG] Parsing client_id: {v} (type: {type(v)})")
        if isinstance(v, str):
            if v == '' or v == 'NaN':
                raise ValueError("Client ID cannot be empty")
            return int(v)
        if v is None:
            raise ValueError("Client ID is required")
        return int(v)

    @validator('vehicle_id', pre=True)
    def parse_vehicle_id(cls, v):
        print(f"[DEBUG] Parsing vehicle_id: {v} (type: {type(v)})")
        if isinstance(v, str):
            if v == '' or v == 'NaN':
                raise ValueError("Vehicle ID cannot be empty")
            return int(v)
        if v is None:
            raise ValueError("Vehicle ID is required")
        return int(v)

    @validator('quotation_date', pre=True)
    def parse_quotation_date(cls, v):
        if isinstance(v, str):
            return datetime.strptime(v, '%Y-%m-%d').date()
        return v

    @validator('valid_until', pre=True)
    def parse_valid_until(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            return datetime.strptime(v, '%Y-%m-%d').date()
        return v

class QuotationResponse(BaseModel):
    id: int
    quotation_number: str
    client_id: int
    vehicle_id: int
    quotation_date: datetime
    valid_until: Optional[datetime]
    subtotal: float
    total_amount: float
    status: str
    notes: Optional[str]
    client_name: Optional[str] = None
    vehicle_registration: Optional[str] = None
    items: List[QuotationItemResponse] = []

    class Config:
        from_attributes = True

def generate_quotation_number(db: Session) -> str:
    """Generate a unique quotation number"""
    last_quotation = db.query(Quotation).order_by(Quotation.id.desc()).first()
    if last_quotation:
        try:
            last_num = int(last_quotation.quotation_number.split('-')[-1])
            next_num = last_num + 1
        except (ValueError, IndexError):
            next_num = 1
    else:
        next_num = 1

    return f"QT-{next_num:04d}"

@router.get("/")
async def get_quotations(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all quotations with optional search and status filter"""
    print(f"[DEBUG] GET request for quotations list")
    query = db.query(Quotation)

    if search:
        query = query.join(Client).join(Vehicle).filter(
            (Client.name.contains(search)) |
            (Vehicle.registration_number.contains(search)) |
            (Quotation.quotation_number.contains(search))
        )

    if status:
        query = query.filter(Quotation.status == status)

    quotations = query.offset(skip).limit(limit).all()

    # Add related data
    result = []
    for quotation in quotations:
        quotation_dict = QuotationResponse.from_orm(quotation).__dict__
        if quotation.client:
            quotation_dict["client_name"] = quotation.client.name
        if quotation.vehicle:
            quotation_dict["vehicle_registration"] = quotation.vehicle.registration_number
        quotation_dict["items"] = [QuotationItemResponse.from_orm(item).__dict__ for item in quotation.items]
        result.append(quotation_dict)

    return result

@router.post("/debug", response_model=dict)
async def debug_quotation(request: Request):
    """Debug endpoint to see raw request data"""
    try:
        body = await request.body()
        import json
        data = json.loads(body)
        print(f"[DEBUG] Raw request data: {data}")
        return {"received_data": data}
    except Exception as e:
        print(f"[DEBUG] Error parsing request: {str(e)}")
        return {"error": str(e)}

@router.post("/", response_model=QuotationResponse)
async def create_quotation(
    quotation: QuotationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new quotation"""
    try:
        print(f"[DEBUG] Creating quotation for client_id: {quotation.client_id}, vehicle_id: {quotation.vehicle_id}")

        # Verify client exists
        client = db.query(Client).filter(Client.id == quotation.client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        # Verify vehicle exists
        vehicle = db.query(Vehicle).filter(Vehicle.id == quotation.vehicle_id).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")

        # Generate quotation number
        quotation_number = generate_quotation_number(db)

        # Create quotation
        db_quotation = Quotation(
            quotation_number=quotation_number,
            client_id=quotation.client_id,
            vehicle_id=quotation.vehicle_id,
            quotation_date=quotation.quotation_date,
            valid_until=quotation.valid_until,
            subtotal=quotation.subtotal,
            total_amount=quotation.total_amount,
            status=quotation.status,
            notes=quotation.notes,
            created_by=current_user.id
        )

        db.add(db_quotation)
        db.flush()  # Get the ID

        # Add quotation items
        for item in quotation.items:
            # Handle both 'type' and 'item_type' field names from frontend
            item_type = item.item_type or item.type or "service"

            # Handle both 'qty' and 'quantity' field names from frontend
            quantity = item.quantity or item.qty or 1.0

            db_item = QuotationItem(
                quotation_id=db_quotation.id,
                item_type=item_type,
                name=item.name,
                hsn_sac=item.hsn_sac,
                quantity=quantity,
                rate=item.rate,
                discount=item.discount or 0.0,
                tax_rate=item.tax_rate or 18.0,
                total=item.total
            )
            db.add(db_item)

        db.commit()
        db.refresh(db_quotation)

        print(f"[SUCCESS] Quotation {quotation_number} created successfully")

        # Return the created quotation with related data
        quotation_dict = QuotationResponse.from_orm(db_quotation).__dict__
        quotation_dict["client_name"] = client.name
        quotation_dict["vehicle_registration"] = vehicle.registration_number
        quotation_dict["items"] = [QuotationItemResponse.from_orm(item).__dict__ for item in db_quotation.items]

        return quotation_dict

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        print(f"[ERROR] Failed to create quotation: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{quotation_id}/debug")
async def debug_update_quotation(quotation_id: int, request: Request):
    """Debug endpoint to see raw request data for quotation update"""
    try:
        body = await request.body()
        import json
        data = json.loads(body)
        print(f"[DEBUG] Raw PUT data for quotation {quotation_id}: {data}")
        return {"received_data": data}
    except Exception as e:
        print(f"[DEBUG] Error parsing PUT request: {str(e)}")
        return {"error": str(e)}

@router.put("/{quotation_id}")
async def update_quotation(
    quotation_id: int,
    quotation: QuotationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update an existing quotation"""
    try:
        print(f"[DEBUG] PUT request for quotation ID: {quotation_id}")
        print(f"[DEBUG] Request data: {quotation.dict()}")

        db_quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not db_quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")

        # Update quotation fields
        db_quotation.client_id = quotation.client_id
        db_quotation.vehicle_id = quotation.vehicle_id
        db_quotation.quotation_date = quotation.quotation_date
        db_quotation.valid_until = quotation.valid_until
        db_quotation.subtotal = quotation.subtotal
        db_quotation.total_amount = quotation.total_amount
        db_quotation.notes = quotation.notes

        # Delete existing items
        db.query(QuotationItem).filter(QuotationItem.quotation_id == quotation_id).delete()

        # Add new items
        for item in quotation.items:
            # Handle both 'type' and 'item_type' field names from frontend
            item_type = item.item_type or item.type or "service"

            # Handle both 'qty' and 'quantity' field names from frontend
            quantity = item.quantity or item.qty or 1.0

            db_item = QuotationItem(
                quotation_id=quotation_id,
                item_type=item_type,
                name=item.name,
                hsn_sac=item.hsn_sac,
                quantity=quantity,
                rate=item.rate,
                total=item.total
            )
            db.add(db_item)

        db.commit()
        db.refresh(db_quotation)

        print(f"[SUCCESS] Quotation {quotation_id} updated successfully")

        # Return the updated quotation data using the same format as GET
        return await get_quotation(quotation_id, db, current_user)

    except HTTPException:
        db.rollback()
        raise
    except ValueError as e:
        print(f"[ERROR] Validation error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"[ERROR] Failed to update quotation: {str(e)}")
        print(f"[ERROR] Exception type: {type(e)}")
        import traceback
        print(f"[ERROR] Full traceback: {traceback.format_exc()}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{quotation_id}")
async def delete_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a quotation"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    # Delete quotation items first
    db.query(QuotationItem).filter(QuotationItem.quotation_id == quotation_id).delete()

    # Delete quotation
    db.delete(quotation)
    db.commit()

    return {"message": "Quotation deleted successfully"}

@router.post("/{quotation_id}/accept")
async def accept_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Accept a quotation"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    if quotation.status not in ["pending"]:
        raise HTTPException(status_code=400, detail="Only pending quotations can be accepted")

    quotation.status = "accepted"
    db.commit()

    return {"message": "Quotation accepted successfully", "status": "accepted"}

@router.post("/{quotation_id}/reject")
async def reject_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Reject a quotation"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    if quotation.status not in ["pending"]:
        raise HTTPException(status_code=400, detail="Only pending quotations can be rejected")

    quotation.status = "rejected"
    db.commit()

    return {"message": "Quotation rejected successfully", "status": "rejected"}

@router.post("/{quotation_id}/expire")
async def expire_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Mark quotation as expired"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    quotation.status = "expired"
    db.commit()

    return {"message": "Quotation marked as expired", "status": "expired"}

@router.post("/{quotation_id}/convert-to-invoice")
async def convert_quotation_to_invoice(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Convert a quotation to an invoice"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    if quotation.status != "accepted":
        raise HTTPException(status_code=400, detail="Only accepted quotations can be converted to invoices")

    # This would typically create an invoice from the quotation
    # For now, just update the quotation status
    quotation.status = "converted"
    db.commit()

    return {"message": "Quotation converted to invoice successfully"}

@router.get("/analytics/stats")
async def get_quotation_analytics(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get quotation analytics and conversion stats"""
    from sqlalchemy import func

    # Basic stats
    total_quotations = db.query(Quotation).count()
    pending_count = db.query(Quotation).filter(Quotation.status == 'pending').count()
    accepted_count = db.query(Quotation).filter(Quotation.status == 'accepted').count()
    rejected_count = db.query(Quotation).filter(Quotation.status == 'rejected').count()
    converted_count = db.query(Quotation).filter(Quotation.status == 'converted').count()
    expired_count = db.query(Quotation).filter(Quotation.status == 'expired').count()

    # Value stats
    total_value = db.query(func.sum(Quotation.total_amount)).scalar() or 0
    accepted_value = db.query(func.sum(Quotation.total_amount)).filter(Quotation.status == 'accepted').scalar() or 0
    converted_value = db.query(func.sum(Quotation.total_amount)).filter(Quotation.status == 'converted').scalar() or 0

    # Conversion rates
    conversion_rate = (converted_count / total_quotations * 100) if total_quotations > 0 else 0
    acceptance_rate = (accepted_count / total_quotations * 100) if total_quotations > 0 else 0

    # Check for expired quotations
    from datetime import datetime, date
    today = date.today()
    expired_quotations = db.query(Quotation).filter(
        Quotation.valid_until < today,
        Quotation.status == 'pending'
    ).all()

    # Auto-expire them
    for quotation in expired_quotations:
        quotation.status = 'expired'

    if expired_quotations:
        db.commit()

    return {
        "total_quotations": total_quotations,
        "status_breakdown": {
            "pending": pending_count,
            "accepted": accepted_count,
            "rejected": rejected_count,
            "converted": converted_count,
            "expired": expired_count + len(expired_quotations)
        },
        "value_stats": {
            "total_value": float(total_value),
            "accepted_value": float(accepted_value),
            "converted_value": float(converted_value)
        },
        "conversion_metrics": {
            "conversion_rate": round(conversion_rate, 2),
            "acceptance_rate": round(acceptance_rate, 2)
        },
        "auto_expired": len(expired_quotations)
    }

@router.get("/templates/service-packages")
async def get_service_packages():
    """Get predefined service packages for quick quotation creation"""
    packages = [
        {
            "id": "basic_service",
            "name": "Basic Service Package",
            "description": "Essential maintenance services",
            "estimated_time": "2-3 hours",
            "items": [
                {"name": "Engine Oil Change", "hsn_sac": "8302", "qty": 1, "rate": 800, "type": "service"},
                {"name": "Oil Filter Replacement", "hsn_sac": "8421", "qty": 1, "rate": 350, "type": "part"},
                {"name": "Air Filter Check", "hsn_sac": "8302", "qty": 1, "rate": 200, "type": "service"},
                {"name": "Battery Check & Clean", "hsn_sac": "8302", "qty": 1, "rate": 150, "type": "service"}
            ]
        },
        {
            "id": "comprehensive_service",
            "name": "Comprehensive Service Package",
            "description": "Complete vehicle inspection and maintenance",
            "estimated_time": "4-6 hours",
            "items": [
                {"name": "Engine Oil Change", "hsn_sac": "8302", "qty": 1, "rate": 800, "type": "service"},
                {"name": "Oil Filter Replacement", "hsn_sac": "8421", "qty": 1, "rate": 350, "type": "part"},
                {"name": "Air Filter Replacement", "hsn_sac": "8421", "qty": 1, "rate": 450, "type": "part"},
                {"name": "Brake Inspection", "hsn_sac": "8302", "qty": 1, "rate": 500, "type": "service"},
                {"name": "AC Service", "hsn_sac": "8302", "qty": 1, "rate": 1200, "type": "service"},
                {"name": "Wheel Alignment", "hsn_sac": "8302", "qty": 1, "rate": 600, "type": "service"},
                {"name": "Battery Check", "hsn_sac": "8302", "qty": 1, "rate": 200, "type": "service"}
            ]
        },
        {
            "id": "brake_service",
            "name": "Brake Service Package",
            "description": "Complete brake system service",
            "estimated_time": "2-3 hours",
            "items": [
                {"name": "Brake Pad Inspection", "hsn_sac": "8302", "qty": 1, "rate": 300, "type": "service"},
                {"name": "Brake Fluid Change", "hsn_sac": "8302", "qty": 1, "rate": 400, "type": "service"},
                {"name": "Brake Disc Check", "hsn_sac": "8302", "qty": 1, "rate": 250, "type": "service"},
                {"name": "Brake Pads (Front Set)", "hsn_sac": "8708", "qty": 1, "rate": 1500, "type": "part"}
            ]
        },
        {
            "id": "ac_service",
            "name": "AC Service Package",
            "description": "Air conditioning system service",
            "estimated_time": "1-2 hours",
            "items": [
                {"name": "AC Gas Refill", "hsn_sac": "8302", "qty": 1, "rate": 800, "type": "service"},
                {"name": "AC Filter Cleaning", "hsn_sac": "8302", "qty": 1, "rate": 200, "type": "service"},
                {"name": "AC Condenser Check", "hsn_sac": "8302", "qty": 1, "rate": 300, "type": "service"},
                {"name": "AC Cabin Filter", "hsn_sac": "8421", "qty": 1, "rate": 400, "type": "part"}
            ]
        },
        {
            "id": "engine_service",
            "name": "Engine Service Package",
            "description": "Complete engine maintenance",
            "estimated_time": "3-4 hours",
            "items": [
                {"name": "Engine Tune-up", "hsn_sac": "8302", "qty": 1, "rate": 1800, "type": "service"},
                {"name": "Spark Plugs (Set)", "hsn_sac": "8511", "qty": 1, "rate": 800, "type": "part"},
                {"name": "Engine Oil (5L)", "hsn_sac": "2710", "qty": 1, "rate": 2500, "type": "part"},
                {"name": "Oil Filter", "hsn_sac": "8421", "qty": 1, "rate": 350, "type": "part"},
                {"name": "Engine Diagnosis", "hsn_sac": "8302", "qty": 1, "rate": 500, "type": "service"}
            ]
        }
    ]

    # Calculate totals for each package
    for package in packages:
        total = sum(item["qty"] * item["rate"] for item in package["items"])
        package["estimated_total"] = total

    return {"packages": packages}

@router.post("/{quotation_id}/create-version")
async def create_quotation_version(
    quotation_id: int,
    quotation: QuotationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new version of an existing quotation"""
    try:
        # Get original quotation
        original_quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not original_quotation:
            raise HTTPException(status_code=404, detail="Original quotation not found")

        # Generate new quotation number with version suffix
        base_number = original_quotation.quotation_number.split('-v')[0]  # Remove existing version if any

        # Find highest version number for this quotation
        version_quotations = db.query(Quotation).filter(
            Quotation.quotation_number.like(f"{base_number}%")
        ).all()

        version_numbers = []
        for q in version_quotations:
            if '-v' in q.quotation_number:
                try:
                    version_num = int(q.quotation_number.split('-v')[-1])
                    version_numbers.append(version_num)
                except ValueError:
                    pass

        next_version = max(version_numbers, default=0) + 1
        new_quotation_number = f"{base_number}-v{next_version}"

        # Create new quotation version
        db_quotation = Quotation(
            quotation_number=new_quotation_number,
            client_id=quotation.client_id,
            vehicle_id=quotation.vehicle_id,
            quotation_date=quotation.quotation_date,
            valid_until=quotation.valid_until,
            subtotal=quotation.subtotal,
            total_amount=quotation.total_amount,
            status="pending",  # New versions always start as pending
            notes=quotation.notes,
            created_by=current_user.id
        )

        db.add(db_quotation)
        db.flush()  # Get the ID

        # Add quotation items
        for item in quotation.items:
            item_type = item.item_type or item.type or "service"
            quantity = item.quantity or item.qty or 1.0

            db_item = QuotationItem(
                quotation_id=db_quotation.id,
                item_type=item_type,
                name=item.name,
                hsn_sac=item.hsn_sac,
                quantity=quantity,
                rate=item.rate,
                discount=item.discount or 0.0,
                tax_rate=item.tax_rate or 18.0,
                total=item.total
            )
            db.add(db_item)

        db.commit()
        db.refresh(db_quotation)

        # Get client and vehicle for response
        client = db.query(Client).filter(Client.id == quotation.client_id).first()
        vehicle = db.query(Vehicle).filter(Vehicle.id == quotation.vehicle_id).first()

        # Return the created quotation version with related data
        quotation_dict = QuotationResponse.from_orm(db_quotation).__dict__
        quotation_dict["client_name"] = client.name if client else None
        quotation_dict["vehicle_registration"] = vehicle.registration_number if vehicle else None
        quotation_dict["items"] = [QuotationItemResponse.from_orm(item).__dict__ for item in db_quotation.items]

        return quotation_dict

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        print(f"[ERROR] Failed to create quotation version: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{quotation_id}/versions")
async def get_quotation_versions(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all versions of a quotation"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    # Get base quotation number (without version)
    base_number = quotation.quotation_number.split('-v')[0]

    # Find all quotations with the same base number
    versions = db.query(Quotation).filter(
        Quotation.quotation_number.like(f"{base_number}%")
    ).order_by(Quotation.quotation_number).all()

    # Format versions
    result = []
    for version in versions:
        version_dict = {
            "id": version.id,
            "quotation_number": version.quotation_number,
            "version": version.quotation_number.split('-v')[-1] if '-v' in version.quotation_number else "original",
            "status": version.status,
            "total_amount": version.total_amount,
            "quotation_date": version.quotation_date,
            "created_at": version.created_at if hasattr(version, 'created_at') else None
        }
        result.append(version_dict)

    return {"versions": result}

@router.get("/{quotation_id}/preview")
async def preview_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Preview quotation as HTML"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")

    # Generate HTML preview
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Quotation {quotation.quotation_number}</title>
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
            <h1>QUOTATION</h1>
            <h2>{quotation.quotation_number}</h2>
        </div>

        <div class="details">
            <p><strong>Client:</strong> {quotation.client.name if quotation.client else 'N/A'}</p>
            <p><strong>Vehicle:</strong> {quotation.vehicle.registration_number if quotation.vehicle else 'N/A'}</p>
            <p><strong>Date:</strong> {quotation.quotation_date.strftime('%d-%m-%Y') if quotation.quotation_date else 'N/A'}</p>
            <p><strong>Valid Until:</strong> {quotation.valid_until.strftime('%d-%m-%Y') if quotation.valid_until else 'N/A'}</p>
        </div>

        <table class="items">
            <tr>
                <th>Item</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Total</th>
            </tr>
    """

    for item in quotation.items:
        html_content += f"""
            <tr>
                <td>{item.name}</td>
                <td>{item.hsn_sac or '-'}</td>
                <td>{item.quantity}</td>
                <td>₹{item.rate:.2f}</td>
                <td>₹{item.total:.2f}</td>
            </tr>
        """

    html_content += f"""
        </table>

        <div class="total">
            <p><strong>Subtotal: ₹{quotation.subtotal:.2f}</strong></p>
            <p><strong>Total Amount: ₹{quotation.total_amount:.2f}</strong></p>
        </div>

        {f'<p><strong>Notes:</strong> {quotation.notes}</p>' if quotation.notes else ''}
    </body>
    </html>
    """

    return {"html": html_content}


@router.get("/{quotation_id}")
async def get_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific quotation by ID for editing"""
    print(f"[DEBUG] GET request for quotation ID: {quotation_id}")
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        print(f"[ERROR] Quotation {quotation_id} not found")
        raise HTTPException(status_code=404, detail="Quotation not found")

    print(f"[DEBUG] Found quotation: {quotation.quotation_number}")

    # Format response for frontend compatibility
    response_data = {
        "id": quotation.id,
        "quotation_number": quotation.quotation_number,
        "client_id": quotation.client_id,
        "vehicle_id": quotation.vehicle_id,
        "quotation_date": quotation.quotation_date.strftime('%Y-%m-%d') if quotation.quotation_date else None,
        "valid_until": quotation.valid_until.strftime('%Y-%m-%d') if quotation.valid_until else None,
        "subtotal": quotation.subtotal,
        "total_amount": quotation.total_amount,
        "status": quotation.status,
        "notes": quotation.notes,
        "client_name": quotation.client.name if quotation.client else None,
        "vehicle_registration": quotation.vehicle.registration_number if quotation.vehicle else None,
        "items": []
    }

    # Format items for frontend
    for item in quotation.items:
        response_data["items"].append({
            "id": item.id,
            "item_type": item.item_type,
            "type": item.item_type,  # Add both field names for frontend compatibility
            "name": item.name,
            "hsn_sac": item.hsn_sac,
            "quantity": item.quantity,
            "qty": item.quantity,  # Add both field names for frontend compatibility
            "rate": item.rate,
            "discount": getattr(item, 'discount', 0.0),  # Handle existing records without discount field
            "tax_rate": getattr(item, 'tax_rate', 18.0),  # Handle existing records without tax_rate field
            "total": item.total
        })

    print(f"[DEBUG] Returning quotation data: {response_data}")
    return response_data