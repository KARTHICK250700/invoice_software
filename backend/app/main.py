from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import uvicorn

from backend.app.core.config import settings
from backend.app.core.exceptions import (
    CustomException,
    custom_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler
)
from backend.app.api.v1.api import api_router
from backend.app.db.session import check_database_health
from backend.app.db.base import Base
from backend.app.db.session import engine

# Import all models to ensure they are registered
from backend.app.models import *

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Clean Architecture Backend API for Invoice Management System",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(CustomException, custom_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include API router
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Invoice Software Backend API - Clean Architecture",
        "status": "running",
        "version": settings.PROJECT_VERSION,
        "database": "connected",
        "architecture": "Clean Architecture with FastAPI"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    db_health = check_database_health()
    return {
        "status": "healthy" if db_health["status"] == "healthy" else "unhealthy",
        "database": db_health,
        "application": "Invoice Software API",
        "version": settings.PROJECT_VERSION
    }

@app.options("/{full_path:path}")
async def options_handler(request: Request, full_path: str):
    """Handle CORS preflight requests"""
    return {
        "message": "CORS preflight handled",
        "method": "OPTIONS",
        "path": full_path
    }

if __name__ == "__main__":
    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )