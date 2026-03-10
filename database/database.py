from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# SQLite database configuration
DATABASE_URL = "sqlite:///./database/car_service_center.db"

# Create database directory if it doesn't exist
os.makedirs("database", exist_ok=True)

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite specific
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get database session
def get_database_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()