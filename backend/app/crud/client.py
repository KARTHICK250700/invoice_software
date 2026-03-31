from typing import List, Optional
from sqlalchemy.orm import Session

from backend.app.crud.base import CRUDBase
from backend.app.models.client import Client
from backend.app.schemas.client import ClientCreate, ClientUpdate

class CRUDClient(CRUDBase[Client, ClientCreate, ClientUpdate]):
    def get_by_mobile(self, db: Session, *, mobile: str) -> Optional[Client]:
        return db.query(Client).filter(Client.mobile == mobile).first()

    def get_by_phone(self, db: Session, *, phone: str) -> Optional[Client]:
        return db.query(Client).filter(Client.phone == phone).first()

    def search_by_name(self, db: Session, *, name: str) -> List[Client]:
        return db.query(Client).filter(Client.name.ilike(f"%{name}%")).all()

    def search_clients(self, db: Session, *, query: str) -> List[Client]:
        return db.query(Client).filter(
            (Client.name.ilike(f"%{query}%")) |
            (Client.phone.ilike(f"%{query}%")) |
            (Client.mobile.ilike(f"%{query}%"))
        ).all()

client = CRUDClient(Client)