from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.client import Client, ClientCreate, ClientUpdate, ClientWithVehicles
from backend.app.services.client_service import ClientService

router = APIRouter()

@router.post("/", response_model=Client)
def create_client(
    *,
    db: Session = Depends(get_db),
    client_in: ClientCreate
):
    """Create new client"""
    return ClientService.create_client(db=db, client_data=client_in)

@router.get("/", response_model=List[Client])
def get_clients(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: str = Query(None, description="Search clients by name, phone, or mobile")
):
    """Get all clients with optional search"""
    if search:
        return ClientService.search_clients(db=db, query=search)
    return ClientService.get_all_clients(db=db, skip=skip, limit=limit)

@router.get("/{client_id}", response_model=Client)
def get_client(
    *,
    db: Session = Depends(get_db),
    client_id: int
):
    """Get client by ID"""
    return ClientService.get_client(db=db, client_id=client_id)

@router.put("/{client_id}", response_model=Client)
def update_client(
    *,
    db: Session = Depends(get_db),
    client_id: int,
    client_in: ClientUpdate
):
    """Update client"""
    return ClientService.update_client(db=db, client_id=client_id, client_data=client_in)

@router.delete("/{client_id}")
def delete_client(
    *,
    db: Session = Depends(get_db),
    client_id: int
):
    """Delete client"""
    success = ClientService.delete_client(db=db, client_id=client_id)
    return {"message": "Client deleted successfully" if success else "Failed to delete client"}