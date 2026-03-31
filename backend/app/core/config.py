import os
from typing import Optional

class Settings:
    PROJECT_NAME: str = "Invoice Software API"
    PROJECT_VERSION: str = "2.0.0"

    # Database
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    BACKEND_CORS_ORIGINS: list = ["*"]

settings = Settings()