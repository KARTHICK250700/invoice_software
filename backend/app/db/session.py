from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

from backend.app.core.config import settings

# Load environment variables
load_dotenv("backend/.env")
load_dotenv(".env")

def get_database_url():
    """Get Railway MySQL database URL"""
    mysql_url = os.getenv("MYSQL_URL") or os.getenv("DATABASE_URL")

    mysql_host = os.getenv("MYSQLHOST")
    mysql_port = os.getenv("MYSQLPORT")
    mysql_user = os.getenv("MYSQLUSER")
    mysql_password = os.getenv("MYSQLPASSWORD")
    mysql_database = os.getenv("MYSQL_DATABASE")

    if mysql_url and mysql_url.startswith("mysql"):
        print("Connected to Railway MySQL Database (Cloud)")
        return mysql_url
    elif mysql_host and mysql_user and mysql_password and mysql_database:
        mysql_url = f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_database}"
        print("Connected to Railway MySQL Database (Cloud)")
        return mysql_url
    else:
        raise ConnectionError(
            "Railway MySQL configuration not found!\n"
            "Please ensure MYSQL_URL or Railway MySQL credentials are set in environment variables."
        )

DATABASE_URL = get_database_url()

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False,
    connect_args={
        "charset": "utf8mb4",
        "collation": "utf8mb4_unicode_ci",
        "connect_timeout": 60,
        "read_timeout": 30,
        "write_timeout": 30
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
    """Check if Railway MySQL database connection is working"""
    try:
        db = SessionLocal()
        result = db.execute("SELECT VERSION() as version, @@hostname as hostname")
        row = result.fetchone()
        db.close()

        return {
            "status": "healthy",
            "database": "connected",
            "database_type": "Railway MySQL",
            "mysql_version": row[0],
            "server_hostname": row[1],
            "connection_type": "Cloud Database"
        }
    except Exception as e:
        return {
            "status": "error",
            "database": "disconnected",
            "error": str(e)
        }