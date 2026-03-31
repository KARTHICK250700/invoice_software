from backend.app.db.session import engine
from backend.app.db.base import Base

# Import all models to ensure they are registered with SQLAlchemy
from backend.app.models import *

def init_db() -> None:
    """Initialize database by creating all tables"""
    Base.metadata.create_all(bind=engine)

def recreate_db() -> None:
    """Recreate database by dropping and creating all tables"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("Database initialized successfully!")