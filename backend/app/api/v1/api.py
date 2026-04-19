from fastapi import APIRouter

from backend.app.api.v1.endpoints import clients, vehicles, invoices, analytics

api_router = APIRouter()

api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(vehicles.router, prefix="/vehicles", tags=["vehicles"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])