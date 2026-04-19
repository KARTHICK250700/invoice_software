from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv(".env")
load_dotenv("../.env")

def get_database_url():
    # Render / Railway / any cloud — DATABASE_URL set directly
    if os.getenv("DATABASE_URL"):
        url = os.getenv("DATABASE_URL")
        # Fix: some platforms give postgres:// but SQLAlchemy needs postgresql://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        print("Connected to PostgreSQL (Cloud)")
        return url

    # Local fallback — PostgreSQL
    host     = os.getenv("PG_HOST",     os.getenv("MYSQL_HOST",     "localhost"))
    port     = os.getenv("PG_PORT",     os.getenv("MYSQL_PORT",     "5432"))
    user     = os.getenv("PG_USER",     os.getenv("MYSQL_USER",     "postgres"))
    password = os.getenv("PG_PASSWORD", os.getenv("MYSQL_PASSWORD", ""))
    database = os.getenv("PG_DATABASE", os.getenv("MYSQL_DATABASE", "car_service_center"))

    url = f"postgresql://{user}:{password}@{host}:{port}/{database}"
    print(f"Connected to Local PostgreSQL: {host}:{port}/{database}")
    return url

DATABASE_URL = get_database_url()

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_database_health():
    try:
        with engine.connect() as conn:
            row = conn.execute(text("SELECT version()")).fetchone()
        return {
            "status": "healthy",
            "database": "connected",
            "database_type": "PostgreSQL",
            "pg_version": row[0],
        }
    except Exception as e:
        return {"status": "error", "database": "disconnected", "error": str(e)}
