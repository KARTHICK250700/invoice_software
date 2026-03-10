from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database.database import SessionLocal
from models.models import Client, Vehicle, User
from auth.auth import get_current_user, verify_password

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ClientCreate(BaseModel):
    name: str
    phone: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

class ClientResponse(BaseModel):
    id: int
    name: str
    phone: str
    mobile: Optional[str]
    email: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    pincode: Optional[str]
    total_vehicles: int = 0
    total_invoices: int = 0
    outstanding_amount: float = 0.0

    class Config:
        from_attributes = True

class ClientSearchResponse(BaseModel):
    id: int
    name: str
    phone: str
    mobile: Optional[str]

@router.get("/search/", response_model=List[ClientSearchResponse])
async def search_clients(
    q: str,  # Search query - required
    limit: int = 10,  # Limit for search results
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Search clients by name or mobile number for vehicle owner selection"""
    query = db.query(Client).filter(
        (Client.name.contains(q)) |
        (Client.mobile.contains(q)) |
        (Client.phone.contains(q))
    ).limit(limit)

    clients = query.all()

    # Create simple search response objects
    result = []
    for client in clients:
        result.append(ClientSearchResponse(
            id=client.id,
            name=client.name,
            phone=client.phone,
            mobile=client.mobile
        ))

    return result

@router.get("/", response_model=List[ClientResponse])
async def get_clients(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Client)

    if search:
        query = query.filter(
            (Client.name.contains(search)) |
            (Client.phone.contains(search)) |
            (Client.email.contains(search))
        )

    clients = query.offset(skip).limit(limit).all()

    # Add calculated fields
    result = []
    for client in clients:
        client_data = {
            "id": client.id,
            "name": client.name,
            "phone": client.phone,
            "mobile": client.mobile,
            "email": client.email,
            "address": client.address,
            "city": client.city,
            "state": client.state,
            "pincode": client.pincode,
            "total_vehicles": len(client.vehicles),
            "total_invoices": len(client.invoices),
            "outstanding_amount": sum(
                inv.total_amount - inv.paid_amount
                for inv in client.invoices
                if inv.payment_status != "paid"
            )
        }
        result.append(client_data)

    return result

@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    return ClientResponse(
        id=client.id,
        name=client.name,
        phone=client.phone,
        mobile=client.mobile,
        email=client.email,
        address=client.address,
        city=client.city,
        state=client.state,
        pincode=client.pincode,
        total_vehicles=len(client.vehicles),
        total_invoices=len(client.invoices),
        outstanding_amount=sum(
            inv.total_amount - inv.paid_amount
            for inv in client.invoices
            if inv.payment_status != "paid"
        )
    )

@router.post("/", response_model=ClientResponse)
async def create_client(
    client: ClientCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Get client data
    client_data = client.dict()

    # If mobile is not provided, use phone number as mobile
    if not client_data.get('mobile'):
        client_data['mobile'] = client_data['phone']

    # Check if mobile number already exists (mobile is our unique identifier)
    existing_client = db.query(Client).filter(Client.mobile == client_data['mobile']).first()
    if existing_client:
        raise HTTPException(status_code=400, detail="Mobile number already exists")

    db_client = Client(**client_data)
    db.add(db_client)
    db.commit()
    db.refresh(db_client)

    return ClientResponse(
        id=db_client.id,
        name=db_client.name,
        phone=db_client.phone,
        mobile=db_client.mobile,
        email=db_client.email,
        address=db_client.address,
        city=db_client.city,
        state=db_client.state,
        pincode=db_client.pincode,
        total_vehicles=0,
        total_invoices=0,
        outstanding_amount=0.0
    )

@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_update: ClientCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Update fields
    for field, value in client_update.dict().items():
        setattr(db_client, field, value)

    db.commit()
    db.refresh(db_client)

    return ClientResponse(
        id=db_client.id,
        name=db_client.name,
        phone=db_client.phone,
        mobile=db_client.mobile,
        email=db_client.email,
        address=db_client.address,
        city=db_client.city,
        state=db_client.state,
        pincode=db_client.pincode,
        total_vehicles=len(db_client.vehicles),
        total_invoices=len(db_client.invoices),
        outstanding_amount=sum(
            inv.total_amount - inv.paid_amount
            for inv in db_client.invoices
            if inv.payment_status != "paid"
        )
    )

class DeleteRequest(BaseModel):
    password: str

@router.delete("/{client_id}")
async def delete_client(
    client_id: int,
    delete_data: DeleteRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a client with password verification"""
    try:
        # Get password from request
        password = delete_data.password
        if not password:
            raise HTTPException(status_code=400, detail="Password is required for deletion")

        # Verify password
        if not verify_password(password, current_user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid password")

        # Check if client exists
        db_client = db.query(Client).filter(Client.id == client_id).first()
        if not db_client:
            raise HTTPException(status_code=404, detail="Client not found")

        client_name = db_client.name

        # Check if client has vehicles or invoices
        vehicle_count = len(db_client.vehicles)
        invoice_count = len(db_client.invoices)

        if vehicle_count > 0 or invoice_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete client. They have {vehicle_count} vehicle(s) and {invoice_count} invoice(s). Please delete those first."
            )

        db.delete(db_client)
        db.commit()

        return {"message": f"Client '{client_name}' deleted successfully"}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error deleting client {client_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete client: {str(e)}")