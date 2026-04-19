from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List, Optional
import uvicorn
import os
import logging
import logging.handlers
import time
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

# ── Logging setup — console + rotating file ───────────────────────────────
_LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(_LOG_DIR, exist_ok=True)

_fmt = logging.Formatter("%(asctime)s %(levelname)-8s %(name)s: %(message)s")

# Console handler
_console_h = logging.StreamHandler()
_console_h.setFormatter(_fmt)

# All logs → logs/app.log (rotate every 5 MB, keep 7 files)
_app_h = logging.handlers.RotatingFileHandler(
    os.path.join(_LOG_DIR, "app.log"), maxBytes=5*1024*1024, backupCount=7, encoding="utf-8"
)
_app_h.setFormatter(_fmt)

# Errors only → logs/errors.log (rotate every 2 MB, keep 10 files)
_err_h = logging.handlers.RotatingFileHandler(
    os.path.join(_LOG_DIR, "errors.log"), maxBytes=2*1024*1024, backupCount=10, encoding="utf-8"
)
_err_h.setLevel(logging.ERROR)
_err_h.setFormatter(_fmt)

logging.basicConfig(level=logging.INFO, handlers=[_console_h, _app_h, _err_h])
_log = logging.getLogger("invoice_api")

load_dotenv()

# Import database and models (MySQL database support added)
from app.db.session import SessionLocal, engine, check_database_health
from app.db.base import Base
from models.models import Client, Vehicle, Service, Part, VehicleBrand, VehicleModel, Invoice, InvoiceService, InvoicePart, Quotation, QuotationItem

# ── JWT / Auth config ──────────────────────────────────────────────────
SECRET_KEY   = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM    = "HS256"
TOKEN_EXPIRE = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))  # 24 h

ADMIN_USERNAME = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def _hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

# Store hashed password in memory (single-user setup)
_HASHED_ADMIN_PW = _hash_password(ADMIN_PASSWORD)

def _create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def _get_current_user(token: str = Depends(oauth2_scheme)):
    """Dependency — raises 401 if token is missing or invalid."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username

# Create database tables
Base.metadata.create_all(bind=engine)

# ── Startup column migrations (safe to run every time) ────────────────────
# create_all() only creates NEW tables — it never adds columns to existing ones.
# These ALTER TABLE statements add any columns that were added to models after
# the tables were first created. IF NOT EXISTS makes them safe to repeat.
def _run_migrations():
    # PostgreSQL syntax: TIMESTAMP instead of DATETIME, BOOLEAN instead of TINYINT(1)
    _MIGRATIONS = [
        # ── invoices (core) ───────────────────────────────────────────────
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMP",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_type VARCHAR(50)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_rate FLOAT DEFAULT 18.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_amount FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMP",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by INTEGER",
        # ── invoices (extended) ───────────────────────────────────────────
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_enabled BOOLEAN DEFAULT TRUE",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst_rate FLOAT DEFAULT 9.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst_rate FLOAT DEFAULT 9.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_rate FLOAT DEFAULT 18.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst_amount FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst_amount FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_amount FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS round_off FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_due FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS km_reading_in INTEGER",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS km_reading_out INTEGER",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(20) DEFAULT '8302'",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(100) DEFAULT 'Tamil Nadu (33)'",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS challan_no VARCHAR(20)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS challan_date TIMESTAMP",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS eway_bill_no VARCHAR(50)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transport VARCHAR(100)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transport_id VARCHAR(50)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS technician_name VARCHAR(100)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS work_order_no VARCHAR(50)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS estimate_no VARCHAR(50)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS insurance_claim BOOLEAN DEFAULT FALSE",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS warranty_applicable BOOLEAN DEFAULT FALSE",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS unique_access_code VARCHAR(50)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS qr_code_url VARCHAR(200)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_unique_id VARCHAR(50)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Cash'",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_notes TEXT",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'Full'",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS advance_amount FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS advance_date TIMESTAMP",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_due_days INTEGER DEFAULT 30",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS late_fee_applicable BOOLEAN DEFAULT FALSE",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS late_fee_amount FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS early_payment_discount FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS preferred_payment_method VARCHAR(50)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS credit_limit FLOAT DEFAULT 0.0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS credit_days INTEGER DEFAULT 0",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS mobile_invoice_sent BOOLEAN DEFAULT FALSE",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS email_invoice_sent BOOLEAN DEFAULT FALSE",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN DEFAULT FALSE",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_mobile_alt VARCHAR(15)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_email_alt VARCHAR(100)",
        # ── invoice_services ──────────────────────────────────────────────
        "ALTER TABLE invoice_services ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(20) DEFAULT '9986'",
        "ALTER TABLE invoice_services ADD COLUMN IF NOT EXISTS quantity FLOAT DEFAULT 1.0",
        "ALTER TABLE invoice_services ADD COLUMN IF NOT EXISTS unit_price FLOAT DEFAULT 0.0",
        "ALTER TABLE invoice_services ADD COLUMN IF NOT EXISTS discount FLOAT DEFAULT 0.0",
        "ALTER TABLE invoice_services ADD COLUMN IF NOT EXISTS tax_rate FLOAT DEFAULT 0.0",
        "ALTER TABLE invoice_services ADD COLUMN IF NOT EXISTS total_price FLOAT DEFAULT 0.0",
        # ── invoice_parts ─────────────────────────────────────────────────
        "ALTER TABLE invoice_parts ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(20) DEFAULT '8708'",
        "ALTER TABLE invoice_parts ADD COLUMN IF NOT EXISTS discount FLOAT DEFAULT 0.0",
        "ALTER TABLE invoice_parts ADD COLUMN IF NOT EXISTS tax_rate FLOAT DEFAULT 0.0",
        "ALTER TABLE invoice_parts ADD COLUMN IF NOT EXISTS unit_price FLOAT DEFAULT 0.0",
        "ALTER TABLE invoice_parts ADD COLUMN IF NOT EXISTS total_price FLOAT DEFAULT 0.0",
        # ── quotation_items ───────────────────────────────────────────────
        "ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS discount FLOAT DEFAULT 0.0",
        "ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_rate FLOAT DEFAULT 0.0",
        "ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS hsn_sac VARCHAR(20)",
        # ── quotations ────────────────────────────────────────────────────
        "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS subtotal FLOAT DEFAULT 0.0",
        "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS total_amount FLOAT DEFAULT 0.0",
        "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP",
        # ── clients ───────────────────────────────────────────────────────
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS mobile VARCHAR(15)",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_address TEXT",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS pickup_drop_required BOOLEAN DEFAULT FALSE",
        # ── vehicles ──────────────────────────────────────────────────────
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS chassis_number VARCHAR(50)",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_number VARCHAR(50)",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS km_reading_in INTEGER",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS km_reading_out INTEGER",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transmission VARCHAR(20)",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50)",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_expiry TIMESTAMP",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS puc_expiry TIMESTAMP",
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS notes TEXT",
    ]
    with engine.connect() as conn:
        for sql in _MIGRATIONS:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception as exc:
                _log.warning("Migration skipped: %s — %s", sql[:60], exc)
    _log.info("Startup migrations complete.")

try:
    _run_migrations()
except Exception as exc:
    _log.error("Startup migrations failed (DB may not be ready): %s", exc)

app = FastAPI(
    title="Invoice Software API",
    description="Backend API for Invoice Management System with Database",
    version="2.0.0"
)

# ── Global JWT middleware (protects all /api/* except auth) ───────────────
class AuthMiddleware(BaseHTTPMiddleware):
    # Paths that never require a token
    EXEMPT = {
        "/",
        "/health",
        "/api/auth/token",
        "/api/auth/me",
        "/api/logs/frontend",   # frontend can log errors before login
        "/docs",
        "/openapi.json",
        "/redoc",
    }

    async def dispatch(self, request: Request, call_next):
        # Allow OPTIONS pre-flight and exempt paths through
        if request.method == "OPTIONS" or request.url.path in self.EXEMPT:
            return await call_next(request)

        # Only protect /api/* routes
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        parts = auth_header.split(" ", 1)
        if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
            return JSONResponse(
                {"detail": "Not authenticated"},
                status_code=status.HTTP_401_UNAUTHORIZED,
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = parts[1].strip()
        try:
            jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except JWTError:
            return JSONResponse(
                {"detail": "Invalid or expired token"},
                status_code=status.HTTP_401_UNAUTHORIZED,
                headers={"WWW-Authenticate": "Bearer"},
            )

        return await call_next(request)

# CORS configuration — allow all origins so Netlify/Vercel frontends work
# (JWT auth already protects all /api/* endpoints)
_CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
_allow_origins = (
    [o.strip() for o in _CORS_ORIGINS.split(",") if o.strip()]
    if _CORS_ORIGINS != "*"
    else ["*"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=(_CORS_ORIGINS != "*"),  # credentials can't be used with wildcard
    allow_methods=["*"],
    allow_headers=["*"],
)
# AuthMiddleware added AFTER CORSMiddleware so CORS headers are always set
# (Starlette applies middleware in reverse-registration order)
app.add_middleware(AuthMiddleware)

# ── Request logging middleware ────────────────────────────────────────────
_req_log = logging.getLogger("invoice_api.requests")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    method  = request.method
    path    = request.url.path
    try:
        response = await call_next(request)
        ms = int((time.time() - start) * 1000)
        level = logging.WARNING if response.status_code >= 400 else logging.INFO
        _req_log.log(level, "%s %s → %d  (%dms)", method, path, response.status_code, ms)
        return response
    except Exception as exc:
        ms = int((time.time() - start) * 1000)
        _req_log.exception("UNHANDLED %s %s  (%dms) — %s", method, path, ms, exc)
        raise

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Invoice Software Backend API with Database",
        "status": "running",
        "version": "2.0.0",
        "database": "connected"
    }

# ── Frontend error log receiver ───────────────────────────────────────────
_fe_log = logging.getLogger("invoice_api.frontend")

@app.post("/api/logs/frontend")
async def receive_frontend_log(payload: dict):
    """Receive error/warning logs from the React frontend and write to errors.log"""
    level   = (payload.get("level") or "ERROR").upper()
    message = payload.get("message", "")
    data    = payload.get("data")
    page    = payload.get("page", "")
    ua      = payload.get("userAgent", "")

    log_fn = {
        "ERROR":   _fe_log.error,
        "WARN":    _fe_log.warning,
        "WARNING": _fe_log.warning,
        "INFO":    _fe_log.info,
    }.get(level, _fe_log.error)

    log_fn("[FRONTEND] %s | page=%s | %s | ua=%s", message, page, data, ua[:80])
    return {"ok": True}

# Health check
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    # Test database connection
    try:
        client_count = db.query(Client).count()
        return {
            "status": "healthy",
            "service": "invoice-backend",
            "database": "connected",
            "clients_count": client_count
        }
    except Exception as e:
        _log.exception("Health check: database error")
        return {"status": "unhealthy", "database": "error"}

# ── Auth endpoints ─────────────────────────────────────────────────────
@app.post("/api/auth/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Real login — validates username + password, returns signed JWT."""
    if form_data.username != ADMIN_USERNAME or \
       not _verify_password(form_data.password, _HASHED_ADMIN_PW):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = _create_token({"sub": form_data.username, "role": "admin"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": 1,
            "username": ADMIN_USERNAME,
            "email": os.getenv("DEFAULT_ADMIN_EMAIL", "admin@carservice.com"),
            "role": "admin"
        }
    }

@app.get("/api/auth/me")
async def get_me(current_user: str = Depends(_get_current_user)):
    """Returns info for the currently logged-in user."""
    return {
        "id": 1,
        "username": current_user,
        "email": os.getenv("DEFAULT_ADMIN_EMAIL", "admin@carservice.com"),
        "role": "admin"
    }

# Client endpoints with database
@app.get("/api/clients/")
async def get_clients(search: Optional[str] = "", mobile: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Client)
    if mobile:
        # Exact or partial mobile number lookup
        query = query.filter(
            (Client.mobile.ilike(f"%{mobile}%")) |
            (Client.phone.ilike(f"%{mobile}%"))
        )
    elif search:
        query = query.filter(
            (Client.name.ilike(f"%{search}%")) |
            (Client.mobile.ilike(f"%{search}%")) |
            (Client.phone.ilike(f"%{search}%"))
        )
    clients = query.all()

    # Convert to dict format expected by frontend
    return [
        {
            "id": client.id,
            "name": client.name,
            "phone": client.phone,
            "mobile": client.mobile,
            "email": client.email,
            "address": client.address,
            "city": client.city,
            "state": client.state,
            "pincode": client.pincode
        }
        for client in clients
    ]

@app.get("/api/clients/{client_id}")
async def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    return {
        "id": client.id,
        "name": client.name,
        "phone": client.phone,
        "mobile": client.mobile,
        "email": client.email,
        "address": client.address,
        "city": client.city,
        "state": client.state,
        "pincode": client.pincode
    }

@app.post("/api/clients/")
async def create_client(client_data: dict, db: Session = Depends(get_db)):
    new_client = Client(**client_data)
    db.add(new_client)
    db.commit()
    db.refresh(new_client)

    return {
        "id": new_client.id,
        "name": new_client.name,
        "phone": new_client.phone,
        "mobile": new_client.mobile,
        "email": new_client.email,
        "address": new_client.address,
        "city": new_client.city,
        "state": new_client.state,
        "pincode": new_client.pincode
    }

@app.put("/api/clients/{client_id}")
async def update_client(client_id: int, client_data: dict, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    for key, value in client_data.items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)

    return {
        "id": client.id,
        "name": client.name,
        "phone": client.phone,
        "mobile": client.mobile,
        "email": client.email,
        "address": client.address,
        "city": client.city,
        "state": client.state,
        "pincode": client.pincode
    }

@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    db.delete(client)
    db.commit()

    return {"message": "Client deleted successfully"}

# Vehicle endpoints with database
@app.get("/api/vehicles/brands")
async def get_vehicle_brands(db: Session = Depends(get_db)):
    brands = db.query(VehicleBrand).all()
    result = []
    for brand in brands:
        models = db.query(VehicleModel).filter(VehicleModel.brand_id == brand.id).all()
        result.append({
            "id": brand.id,
            "name": brand.name,
            "models": [{"id": m.id, "name": m.name} for m in models]
        })
    return result

@app.get("/api/vehicles/brands/{brand_id}/models")
async def get_vehicle_models_by_brand(brand_id: int, db: Session = Depends(get_db)):
    models = db.query(VehicleModel).filter(VehicleModel.brand_id == brand_id).all()
    return [{"id": model.id, "name": model.name} for model in models]

@app.get("/api/vehicles/")
async def get_vehicles(search: Optional[str] = "", limit: int = 10, client_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Vehicle)
    if search:
        query = query.filter(Vehicle.registration_number.ilike(f"%{search}%"))
    if client_id:
        query = query.filter(Vehicle.client_id == client_id)
    vehicles = query.limit(limit).all()

    result = []
    for vehicle in vehicles:
        brand_name = ""
        model_name = ""
        if vehicle.model_id:
            v_model = db.query(VehicleModel).filter(VehicleModel.id == vehicle.model_id).first()
            if v_model:
                model_name = v_model.name or ""
                if v_model.brand_id:
                    v_brand = db.query(VehicleBrand).filter(VehicleBrand.id == v_model.brand_id).first()
                    if v_brand:
                        brand_name = v_brand.name or ""
        result.append({
            "id": vehicle.id,
            "registration_number": vehicle.registration_number,
            "model": model_name,
            "brand": brand_name,
            "model_name": model_name,
            "brand_name": brand_name,
            "client_id": vehicle.client_id,
            "year": vehicle.year,
            "color": vehicle.color,
            "fuel_type": vehicle.fuel_type
        })
    return result

@app.get("/api/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Get model and brand details for editing
    model = db.query(VehicleModel).filter(VehicleModel.id == vehicle.model_id).first() if vehicle.model_id else None
    brand = db.query(VehicleBrand).filter(VehicleBrand.id == model.brand_id).first() if model and model.brand_id else None

    model_name = model.name if model else ""
    brand_name = brand.name if brand else ""
    return {
        "id": vehicle.id,
        "registration_number": vehicle.registration_number,
        "model_id": vehicle.model_id,
        "brand_id": brand.id if brand else None,
        "model": model_name,
        "brand": brand_name,
        "model_name": model_name,
        "brand_name": brand_name,
        "client_id": vehicle.client_id,
        "year": vehicle.year,
        "color": vehicle.color,
        "mileage": vehicle.mileage,
        "vin_number": vehicle.vin_number,
        "chassis_number": vehicle.chassis_number,
        "engine_number": vehicle.engine_number,
        "fuel_type": vehicle.fuel_type,
        "transmission": vehicle.transmission,
        "vehicle_type": vehicle.vehicle_type,
        "last_service_date": vehicle.last_service_date.isoformat() if vehicle.last_service_date else None,
        "insurance_expiry": vehicle.insurance_expiry.isoformat() if vehicle.insurance_expiry else None,
        "puc_expiry": vehicle.puc_expiry.isoformat() if vehicle.puc_expiry else None,
        "notes": vehicle.notes
    }

def _clean_vehicle_data(vehicle_data: dict) -> dict:
    """Strip unknown fields and fix types so Vehicle(**data) never crashes."""
    # Only these columns exist on the Vehicle model
    valid_fields = {
        'client_id', 'model_id', 'registration_number', 'vin_number',
        'chassis_number', 'engine_number', 'year', 'color', 'mileage',
        'km_reading_in', 'km_reading_out', 'fuel_type', 'transmission',
        'vehicle_type', 'last_service_date', 'insurance_expiry',
        'puc_expiry', 'notes'
    }
    cleaned = {k: v for k, v in vehicle_data.items() if k in valid_fields}

    # Convert empty strings to None for datetime fields
    for field in ('last_service_date', 'insurance_expiry', 'puc_expiry'):
        if field in cleaned and cleaned[field] == '':
            cleaned[field] = None

    # Ensure integer fields are integers (not strings)
    for field in ('client_id', 'model_id', 'year', 'mileage', 'km_reading_in', 'km_reading_out'):
        if field in cleaned and cleaned[field] not in (None, ''):
            try:
                cleaned[field] = int(cleaned[field])
            except (ValueError, TypeError):
                cleaned[field] = None

    return cleaned

@app.post("/api/vehicles/")
async def create_vehicle(vehicle_data: dict, db: Session = Depends(get_db)):
    cleaned = _clean_vehicle_data(vehicle_data)

    # Check if registration number already exists
    existing_vehicle = db.query(Vehicle).filter(
        Vehicle.registration_number == cleaned.get('registration_number')
    ).first()

    if existing_vehicle:
        raise HTTPException(
            status_code=400,
            detail=f"Registration number '{cleaned.get('registration_number')}' already exists. Please use a different registration number."
        )

    new_vehicle = Vehicle(**cleaned)
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)

    return {"id": new_vehicle.id, "message": "Vehicle created successfully"}

@app.put("/api/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: int, vehicle_data: dict, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    cleaned = _clean_vehicle_data(vehicle_data)

    for key, value in cleaned.items():
        setattr(vehicle, key, value)

    db.commit()
    db.refresh(vehicle)

    return {"id": vehicle.id, "message": "Vehicle updated successfully"}

@app.delete("/api/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    db.delete(vehicle)
    db.commit()

    return {"message": "Vehicle deleted successfully"}


# Service endpoints with database
@app.get("/api/services/")
async def get_services(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all services as array (frontend expects array, not wrapped object)"""
    from models.models import ServiceCategory
    query = db.query(Service)
    if category_id:
        query = query.filter(Service.category_id == category_id)
    if search:
        query = query.filter(Service.name.ilike(f"%{search}%"))
    services = query.offset(skip).limit(limit).all()
    return [
        {
            "id": service.id,
            "name": service.name,
            "description": service.description,
            "base_price": service.base_price,
            "price": service.base_price,
            "labor_hours": service.labor_hours,
            "hsn_sac_code": service.hsn_sac_code,
            "category_name": service.category.name if service.category else "General"
        }
        for service in services
    ]

@app.get("/api/services/services")
async def get_services_alt(db: Session = Depends(get_db)):
    services = db.query(Service).all()
    return [
        {"id": service.id, "name": service.name, "price": service.base_price}
        for service in services
    ]

@app.get("/api/services/parts")
async def get_parts(db: Session = Depends(get_db)):
    parts = db.query(Part).all()
    return [
        {"id": part.id, "name": part.name, "price": part.unit_price}
        for part in parts
    ]

# Client Profile endpoints
@app.get("/api/clients/{client_id}/profile")
async def get_client_profile(client_id: int, db: Session = Depends(get_db)):
    """
    Get comprehensive client profile with all related data
    Client-ன் முழு விவரங்களையும் எடுக்கும் endpoint
    """
    # Get client details
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Get client's vehicles
    vehicles = db.query(Vehicle).join(VehicleModel).join(VehicleBrand).filter(
        Vehicle.client_id == client_id
    ).all()

    # Get client's invoices
    invoices = db.query(Invoice).filter(Invoice.client_id == client_id).all()

    # Calculate statistics
    from datetime import datetime
    current_year = datetime.now().year

    # This year's invoices
    this_year_invoices = [inv for inv in invoices if inv.invoice_date and inv.invoice_date.year == current_year]
    total_revenue = sum(inv.total_amount for inv in this_year_invoices)
    pending_amount = sum(inv.total_amount for inv in this_year_invoices if inv.payment_status == 'pending')

    return {
        "client": {
            "id": client.id,
            "name": client.name,
            "phone": client.phone,
            "mobile": client.mobile,
            "email": client.email,
            "address": client.address,
            "city": client.city,
            "state": client.state,
            "pincode": client.pincode
        },
        "vehicles": [
            {
                "id": vehicle.id,
                "registration_number": vehicle.registration_number,
                "brand": vehicle.model.brand.name if vehicle.model and vehicle.model.brand else "Unknown",
                "model": vehicle.model.name if vehicle.model else "Unknown",
                "year": vehicle.year,
                "color": vehicle.color,
                "last_service_date": vehicle.last_service_date.isoformat() if vehicle.last_service_date else None,
                "mileage": vehicle.mileage
            }
            for vehicle in vehicles
        ],
        "invoices": [
            {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "service_type": invoice.service_type,
                "total_amount": invoice.total_amount,
                "payment_status": invoice.payment_status,
                "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
                "due_date": invoice.due_date.isoformat() if invoice.due_date else None
            }
            for invoice in invoices
        ],
        "statistics": {
            "total_vehicles": len(vehicles),
            "this_year_invoices": len(this_year_invoices),
            "this_year_services": len(this_year_invoices),
            "total_revenue": total_revenue,
            "pending_amount": pending_amount,
            "average_invoice": total_revenue / len(this_year_invoices) if this_year_invoices else 0,
            "current_year": current_year
        }
    }

@app.get("/api/clients/{client_id}/vehicles")
async def get_client_vehicles(client_id: int, db: Session = Depends(get_db)):
    """Get all vehicles for a specific client"""
    vehicles = db.query(Vehicle).join(VehicleModel).join(VehicleBrand).filter(
        Vehicle.client_id == client_id
    ).all()

    return [
        {
            "id": vehicle.id,
            "registration_number": vehicle.registration_number,
            "brand": vehicle.model.brand.name if vehicle.model and vehicle.model.brand else "Unknown",
            "model": vehicle.model.name if vehicle.model else "Unknown",
            "year": vehicle.year,
            "color": vehicle.color,
            "mileage": vehicle.mileage,
            "last_service_date": vehicle.last_service_date.isoformat() if vehicle.last_service_date else None
        }
        for vehicle in vehicles
    ]

@app.get("/api/clients/{client_id}/invoices")
async def get_client_invoices(client_id: int, year: int = None, db: Session = Depends(get_db)):
    """Get all invoices for a specific client"""
    query = db.query(Invoice).filter(Invoice.client_id == client_id)

    if year:
        from sqlalchemy import extract
        query = query.filter(extract('year', Invoice.invoice_date) == year)

    invoices = query.order_by(Invoice.invoice_date.desc()).all()

    return [
        {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "vehicle_id": invoice.vehicle_id,
            "service_type": invoice.service_type,
            "total_amount": invoice.total_amount,
            "payment_status": invoice.payment_status,
            "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None
        }
        for invoice in invoices
    ]

# Dashboard endpoints
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    from sqlalchemy import extract
    client_count = db.query(Client).count()
    vehicle_count = db.query(Vehicle).count()
    service_count = db.query(Service).count()
    part_count = db.query(Part).count()
    invoice_count = db.query(Invoice).count()

    # Pending invoices count
    pending_invoices_count = db.query(Invoice).filter(
        Invoice.payment_status == "pending"
    ).count()

    # Monthly revenue (current month, paid invoices)
    now = datetime.now()
    monthly_revenue = db.query(func.sum(Invoice.total_amount)).filter(
        extract('year', Invoice.invoice_date) == now.year,
        extract('month', Invoice.invoice_date) == now.month,
        Invoice.payment_status == "paid"
    ).scalar() or 0.0

    # Outstanding amount (unpaid invoices)
    outstanding_amount = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.payment_status != "paid"
    ).scalar() or 0.0

    # Recent invoices (last 5)
    recent_invoices_db = db.query(Invoice).join(Client).order_by(
        Invoice.invoice_date.desc()
    ).limit(5).all()

    recent_invoices = []
    for inv in recent_invoices_db:
        client = db.query(Client).filter(Client.id == inv.client_id).first()
        recent_invoices.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "client_name": client.name if client else "Unknown",
            "total_amount": inv.total_amount,
            "status": inv.payment_status,
            "issue_date": inv.invoice_date.isoformat() if inv.invoice_date else None
        })

    return {
        "total_clients": client_count,
        "total_vehicles": vehicle_count,
        "total_services": service_count,
        "total_parts": part_count,
        "total_invoices": invoice_count,
        "pending_invoices": pending_invoices_count,
        "monthly_revenue": float(monthly_revenue),
        "outstanding_amount": float(outstanding_amount),
        "total_revenue": float(monthly_revenue),
        "pending_payments": float(outstanding_amount),
        "recent_invoices": recent_invoices
    }

@app.get("/api/dashboard/revenue-chart")
async def get_revenue_chart():
    # Mock data for now - TODO: Calculate from actual invoices
    return [
        {"month": "Jan", "revenue": 10000},
        {"month": "Feb", "revenue": 12000},
        {"month": "Mar", "revenue": 15000},
        {"month": "Apr", "revenue": 11000},
        {"month": "May", "revenue": 18000},
        {"month": "Jun", "revenue": 20000}
    ]

# Quotation endpoints
@app.get("/api/quotations/templates/service-packages")
async def get_service_packages(db: Session = Depends(get_db)):
    services = db.query(Service).limit(5).all()
    return {
        "packages": [
            {"id": service.id, "name": service.name, "price": service.base_price}
            for service in services
        ]
    }

# Reports endpoints
@app.get("/api/reports/live-summary")
async def get_live_summary(db: Session = Depends(get_db)):
    from sqlalchemy import extract
    now = datetime.now()

    # Counts
    client_count = db.query(Client).count()
    vehicle_count = db.query(Vehicle).count()
    service_count = db.query(Service).count()

    # Revenue: total and this month
    total_revenue = db.query(func.sum(Invoice.total_amount)).scalar() or 0.0
    monthly_revenue = db.query(func.sum(Invoice.total_amount)).filter(
        extract('year', Invoice.invoice_date) == now.year,
        extract('month', Invoice.invoice_date) == now.month
    ).scalar() or 0.0

    # Last month revenue for growth calculation
    last_month = now.month - 1 if now.month > 1 else 12
    last_month_year = now.year if now.month > 1 else now.year - 1
    last_month_revenue = db.query(func.sum(Invoice.total_amount)).filter(
        extract('year', Invoice.invoice_date) == last_month_year,
        extract('month', Invoice.invoice_date) == last_month
    ).scalar() or 0.0

    revenue_growth = 0.0
    if last_month_revenue > 0:
        revenue_growth = ((float(monthly_revenue) - float(last_month_revenue)) / float(last_month_revenue)) * 100

    # Clients this month
    new_clients_this_month = db.query(Client).filter(
        extract('year', Client.created_at) == now.year,
        extract('month', Client.created_at) == now.month
    ).count()

    # Services this month (invoices created this month)
    services_this_month = db.query(Invoice).filter(
        extract('year', Invoice.invoice_date) == now.year,
        extract('month', Invoice.invoice_date) == now.month
    ).count()

    # Invoices
    pending_count = db.query(Invoice).filter(Invoice.payment_status == "pending").count()
    overdue_count = db.query(Invoice).filter(Invoice.payment_status == "overdue").count()
    pending_amount = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.payment_status.in_(["pending", "overdue"])
    ).scalar() or 0.0

    # Financial
    outstanding = db.query(func.sum(Invoice.balance_due)).scalar() or pending_amount

    # Return the NESTED structure that ReportsPage/useLiveReports expects
    return {
        "revenue": {
            "total": float(total_revenue),
            "growth": round(revenue_growth, 1),
            "thisMonth": float(monthly_revenue),
            "change": float(monthly_revenue) - float(last_month_revenue)
        },
        "clients": {
            "total": client_count,
            "newThisMonth": new_clients_this_month,
            "growth": round((new_clients_this_month / max(client_count - new_clients_this_month, 1)) * 100, 1),
            "change": new_clients_this_month
        },
        "services": {
            "thisMonth": services_this_month,
            "growth": round(revenue_growth, 1),
            "change": services_this_month
        },
        "invoices": {
            "pending": pending_count,
            "overdue": overdue_count,
            "pendingAmount": float(pending_amount),
            "change": pending_count
        },
        "financial": {
            "profit": float(monthly_revenue) * 0.35,
            "outstanding": float(outstanding),
            "change": 0.0
        },
        "vehicles": vehicle_count,
        "totalServices": service_count,
        "isLive": True,
        "lastUpdate": now.isoformat()
    }

@app.get("/api/reports/chart/revenue")
async def get_reports_revenue_chart(db: Session = Depends(get_db)):
    from sqlalchemy import extract
    current_year = datetime.now().year
    data = []
    for month in range(1, 13):
        revenue = db.query(func.sum(Invoice.total_amount)).filter(
            extract('year', Invoice.invoice_date) == current_year,
            extract('month', Invoice.invoice_date) == month
        ).scalar() or 0
        month_name = datetime(current_year, month, 1).strftime("%b")
        # Add profit estimate (35% of revenue) so frontend chart has both keys
        rev = float(revenue)
        data.append({"month": month_name, "revenue": rev, "profit": round(rev * 0.35, 2)})
    # Return plain array — recharts requires array, not wrapped object
    return data

@app.get("/api/reports/chart/services")
async def get_services_chart(db: Session = Depends(get_db)):
    services = db.query(Service).limit(5).all()
    colors = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6"]
    # Return plain array — recharts requires array, not wrapped object
    return [
        {
            "name": service.name,
            "count": 15 + (service.id * 3),
            "revenue": float(service.base_price) * (15 + service.id * 3),
            "color": colors[i % len(colors)]
        }
        for i, service in enumerate(services)
    ]

@app.get("/api/quotations/")
async def get_quotations(db: Session = Depends(get_db)):
    """Get all quotations from Railway MySQL database"""
    try:
        # Fetch all quotations from Railway MySQL database
        quotations = db.query(Quotation).all()

        # Return quotations with client and vehicle details
        return [
            {
                "id": quotation.id,
                "quotation_number": quotation.quotation_number,
                "client_id": quotation.client_id,
                "vehicle_id": quotation.vehicle_id,
                "quotation_date": quotation.quotation_date.isoformat() if quotation.quotation_date else None,
                "valid_until": quotation.valid_until.isoformat() if quotation.valid_until else None,
                "subtotal": quotation.subtotal,
                "total_amount": quotation.total_amount,
                "status": quotation.status,
                "notes": quotation.notes,
                "created_at": quotation.created_at.isoformat() if quotation.created_at else None
            }
            for quotation in quotations
        ]
    except Exception as e:
        _log.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/quotations/")
async def create_quotation(quotation_data: dict, db: Session = Depends(get_db)):
    """Create a new quotation and save all line items"""
    try:
        import datetime as dt
        today = dt.date.today()

        # Generate unique quotation number
        total_count = db.query(Quotation).count()
        quotation_number = f"QUO-{today.strftime('%Y%m%d')}-{total_count + 1:04d}"

        # Parse valid_until date
        valid_until = None
        if quotation_data.get("valid_until"):
            val = quotation_data["valid_until"]
            try:
                if isinstance(val, str):
                    val = val.split("T")[0]
                    valid_until = dt.datetime.strptime(val, "%Y-%m-%d")
            except Exception:
                valid_until = None

        # Parse quotation_date
        quotation_date = None
        if quotation_data.get("quotation_date"):
            val = quotation_data["quotation_date"]
            try:
                if isinstance(val, str):
                    val = val.split("T")[0]
                    quotation_date = dt.datetime.strptime(val, "%Y-%m-%d")
            except Exception:
                quotation_date = dt.datetime.now()
        if not quotation_date:
            quotation_date = dt.datetime.now()

        # Create new quotation
        new_quotation = Quotation(
            quotation_number=quotation_number,
            client_id=int(quotation_data.get("client_id")),
            vehicle_id=int(quotation_data.get("vehicle_id")),
            quotation_date=quotation_date,
            subtotal=float(quotation_data.get("subtotal", 0.0)),
            total_amount=float(quotation_data.get("total_amount", 0.0)),
            status=quotation_data.get("status", "pending"),
            notes=quotation_data.get("notes"),
            valid_until=valid_until
        )

        db.add(new_quotation)
        db.flush()  # Get the ID without committing yet

        # Save quotation items (line items were previously never saved!)
        items = quotation_data.get("items", [])
        for item in items:
            item_type = item.get("item_type") or item.get("type") or "service"
            quantity = float(item.get("quantity") or item.get("qty") or 1)
            db_item = QuotationItem(
                quotation_id=new_quotation.id,
                item_type=item_type,
                name=item.get("name", ""),
                hsn_sac=item.get("hsn_sac") or item.get("hsn_sac_code"),
                quantity=quantity,
                rate=float(item.get("rate", 0)),
                discount=float(item.get("discount", 0)),
                tax_rate=float(item.get("tax_rate") if item.get("tax_rate") is not None else 0.0),
                total=float(item.get("total", 0))
            )
            db.add(db_item)

        db.commit()
        db.refresh(new_quotation)

        return {
            "message": "Quotation created successfully",
            "id": new_quotation.id,
            "quotation_id": new_quotation.id,
            "quotation_number": new_quotation.quotation_number,
            "items_saved": len(items)
        }

    except Exception as e:
        _log.exception("Request error")
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid request data")

@app.get("/api/quotations/{quotation_id}")
async def get_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """Get individual quotation with client, vehicle, and items for PDF generation"""
    try:
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")

        # Fetch client and vehicle for PDF
        client = db.query(Client).filter(Client.id == quotation.client_id).first()
        vehicle = db.query(Vehicle).filter(Vehicle.id == quotation.vehicle_id).first()

        # Fetch line items
        quotation_items = db.query(QuotationItem).filter(QuotationItem.quotation_id == quotation_id).all()
        items = []
        for item in quotation_items:
            items.append({
                "id": item.id,
                "item_type": item.item_type or "service",
                "type": item.item_type or "service",
                "name": item.name,
                "hsn_sac": item.hsn_sac or "",
                "quantity": item.quantity,
                "rate": item.rate,
                "discount": item.discount or 0.0,
                "tax_rate": item.tax_rate if item.tax_rate is not None else 0.0,
                "total": item.total
            })

        # Build vehicle info — explicit queries for brand/model (no lazy loading)
        vehicle_info = None
        if vehicle:
            brand_name = ""
            model_name = ""
            if vehicle.model_id:
                v_model = db.query(VehicleModel).filter(VehicleModel.id == vehicle.model_id).first()
                if v_model:
                    model_name = v_model.name or ""
                    if v_model.brand_id:
                        v_brand = db.query(VehicleBrand).filter(VehicleBrand.id == v_model.brand_id).first()
                        if v_brand:
                            brand_name = v_brand.name or ""
            vehicle_info = {
                "id": vehicle.id,
                "registration_number": vehicle.registration_number,
                "brand_name": brand_name,
                "model_name": model_name,
                "make": brand_name,
                "model": model_name,
                "year": vehicle.year
            }

        # Build client info
        client_info = None
        if client:
            client_info = {
                "id": client.id,
                "name": client.name or "",
                "phone": client.phone or "",
                "mobile": client.mobile or client.phone or "",
                "email": client.email or "",
                "address": client.address or "",
                "city": client.city or "",
                "state": client.state or "",
                "pincode": client.pincode or ""
            }

        # Compute GST totals from per-item tax rates (matches frontend calcTotals logic)
        calc_taxable = 0.0
        calc_cgst = 0.0
        calc_sgst = 0.0
        calc_discount = 0.0
        for it in quotation_items:
            qty = it.quantity or 1
            rate = it.rate or 0
            disc_pct = it.discount if it.discount is not None else 0
            tax_pct = it.tax_rate if it.tax_rate is not None else 0
            line_base = qty * rate
            line_disc = line_base * disc_pct / 100
            line_taxable = line_base - line_disc
            line_tax = line_taxable * tax_pct / 100
            calc_discount += line_disc
            calc_taxable += line_taxable
            calc_cgst += line_tax / 2
            calc_sgst += line_tax / 2

        calc_total = round(calc_taxable + calc_cgst + calc_sgst, 2)
        has_gst = any((it.tax_rate or 0) > 0 for it in quotation_items)

        return {
            "id": quotation.id,
            "quotation_number": quotation.quotation_number,
            "client_id": quotation.client_id,
            "vehicle_id": quotation.vehicle_id,
            "quotation_date": quotation.quotation_date.isoformat() if quotation.quotation_date else None,
            "valid_until": quotation.valid_until.isoformat() if quotation.valid_until else None,
            "subtotal": round(calc_taxable, 2),
            "taxable_amount": round(calc_taxable, 2),
            "total_amount": calc_total,
            "status": quotation.status,
            "notes": quotation.notes or "",
            "gst_enabled": has_gst,
            "tax_rate": 0.0,
            "cgst_rate": 9.0,
            "sgst_rate": 9.0,
            "cgst_amount": round(calc_cgst, 2),
            "sgst_amount": round(calc_sgst, 2),
            "discount_amount": round(calc_discount, 2),
            "place_of_supply": "Tamil Nadu (33)",
            "created_at": quotation.created_at.isoformat() if quotation.created_at else None,
            # Nested objects for PDF generation
            "client": client_info,
            "vehicle": vehicle_info,
            "items": items,
            # Flat fields for list compatibility
            "client_name": client.name if client else None,
            "vehicle_registration": vehicle.registration_number if vehicle else None
        }
    except HTTPException:
        raise
    except Exception as e:
        _log.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/quotations/{quotation_id}")
async def update_quotation(quotation_id: int, quotation_data: dict, db: Session = Depends(get_db)):
    """Update quotation in Railway MySQL database — including items"""
    try:
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")

        # Extract items before updating fields
        items = quotation_data.pop("items", None)

        # Update header fields
        skip_fields = {"id", "created_at", "quotation_number", "client", "vehicle"}
        for field, value in quotation_data.items():
            if field in skip_fields or not hasattr(quotation, field):
                continue
            if field in ['valid_until', 'quotation_date'] and isinstance(value, str) and value:
                try:
                    if value.endswith('Z'):
                        value = value.rstrip('Z')
                    if '.' in value:
                        value = value.split('.')[0]
                    setattr(quotation, field, datetime.fromisoformat(value))
                except (ValueError, TypeError):
                    pass  # Keep existing value if parse fails
            else:
                setattr(quotation, field, value)

        # Update items if provided
        if items is not None:
            # Delete old items first
            db.query(QuotationItem).filter(QuotationItem.quotation_id == quotation_id).delete()

            # Re-create items from the updated list
            for item in items:
                item_type = item.get("item_type") or item.get("type") or "service"
                quantity = float(item.get("quantity") or item.get("qty") or 1)
                rate = float(item.get("rate") or item.get("unit_price") or 0)
                discount = float(item.get("discount") or item.get("discount_amount") or 0)
                tax_rate = float(item.get("tax_rate") if item.get("tax_rate") is not None else 0.0)
                total = float(item.get("total") or item.get("total_price") or (rate * quantity))
                db_item = QuotationItem(
                    quotation_id=quotation_id,
                    item_type=item_type,
                    name=item.get("name", ""),
                    hsn_sac=item.get("hsn_sac") or item.get("hsn_sac_code") or ("9986" if item_type == "service" else "8708"),
                    quantity=quantity,
                    rate=rate,
                    discount=discount,
                    tax_rate=tax_rate,
                    total=total,
                )
                db.add(db_item)

        db.commit()
        db.refresh(quotation)

        return {"message": "Quotation updated successfully", "quotation_id": quotation.id}

    except HTTPException:
        raise
    except Exception as e:
        _log.exception("Request error")
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid request data")


@app.post("/api/quotations/{quotation_id}/accept")
async def accept_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """Mark a quotation as accepted"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    quotation.status = "accepted"
    db.commit()
    return {"message": "Quotation accepted", "quotation_id": quotation_id, "status": "accepted"}


@app.post("/api/quotations/{quotation_id}/reject")
async def reject_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """Mark a quotation as rejected"""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    quotation.status = "rejected"
    db.commit()
    return {"message": "Quotation rejected", "quotation_id": quotation_id, "status": "rejected"}


@app.post("/api/quotations/{quotation_id}/convert-to-invoice")
async def convert_quotation_to_invoice(quotation_id: int, db: Session = Depends(get_db)):
    """Convert an accepted quotation into a new invoice"""
    try:
        import datetime as dt

        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")

        # Only pending or accepted quotations can be converted
        if quotation.status in ("rejected", "expired", "converted"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot convert quotation with status '{quotation.status}'"
            )

        # Fetch quotation items
        q_items = db.query(QuotationItem).filter(QuotationItem.quotation_id == quotation_id).all()

        # Generate invoice number
        today = dt.date.today()
        count = db.query(Invoice).count()
        invoice_number = f"INV-{today.strftime('%Y%m%d')}-{count + 1:04d}"

        # Calculate totals from per-item tax_rate (same formula as frontend)
        taxable = 0.0
        cgst = 0.0
        sgst = 0.0
        for item in q_items:
            qty = item.quantity or 1
            rate = item.rate or 0
            disc_pct = item.discount or 0
            tax_pct = item.tax_rate if item.tax_rate is not None else 0
            line_base = qty * rate
            line_disc = line_base * disc_pct / 100
            line_taxable = line_base - line_disc
            line_tax = line_taxable * tax_pct / 100
            taxable += line_taxable
            cgst += line_tax / 2
            sgst += line_tax / 2

        total = round(taxable + cgst + sgst, 2)

        new_invoice = Invoice(
            invoice_number=invoice_number,
            client_id=quotation.client_id,
            vehicle_id=quotation.vehicle_id,
            invoice_date=dt.datetime.now(),
            subtotal=round(taxable, 2),
            tax_amount=round(cgst + sgst, 2),
            cgst_amount=round(cgst, 2),
            sgst_amount=round(sgst, 2),
            total_amount=total,
            balance_due=total,
            payment_status="pending",
            notes=f"Converted from Quotation {quotation.quotation_number}",
        )
        db.add(new_invoice)
        db.flush()

        # Copy line items to InvoiceService / InvoicePart
        for item in q_items:
            qty = item.quantity or 1
            rate = item.rate or 0
            disc_pct = item.discount or 0
            tax_rate = item.tax_rate if item.tax_rate is not None else 0
            line_base = qty * rate
            line_disc = line_base * disc_pct / 100
            line_taxable = line_base - line_disc
            line_tax = line_taxable * tax_rate / 100
            line_total = round(line_taxable + line_tax, 2)

            if item.item_type == "part":
                db.add(InvoicePart(
                    invoice_id=new_invoice.id,
                    part_name=item.name,
                    hsn_sac_code=item.hsn_sac or "8708",
                    quantity=qty,
                    unit_price=rate,
                    discount=disc_pct,
                    tax_rate=tax_rate,
                    cost=line_base,
                    total_price=line_total,
                ))
            else:
                db.add(InvoiceService(
                    invoice_id=new_invoice.id,
                    service_name=item.name,
                    hsn_sac_code=item.hsn_sac or "9986",
                    quantity=qty,
                    unit_price=rate,
                    discount=disc_pct,
                    tax_rate=tax_rate,
                    amount=line_base,
                    total_price=line_total,
                ))

        # Mark quotation as converted
        quotation.status = "converted"
        db.commit()

        return {
            "message": "Quotation converted to invoice successfully",
            "invoice_id": new_invoice.id,
            "invoice_number": new_invoice.invoice_number,
            "quotation_id": quotation_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        _log.exception("Error converting quotation to invoice")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


# Invoice endpoints
@app.get("/api/invoices/")
async def get_invoices(
    status: Optional[str] = None,
    search: Optional[str] = None,
    client_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Fetch all invoices with optional status, search, and client_id filters"""
    query = db.query(Invoice)

    if status and status != "all":
        query = query.filter(Invoice.payment_status == status)

    if client_id:
        query = query.filter(Invoice.client_id == client_id)

    if search:
        query = query.join(Client, isouter=True).filter(
            (Invoice.invoice_number.ilike(f"%{search}%")) |
            (Client.name.ilike(f"%{search}%"))
        )

    invoices = query.order_by(Invoice.invoice_date.desc()).offset(skip).limit(limit).all()

    result = []
    for invoice in invoices:
        client = db.query(Client).filter(Client.id == invoice.client_id).first()
        vehicle = db.query(Vehicle).filter(Vehicle.id == invoice.vehicle_id).first()
        result.append({
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "client_id": invoice.client_id,
            "client_name": client.name if client else "Unknown Client",
            "vehicle_id": invoice.vehicle_id,
            "vehicle_info": f"{vehicle.model.brand.name} {vehicle.model.name} - {vehicle.registration_number}" if vehicle and vehicle.model and vehicle.model.brand else (vehicle.registration_number if vehicle else "Unknown Vehicle"),
            "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
            "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
            "payment_status": invoice.payment_status,
            "service_type": invoice.service_type,
            "subtotal": invoice.subtotal,
            "total_amount": invoice.total_amount,
            "tax_amount": invoice.tax_amount,
            "discount_amount": invoice.discount_amount
        })
    return result

@app.post("/api/invoices/")
async def create_invoice(invoice_data: dict, db: Session = Depends(get_db)):
    from datetime import datetime

    try:
        _log.info("Invoice creation started")

        # Validate required fields
        if not invoice_data.get('client_id') or not invoice_data.get('vehicle_id'):
            raise HTTPException(status_code=400, detail="client_id and vehicle_id are required")

        if not invoice_data.get('items') or len(invoice_data.get('items', [])) == 0:
            raise HTTPException(status_code=400, detail="At least one service or part item is required")

        # Generate invoice number
        current_year = datetime.now().year
        invoice_count = db.query(Invoice).count() + 1
        invoice_number = f"INV-{current_year}-{invoice_count:04d}"

        # Parse invoice date
        invoice_date = None
        if invoice_data.get('invoice_date'):
            try:
                invoice_date = datetime.strptime(invoice_data.get('invoice_date'), '%Y-%m-%d')
            except ValueError:
                invoice_date = datetime.now()
        else:
            invoice_date = datetime.now()

        # Parse challan date
        challan_date = None
        if invoice_data.get('challan_date'):
            try:
                challan_date = datetime.strptime(invoice_data.get('challan_date'), '%Y-%m-%d')
            except ValueError:
                challan_date = None

        # Create invoice in database
        new_invoice = Invoice(
            invoice_number=invoice_number,
            client_id=int(invoice_data.get('client_id')),
            vehicle_id=int(invoice_data.get('vehicle_id')),
            invoice_date=invoice_date,
            challan_no=invoice_data.get('challan_no'),
            challan_date=challan_date,
            transport=invoice_data.get('transport'),
            transport_id=invoice_data.get('transport_id'),
            place_of_supply=invoice_data.get('place_of_supply', 'Tamil Nadu (33)'),
            notes=invoice_data.get('notes'),
            payment_status=invoice_data.get('payment_status', 'pending'),
            service_type=invoice_data.get('service_type', 'General Service'),
            subtotal=float(invoice_data.get('taxable_amount', 0.0)),
            igst_amount=float(invoice_data.get('igst_amount', 0.0)),
            tax_amount=float(invoice_data.get('igst_amount', 0.0)),  # Using IGST as tax_amount
            total_amount=float(invoice_data.get('total_amount', 0.0)),
            discount_amount=invoice_data.get('discount_amount', 0.0)
        )

        db.add(new_invoice)
        db.commit()
        db.refresh(new_invoice)

        _log.info("Invoice created: %s", new_invoice.invoice_number)

        # Process invoice items
        items_processed = 0
        for item in invoice_data.get('items', []):
            _qty = float(item.get('qty', 1))
            _rate = float(item.get('rate', 0))
            _discount = float(item.get('discount', 0))
            _tax_rate = float(item.get('tax_rate') if item.get('tax_rate') is not None else 0.0)
            _taxable = float(item.get('taxable_value', 0)) or (_qty * _rate * (1 - _discount / 100))
            if item.get('type') == 'service':
                db.add(InvoiceService(
                    invoice_id=new_invoice.id,
                    service_name=item.get('name'),
                    hsn_sac_code=item.get('hsn_sac', '8302'),
                    quantity=_qty,
                    unit_price=_rate,
                    discount=_discount,
                    tax_rate=_tax_rate,
                    total_price=_taxable,
                    amount=_taxable,
                ))
                items_processed += 1

            elif item.get('type') == 'part':
                db.add(InvoicePart(
                    invoice_id=new_invoice.id,
                    part_name=item.get('name'),
                    hsn_sac_code=item.get('hsn_sac', '8708'),
                    quantity=_qty,
                    unit_price=_rate,
                    discount=_discount,
                    tax_rate=_tax_rate,
                    total_price=_taxable,
                    cost=_taxable,
                ))
                items_processed += 1

        db.commit()

        _log.info("Invoice %s: %d items processed", new_invoice.invoice_number, items_processed)

        return {
            "success": True,
            "data": {
                "id": new_invoice.id,
                "invoice_number": new_invoice.invoice_number,
                "message": "Invoice created successfully"
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        _log.exception("Invoice creation failed")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/invoices/{invoice_id}")
async def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")

        # Fetch client and vehicle with explicit queries (avoid lazy loading)
        client = db.query(Client).filter(Client.id == invoice.client_id).first() if invoice.client_id else None
        vehicle = db.query(Vehicle).filter(Vehicle.id == invoice.vehicle_id).first() if invoice.vehicle_id else None

        # Fetch line items
        invoice_services = db.query(InvoiceService).filter(InvoiceService.invoice_id == invoice_id).all()
        invoice_parts = db.query(InvoicePart).filter(InvoicePart.invoice_id == invoice_id).all()

        items = []
        for s in invoice_services:
            qty = float(s.quantity or 1)
            rate = float(s.unit_price or 0)
            discount = float(getattr(s, 'discount', 0) or 0)
            tax_rate = float(s.tax_rate if s.tax_rate is not None else 0)
            total = float(s.amount or s.total_price or (qty * rate) or 0)
            items.append({
                "id": s.id, "item_type": "service", "type": "service",
                "name": s.service_name or "Service",
                "hsn_sac": s.hsn_sac_code or "8302",
                "quantity": qty, "rate": rate, "total": total,
                "discount": discount, "tax_rate": tax_rate,
                "unit_price": rate, "total_price": total,
            })
        for p in invoice_parts:
            qty = float(p.quantity or 1)
            rate = float(p.unit_price or 0)
            discount = float(getattr(p, 'discount', 0) or 0)
            tax_rate = float(p.tax_rate if p.tax_rate is not None else 0)
            total = float(p.cost or p.total_price or (qty * rate) or 0)
            items.append({
                "id": p.id, "item_type": "part", "type": "part",
                "name": p.part_name or "Part",
                "hsn_sac": p.hsn_sac_code or "8708",
                "quantity": qty, "rate": rate, "total": total,
                "discount": discount, "tax_rate": tax_rate,
                "unit_price": rate, "total_price": total,
            })

        # Build vehicle info — explicit queries for brand/model (no lazy loading)
        vehicle_info = None
        if vehicle:
            brand_name = ""
            model_name = ""
            if vehicle.model_id:
                v_model = db.query(VehicleModel).filter(VehicleModel.id == vehicle.model_id).first()
                if v_model:
                    model_name = v_model.name or ""
                    if v_model.brand_id:
                        v_brand = db.query(VehicleBrand).filter(VehicleBrand.id == v_model.brand_id).first()
                        if v_brand:
                            brand_name = v_brand.name or ""
            vehicle_info = {
                "id": vehicle.id,
                "registration_number": vehicle.registration_number,
                "brand_name": brand_name,
                "model_name": model_name,
                "make": brand_name,
                "model": model_name,
                "year": vehicle.year,
                "color": vehicle.color,
                "fuel_type": vehicle.fuel_type
            }

        # Build client info
        client_info = None
        if client:
            client_info = {
                "id": client.id,
                "name": client.name or "",
                "phone": client.phone or "",
                "mobile": client.mobile or client.phone or "",
                "email": client.email or "",
                "address": client.address or "",
                "city": client.city or "",
                "state": client.state or "",
                "pincode": client.pincode or "",
                "gst_number": getattr(client, 'gst_number', '') or ""
            }

        return {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "client_id": invoice.client_id,
            "vehicle_id": invoice.vehicle_id,
            "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
            "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
            "payment_status": invoice.payment_status,
            "service_type": invoice.service_type,
            "subtotal": float(invoice.subtotal or 0),
            "taxable_amount": float(invoice.subtotal or 0),
            "total_amount": float(invoice.total_amount or 0),
            "tax_amount": float(invoice.tax_amount or 0),
            "tax_rate": float(invoice.tax_rate if invoice.tax_rate is not None else 0.0),
            "cgst_rate": float(invoice.cgst_rate or 9.0),
            "sgst_rate": float(invoice.sgst_rate or 9.0),
            "cgst_amount": float(invoice.cgst_amount or 0.0),
            "sgst_amount": float(invoice.sgst_amount or 0.0),
            "igst_amount": float(invoice.igst_amount or 0.0),
            "igst_rate": float(invoice.igst_rate if invoice.igst_rate is not None else 0.0),
            "discount_amount": float(invoice.discount_amount or 0.0),
            "round_off": float(invoice.round_off or 0.0),
            "gst_enabled": True,
            "notes": invoice.notes or "",
            "place_of_supply": invoice.place_of_supply or "Tamil Nadu (33)",
            "challan_no": invoice.challan_no or "",
            "transport": invoice.transport or "",
            "created_at": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
            # Nested objects for PDF generation
            "client": client_info,
            "vehicle": vehicle_info,
            "items": items
        }
    except HTTPException:
        raise
    except Exception as e:
        _log.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/api/invoices/{invoice_id}")
async def update_invoice(invoice_id: int, invoice_data: dict, db: Session = Depends(get_db)):
    """Update invoice including services and parts items"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")

    try:
        # Extract items before updating header fields
        items = invoice_data.pop("items", None)

        # Update invoice header fields
        skip_fields = {"id", "invoice_number", "created_at", "client", "vehicle", "services", "parts"}
        for key, value in invoice_data.items():
            if key in skip_fields or not hasattr(invoice, key):
                continue
            if key in ['invoice_date', 'due_date'] and isinstance(value, str) and value:
                try:
                    if value.endswith('Z'):
                        value = value.rstrip('Z')
                    if '.' in value:
                        value = value.split('.')[0]
                    setattr(invoice, key, datetime.fromisoformat(value))
                except (ValueError, TypeError):
                    pass
            else:
                setattr(invoice, key, value)

        # Update items if provided
        if items is not None:
            # Delete existing services and parts
            db.query(InvoiceService).filter(InvoiceService.invoice_id == invoice_id).delete()
            db.query(InvoicePart).filter(InvoicePart.invoice_id == invoice_id).delete()

            # Re-create from updated items list
            for item in items:
                item_type = item.get("item_type") or item.get("type") or "service"
                quantity = float(item.get("quantity") or item.get("qty") or 1)
                unit_price = float(item.get("unit_price") or item.get("rate") or 0)
                # taxable_value = pretax total (qty * rate); total includes GST
                taxable_value = float(item.get("taxable_value") or item.get("total_price") or (unit_price * quantity))
                total_price = float(item.get("total") or item.get("total_price") or taxable_value)
                # Accept hsn_sac (frontend field) or hsn_sac_code (legacy)
                hsn = item.get("hsn_sac") or item.get("hsn_sac_code") or item.get("hsn") or ""

                discount_pct = float(item.get("discount") or 0)
                tax_rate = float(item.get("tax_rate") if item.get("tax_rate") is not None else (item.get("gst_rate") if item.get("gst_rate") is not None else 0.0))

                if item_type == "service":
                    db.add(InvoiceService(
                        invoice_id=invoice_id,
                        service_name=item.get("name", ""),
                        amount=unit_price,
                        hsn_sac_code=hsn or "9986",
                        quantity=quantity,
                        unit_price=unit_price,
                        discount=discount_pct,
                        tax_rate=tax_rate,
                        total_price=taxable_value,
                    ))
                else:
                    db.add(InvoicePart(
                        invoice_id=invoice_id,
                        part_name=item.get("name", ""),
                        cost=unit_price,
                        hsn_sac_code=hsn or "8708",
                        quantity=quantity,
                        unit_price=unit_price,
                        discount=discount_pct,
                        tax_rate=tax_rate,
                        total_price=taxable_value,
                    ))

        db.commit()
        db.refresh(invoice)

        return {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "message": "Invoice updated successfully in database"
        }

    except HTTPException:
        raise
    except Exception as e:
        _log.exception("Request error")
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid request data")

@app.patch("/api/invoices/{invoice_id}/status")
async def patch_invoice_status(invoice_id: int, status_data: dict, db: Session = Depends(get_db)):
    """Update invoice payment status via PATCH (used by frontend EnhancedInvoicesPage)"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")

    new_status = status_data.get("payment_status") or status_data.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="payment_status or status field is required")

    invoice.payment_status = new_status
    db.commit()

    return {"message": f"Invoice status updated to {new_status}", "invoice_id": invoice_id}

@app.delete("/api/invoices/{invoice_id}")
async def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    # Find invoice in database
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()

    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")

    # Delete related services and parts first
    db.query(InvoiceService).filter(InvoiceService.invoice_id == invoice_id).delete()
    db.query(InvoicePart).filter(InvoicePart.invoice_id == invoice_id).delete()

    db.delete(invoice)
    db.commit()

    return {
        "message": f"Invoice {invoice.invoice_number} deleted successfully from database"
    }

# Invoice and Quotation Items endpoints
@app.get("/api/invoices/{invoice_id}/items")
async def get_invoice_items(invoice_id: int, db: Session = Depends(get_db)):
    """Get all services and parts for an invoice - Enhanced for editing"""
    try:
        # Get invoice services with detailed information
        invoice_services = db.query(InvoiceService).filter(InvoiceService.invoice_id == invoice_id).all()
        services = []
        for item in invoice_services:
            # Get service details if service_id exists
            service_details = db.query(Service).filter(Service.id == item.service_id).first() if item.service_id else None

            services.append({
                "id": item.id,
                "type": "service",
                "item_type": "service",
                "item_id": item.service_id,
                "service_id": item.service_id,
                "name": item.service_name or (service_details.name if service_details else "Custom Service"),
                "service_name": item.service_name or (service_details.name if service_details else "Custom Service"),
                "description": service_details.description if service_details else "",
                "amount": item.amount,
                "quantity": item.quantity,
                "rate": item.unit_price,
                "unit_price": item.unit_price,
                "discount": getattr(item, 'discount', 0) or 0,
                "tax_rate": (getattr(item, 'tax_rate', None) if getattr(item, 'tax_rate', None) is not None else 0),
                "total": item.total_price,
                "total_price": item.total_price,
                "hsn_sac": item.hsn_sac_code,
                "hsn_sac_code": item.hsn_sac_code,
                "editable": True
            })

        # Get invoice parts with detailed information
        invoice_parts = db.query(InvoicePart).filter(InvoicePart.invoice_id == invoice_id).all()
        parts = []
        for item in invoice_parts:
            # Get part details if part_id exists
            part_details = db.query(Part).filter(Part.id == item.part_id).first() if item.part_id else None

            parts.append({
                "id": item.id,
                "type": "part",
                "item_type": "part",
                "item_id": item.part_id,
                "part_id": item.part_id,
                "name": item.part_name or (part_details.name if part_details else "Custom Part"),
                "part_name": item.part_name or (part_details.name if part_details else "Custom Part"),
                "description": part_details.description if part_details else "",
                "cost": item.cost,
                "quantity": item.quantity,
                "rate": item.unit_price,
                "unit_price": item.unit_price,
                "discount": getattr(item, 'discount', 0) or 0,
                "tax_rate": (getattr(item, 'tax_rate', None) if getattr(item, 'tax_rate', None) is not None else 0),
                "total": item.total_price,
                "total_price": item.total_price,
                "hsn_sac": item.hsn_sac_code,
                "hsn_sac_code": item.hsn_sac_code,
                "editable": True
            })

        # Combine all items for unified editing interface
        all_items = []
        for service in services:
            all_items.append(service)
        for part in parts:
            all_items.append(part)

        return {
            "services": services,
            "parts": parts,
            "items": all_items,  # Unified list for easier frontend handling
            "total_items": len(services) + len(parts),
            "editable": True,  # Indicates this invoice can be edited
            "invoice_id": invoice_id
        }

    except Exception as e:
        _log.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/quotations/{quotation_id}/items")
async def get_quotation_items(quotation_id: int, db: Session = Depends(get_db)):
    """Get all items for a quotation - Enhanced for editing"""
    try:
        # Get quotation items
        quotation_items = db.query(QuotationItem).filter(QuotationItem.quotation_id == quotation_id).all()

        items = []
        services = []
        parts = []

        for item in quotation_items:
            # Calculate totals
            line_total = (item.quantity * item.rate) - item.discount
            tax_amount = (line_total * item.tax_rate) / 100 if item.tax_rate else 0
            final_total = line_total + tax_amount

            item_data = {
                "id": item.id,
                "type": item.item_type,  # service or part
                "name": item.name,
                "description": "",  # Could be enhanced with lookup
                "hsn_sac": item.hsn_sac,
                "hsn_sac_code": item.hsn_sac,  # For compatibility
                "quantity": item.quantity,
                "rate": item.rate,
                "unit_price": item.rate,  # For compatibility
                "amount": final_total,  # For compatibility
                "cost": final_total,  # For compatibility
                "discount": item.discount,
                "discount_amount": item.discount,  # For compatibility
                "tax_rate": item.tax_rate,
                "tax_amount": tax_amount,
                "line_total": line_total,
                "total": final_total,
                "editable": True,  # Indicates this item can be edited
                "item_id": None  # Could be enhanced with service/part lookup
            }

            items.append(item_data)

            # Separate by type for compatibility
            if item.item_type == "service":
                services.append(item_data)
            else:
                parts.append(item_data)

        return {
            "items": items,  # All items combined
            "services": services,  # Services only (for compatibility)
            "parts": parts,  # Parts only (for compatibility)
            "total_items": len(items),
            "editable": True,  # Indicates this quotation can be edited
            "quotation_id": quotation_id
        }

    except Exception as e:
        _log.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")

# Download endpoints for invoices and quotations
@app.get("/api/invoices/{invoice_id}/download")
async def download_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """Download invoice as PDF"""
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        # Get client and vehicle details
        client = db.query(Client).filter(Client.id == invoice.client_id).first()
        vehicle = db.query(Vehicle).filter(Vehicle.id == invoice.vehicle_id).first()

        # Return invoice data for PDF generation
        return {
            "invoice": {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
                "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
                "total_amount": invoice.total_amount,
                "subtotal": invoice.subtotal,
                "tax_amount": invoice.tax_amount,
                "discount_amount": invoice.discount_amount,
                "payment_status": invoice.payment_status,
                "service_type": invoice.service_type
            },
            "client": {
                "name": client.name if client else "Unknown Client",
                "phone": client.phone if client else "",
                "email": client.email if client else "",
                "address": client.address if client else ""
            },
            "vehicle": {
                "registration_number": vehicle.registration_number if vehicle else "",
                "brand": getattr(vehicle, 'brand', '') if vehicle else "",
                "model": getattr(vehicle, 'model', '') if vehicle else "",
                "year": vehicle.year if vehicle else ""
            }
        }
    except Exception as e:
        _log.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/quotations/{quotation_id}/download")
async def download_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """Download quotation as PDF"""
    try:
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")

        # Get client and vehicle details
        client = db.query(Client).filter(Client.id == quotation.client_id).first()
        vehicle = db.query(Vehicle).filter(Vehicle.id == quotation.vehicle_id).first()

        # Return quotation data for PDF generation
        return {
            "quotation": {
                "id": quotation.id,
                "quotation_number": quotation.quotation_number,
                "quotation_date": quotation.quotation_date.isoformat() if quotation.quotation_date else None,
                "valid_until": quotation.valid_until.isoformat() if quotation.valid_until else None,
                "total_amount": quotation.total_amount,
                "subtotal": quotation.subtotal,
                "status": quotation.status,
                "notes": quotation.notes
            },
            "client": {
                "name": client.name if client else "Unknown Client",
                "phone": client.phone if client else "",
                "email": client.email if client else "",
                "address": client.address if client else ""
            },
            "vehicle": {
                "registration_number": vehicle.registration_number if vehicle else "",
                "brand": getattr(vehicle, 'brand', '') if vehicle else "",
                "model": getattr(vehicle, 'model', '') if vehicle else "",
                "year": vehicle.year if vehicle else ""
            }
        }
    except Exception as e:
        _log.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")

import json as _json

_SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "settings.json")

_DEFAULT_SETTINGS = {
    "company_name": "Om Murugan Auto Works",
    "address": "No.45, Anna Salai, Chennai - 600002, Tamil Nadu",
    "phone": "+91 98765 43210",
    "mobile": "+91 98765 43210",
    "email": "contact@ommunruganworks.com",
    "website": "www.ommunruganworks.com",
    "gst_number": "33AABBA7890B1ZW",
    "pan_number": "26CORPP3939N1",
    "place_of_supply": "Tamil Nadu (33)",
    "invoice_prefix": "INV",
    "quotation_prefix": "QUO",
    "default_tax_rate": 18.0,
    "currency": "INR"
}

def _load_settings() -> dict:
    try:
        if os.path.exists(_SETTINGS_FILE):
            with open(_SETTINGS_FILE, "r") as f:
                saved = _json.load(f)
                return {**_DEFAULT_SETTINGS, **saved}
    except Exception:
        pass
    return dict(_DEFAULT_SETTINGS)

def _save_settings(data: dict):
    merged = {**_DEFAULT_SETTINGS, **data}
    with open(_SETTINGS_FILE, "w") as f:
        _json.dump(merged, f, indent=2)
    return merged

@app.get("/api/settings")
async def get_settings():
    """Get company settings"""
    return _load_settings()

@app.post("/api/settings")
async def save_settings(data: dict):
    """Save company settings"""
    try:
        saved = _save_settings(data)
        return {"success": True, "settings": saved}
    except Exception as e:
        _log.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)