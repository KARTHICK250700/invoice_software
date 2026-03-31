from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.crud import client as client_crud
from backend.app.schemas.client import ClientCreate, ClientUpdate, Client
from backend.app.models.client import Client as ClientModel

class ClientService:
    @staticmethod
    def create_client(db: Session, client_data: ClientCreate) -> Client:
        # Check if mobile number already exists
        if client_data.mobile:
            existing_client = client_crud.get_by_mobile(db, mobile=client_data.mobile)
            if existing_client:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Client with this mobile number already exists"
                )

        # Create new client
        db_client = client_crud.create(db, obj_in=client_data)
        return Client.model_validate(db_client)

    @staticmethod
    def get_client(db: Session, client_id: int) -> Client:
        db_client = client_crud.get(db, id=client_id)
        if not db_client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        return Client.model_validate(db_client)

    @staticmethod
    def update_client(db: Session, client_id: int, client_data: ClientUpdate) -> Client:
        db_client = client_crud.get(db, id=client_id)
        if not db_client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )

        # Check if mobile number is being changed and already exists
        if client_data.mobile and client_data.mobile != db_client.mobile:
            existing_client = client_crud.get_by_mobile(db, mobile=client_data.mobile)
            if existing_client and existing_client.id != client_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Client with this mobile number already exists"
                )

        updated_client = client_crud.update(db, db_obj=db_client, obj_in=client_data)
        return Client.model_validate(updated_client)

    @staticmethod
    def delete_client(db: Session, client_id: int) -> bool:
        db_client = client_crud.get(db, id=client_id)
        if not db_client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )

        client_crud.remove(db, id=client_id)
        return True

    @staticmethod
    def search_clients(db: Session, query: str) -> List[Client]:
        db_clients = client_crud.search_clients(db, query=query)
        return [Client.model_validate(client) for client in db_clients]

    @staticmethod
    def get_all_clients(db: Session, skip: int = 0, limit: int = 100) -> List[Client]:
        db_clients = client_crud.get_multi(db, skip=skip, limit=limit)
        return [Client.model_validate(client) for client in db_clients]