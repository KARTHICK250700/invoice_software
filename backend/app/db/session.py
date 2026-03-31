from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

from app.core.config import settings

# Load environment variables
load_dotenv(".env")
load_dotenv("../.env")

def get_database_url():
    """Get Local MySQL database URL"""
    # Local MySQL configuration
    mysql_host = os.getenv("MYSQL_HOST", "localhost")
    mysql_port = os.getenv("MYSQL_PORT", "3306")
    mysql_user = os.getenv("MYSQL_USER", "root")
    mysql_password = os.getenv("MYSQL_PASSWORD", "")
    mysql_database = os.getenv("MYSQL_DATABASE", "car_service_center")

    mysql_url = f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_database}"
    print(f"Connected to Local MySQL Database: {mysql_host}:{mysql_port}/{mysql_database}")
    return mysql_url

DATABASE_URL = get_database_url()

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False,
    connect_args={
        "charset": "utf8mb4",
        "autocommit": False
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_database_health():
    """Check if Local MySQL database connection is working"""
    try:
        db = SessionLocal()
        result = db.execute("SELECT VERSION() as version")
        row = result.fetchone()
        db.close()

        return {
            "status": "healthy",
            "database": "connected",
            "database_type": "Local MySQL",
            "mysql_version": row[0],
            "connection_type": "Local Database"
        }
    except Exception as e:
        return {
            "status": "error",
            "database": "disconnected",
            "error": str(e)
        }