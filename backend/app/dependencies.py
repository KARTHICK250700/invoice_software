from typing import Generator
from sqlalchemy.orm import Session

from backend.app.db.session import SessionLocal

def get_database() -> Generator:
    """
    Dependency function that yields database sessions
    """
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

# Alias for backward compatibility
get_db = get_database