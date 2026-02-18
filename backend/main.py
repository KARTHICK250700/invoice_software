from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import uvicorn

from database.database import SessionLocal, engine, Base
from models import models
from auth import auth
from routers import clients, vehicles, services, invoices, quotations, dashboard, reports

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Car Service Center Billing Software",
    description="Professional invoice and billing system for car service centers",
    version="1.0.0 (Trial Version)"
)

# CORS - Allow all for development with explicit configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],  # Explicit origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Additional CORS middleware to ensure headers are always present
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(vehicles.router, prefix="/api/vehicles", tags=["Vehicles"])
app.include_router(services.router, prefix="/api/services", tags=["Services"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(quotations.router, prefix="/api/quotations", tags=["Quotations"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
async def root():
    response = Response(content='{"message": "Car Service Center API is running", "cors": "enabled"}', media_type="application/json")
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


@app.get("/test-cors")
async def test_cors():
    return {
        "message": "Car Service Center Billing Software API",
        "version": "1.0.0 (Trial Version)",
        "status": "active"
    }

@app.post("/admin/init-data")
async def initialize_data_manually():
    """Manually initialize sample data"""
    db = SessionLocal()
    try:
        from models.models import VehicleBrand, VehicleModel

        # Check if brands already exist
        existing_brands = db.query(VehicleBrand).count()
        if existing_brands > 0:
            return {"message": f"Data already exists ({existing_brands} brands). Use /admin/init-data-force to reinitialize."}

        # Comprehensive brands and models data
        brands_data = [
            {
                "name": "Maruti Suzuki",
                "country": "India",
                "models": ["Omni", "Gypsy", "Esteem", "Zen", "Baleno", "Alto", "WagonR", "Versa", "Swift", "Swift Dzire", "A-Star", "SX4", "Ritz", "Ertiga", "Celerio", "Ciaz", "Ignis", "XL6", "Fronx", "Grand Vitara", "Jimny", "S-Presso", "Vitara Brezza", "Brezza"]
            },
            {
                "name": "Hyundai",
                "country": "South Korea",
                "models": ["Santros", "Accent", "Elantra", "Sonata", "Getz", "i10", "i20", "Eon", "Verna", "Creta", "Venue", "Tucson", "Alcazar", "Aura", "Grand i10", "Grand i10 Nios", "Kona Electric", "Ioniq 5"]
            },
            {
                "name": "Tata Motors",
                "country": "India",
                "models": ["Sierra", "Estate", "Sumo", "Indica", "Indigo", "Safari", "Manza", "Zest", "Bolt", "Tiago", "Tigor", "Altroz", "Punch", "Harrier", "Nexon", "Nexon EV", "Tiago EV", "Tigor EV"]
            },
            {
                "name": "Mahindra",
                "country": "India",
                "models": ["Armada", "Marshal", "Bolero", "Scorpio", "Scorpio-N", "Scorpio Classic", "Xylo", "TUV300", "KUV100", "XUV300", "XUV500", "XUV700", "Thar", "Quanto", "Verito", "Logan"]
            },
            {
                "name": "Honda",
                "country": "Japan",
                "models": ["City", "Civic", "Accord", "Jazz", "CR-V", "BR-V", "Amaze", "WR-V", "Brio"]
            },
            {
                "name": "Toyota",
                "country": "Japan",
                "models": ["Qualis", "Corolla", "Camry", "Innova", "Innova Crysta", "Fortuner", "Etios", "Etios Liva", "Urban Cruiser", "Rumion", "Glanza", "Hyryder", "Vellfire", "Land Cruiser"]
            },
            {
                "name": "Ford",
                "country": "USA",
                "models": ["Escort", "Ikon", "Fusion", "Endeavour", "Figo", "Figo Aspire", "EcoSport", "Fiesta"]
            },
            {
                "name": "Chevrolet",
                "country": "USA",
                "models": ["Optra", "Aveo", "Aveo UVA", "Spark", "Beat", "Cruze", "Tavera", "Enjoy", "Sail", "Sail UVA"]
            },
            {
                "name": "Renault",
                "country": "France",
                "models": ["Fluence", "Koleos", "Duster", "Kwid", "Triber", "Kiger", "Lodgy"]
            },
            {
                "name": "Nissan",
                "country": "Japan",
                "models": ["Micra", "Micra Active", "Sunny", "Terrano", "Kicks", "Magnite"]
            },
            {
                "name": "Skoda",
                "country": "Czech Republic",
                "models": ["Octavia", "Superb", "Laura", "Fabia", "Rapid", "Kodiaq", "Kushaq", "Slavia"]
            },
            {
                "name": "Volkswagen",
                "country": "Germany",
                "models": ["Polo", "Vento", "Jetta", "Passat", "Tiguan", "Taigun", "Virtus"]
            },
            {
                "name": "MG Motor",
                "country": "UK/China",
                "models": ["Hector", "Hector Plus", "Astor", "ZS EV", "Gloster", "Comet EV"]
            },
            {
                "name": "Kia",
                "country": "South Korea",
                "models": ["Seltos", "Sonet", "Carens", "EV6"]
            },
            {
                "name": "Fiat",
                "country": "Italy",
                "models": ["Palio", "Siena", "Linea", "Punto", "Punto EVO", "Abarth Punto", "Avventura"]
            },
            {
                "name": "Jeep",
                "country": "USA",
                "models": ["Compass", "Meridian"]
            },
            {
                "name": "Mercedes-Benz",
                "country": "Germany",
                "models": ["A-Class", "B-Class", "C-Class", "E-Class", "S-Class", "CLA", "CLS", "GLA", "GLC", "GLE", "GLS", "AMG GT"]
            },
            {
                "name": "BMW",
                "country": "Germany",
                "models": ["1 Series", "3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7", "Z4"]
            },
            {
                "name": "Audi",
                "country": "Germany",
                "models": ["A3", "A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8", "RS models"]
            },
            {
                "name": "Volvo",
                "country": "Sweden",
                "models": ["S60", "S90", "XC40", "XC60", "XC90"]
            },
            {
                "name": "Porsche",
                "country": "Germany",
                "models": ["911", "Cayenne", "Cayman", "Panamera", "Macan"]
            },
            {
                "name": "Jaguar",
                "country": "UK",
                "models": ["XE", "XF", "XJ", "F-Pace", "F-Type", "I-Pace"]
            },
            {
                "name": "Land Rover",
                "country": "UK",
                "models": ["Defender", "Discovery", "Range Rover", "Range Rover Sport", "Range Rover Evoque", "Range Rover Velar"]
            },
            {
                "name": "BYD",
                "country": "China",
                "models": ["e6", "Atto 3", "Seal"]
            },
            {
                "name": "Citroën",
                "country": "France",
                "models": ["C3", "C3 Aircross", "ëC3"]
            },
            {
                "name": "Lexus",
                "country": "Japan",
                "models": ["ES", "NX", "RX", "LX"]
            },
            {
                "name": "Isuzu",
                "country": "Japan",
                "models": ["D-Max V-Cross", "MU-X"]
            },
            {
                "name": "Mitsubishi",
                "country": "Japan",
                "models": ["Lancer", "Cedia", "Outlander", "Pajero", "Pajero Sport", "Montero"]
            },
            {
                "name": "Hindustan Motors",
                "country": "India",
                "models": ["Ambassador", "Contessa"]
            },
            {
                "name": "Premier",
                "country": "India",
                "models": ["Padmini", "Rio"]
            },
            {
                "name": "Opel",
                "country": "Germany",
                "models": ["Astra", "Corsa"]
            }
        ]

        for brand_info in brands_data:
            # Create brand
            brand = VehicleBrand(
                name=brand_info["name"],
                country=brand_info["country"]
            )
            db.add(brand)
            db.flush()

            # Create models
            for model_name in brand_info["models"]:
                model = VehicleModel(
                    brand_id=brand.id,
                    name=model_name,
                    year_start=2010,
                    fuel_type="Petrol",
                    transmission="Manual"
                )
                db.add(model)

        db.commit()
        return {"message": "Vehicle brands and models initialized successfully!"}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()

@app.post("/admin/init-data-force")
async def initialize_data_force():
    """Force reinitialize all vehicle brands and models data"""
    db = SessionLocal()
    try:
        from models.models import VehicleBrand, VehicleModel

        # Clear existing data
        db.query(VehicleModel).delete()
        db.query(VehicleBrand).delete()
        db.commit()

        # Comprehensive brands and models data
        brands_data = [
            {
                "name": "Maruti Suzuki",
                "country": "India",
                "models": ["Omni", "Gypsy", "Esteem", "Zen", "Baleno", "Alto", "WagonR", "Versa", "Swift", "Swift Dzire", "A-Star", "SX4", "Ritz", "Ertiga", "Celerio", "Ciaz", "Ignis", "XL6", "Fronx", "Grand Vitara", "Jimny", "S-Presso", "Vitara Brezza", "Brezza"]
            },
            {
                "name": "Hyundai",
                "country": "South Korea",
                "models": ["Santros", "Accent", "Elantra", "Sonata", "Getz", "i10", "i20", "Eon", "Verna", "Creta", "Venue", "Tucson", "Alcazar", "Aura", "Grand i10", "Grand i10 Nios", "Kona Electric", "Ioniq 5"]
            },
            {
                "name": "Tata Motors",
                "country": "India",
                "models": ["Sierra", "Estate", "Sumo", "Indica", "Indigo", "Safari", "Manza", "Zest", "Bolt", "Tiago", "Tigor", "Altroz", "Punch", "Harrier", "Nexon", "Nexon EV", "Tiago EV", "Tigor EV"]
            },
            {
                "name": "Mahindra",
                "country": "India",
                "models": ["Armada", "Marshal", "Bolero", "Scorpio", "Scorpio-N", "Scorpio Classic", "Xylo", "TUV300", "KUV100", "XUV300", "XUV500", "XUV700", "Thar", "Quanto", "Verito", "Logan"]
            },
            {
                "name": "Honda",
                "country": "Japan",
                "models": ["City", "Civic", "Accord", "Jazz", "CR-V", "BR-V", "Amaze", "WR-V", "Brio"]
            },
            {
                "name": "Toyota",
                "country": "Japan",
                "models": ["Qualis", "Corolla", "Camry", "Innova", "Innova Crysta", "Fortuner", "Etios", "Etios Liva", "Urban Cruiser", "Rumion", "Glanza", "Hyryder", "Vellfire", "Land Cruiser"]
            },
            {
                "name": "Ford",
                "country": "USA",
                "models": ["Escort", "Ikon", "Fusion", "Endeavour", "Figo", "Figo Aspire", "EcoSport", "Fiesta"]
            },
            {
                "name": "Chevrolet",
                "country": "USA",
                "models": ["Optra", "Aveo", "Aveo UVA", "Spark", "Beat", "Cruze", "Tavera", "Enjoy", "Sail", "Sail UVA"]
            },
            {
                "name": "Renault",
                "country": "France",
                "models": ["Fluence", "Koleos", "Duster", "Kwid", "Triber", "Kiger", "Lodgy"]
            },
            {
                "name": "Nissan",
                "country": "Japan",
                "models": ["Micra", "Micra Active", "Sunny", "Terrano", "Kicks", "Magnite"]
            },
            {
                "name": "Skoda",
                "country": "Czech Republic",
                "models": ["Octavia", "Superb", "Laura", "Fabia", "Rapid", "Kodiaq", "Kushaq", "Slavia"]
            },
            {
                "name": "Volkswagen",
                "country": "Germany",
                "models": ["Polo", "Vento", "Jetta", "Passat", "Tiguan", "Taigun", "Virtus"]
            },
            {
                "name": "MG Motor",
                "country": "UK/China",
                "models": ["Hector", "Hector Plus", "Astor", "ZS EV", "Gloster", "Comet EV"]
            },
            {
                "name": "Kia",
                "country": "South Korea",
                "models": ["Seltos", "Sonet", "Carens", "EV6"]
            },
            {
                "name": "Fiat",
                "country": "Italy",
                "models": ["Palio", "Siena", "Linea", "Punto", "Punto EVO", "Abarth Punto", "Avventura"]
            },
            {
                "name": "Jeep",
                "country": "USA",
                "models": ["Compass", "Meridian"]
            },
            {
                "name": "Mercedes-Benz",
                "country": "Germany",
                "models": ["A-Class", "B-Class", "C-Class", "E-Class", "S-Class", "CLA", "CLS", "GLA", "GLC", "GLE", "GLS", "AMG GT"]
            },
            {
                "name": "BMW",
                "country": "Germany",
                "models": ["1 Series", "3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7", "Z4"]
            },
            {
                "name": "Audi",
                "country": "Germany",
                "models": ["A3", "A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8", "RS models"]
            },
            {
                "name": "Volvo",
                "country": "Sweden",
                "models": ["S60", "S90", "XC40", "XC60", "XC90"]
            },
            {
                "name": "Porsche",
                "country": "Germany",
                "models": ["911", "Cayenne", "Cayman", "Panamera", "Macan"]
            },
            {
                "name": "Jaguar",
                "country": "UK",
                "models": ["XE", "XF", "XJ", "F-Pace", "F-Type", "I-Pace"]
            },
            {
                "name": "Land Rover",
                "country": "UK",
                "models": ["Defender", "Discovery", "Range Rover", "Range Rover Sport", "Range Rover Evoque", "Range Rover Velar"]
            },
            {
                "name": "BYD",
                "country": "China",
                "models": ["e6", "Atto 3", "Seal"]
            },
            {
                "name": "Citroën",
                "country": "France",
                "models": ["C3", "C3 Aircross", "ëC3"]
            },
            {
                "name": "Lexus",
                "country": "Japan",
                "models": ["ES", "NX", "RX", "LX"]
            },
            {
                "name": "Isuzu",
                "country": "Japan",
                "models": ["D-Max V-Cross", "MU-X"]
            },
            {
                "name": "Mitsubishi",
                "country": "Japan",
                "models": ["Lancer", "Cedia", "Outlander", "Pajero", "Pajero Sport", "Montero"]
            },
            {
                "name": "Hindustan Motors",
                "country": "India",
                "models": ["Ambassador", "Contessa"]
            },
            {
                "name": "Premier",
                "country": "India",
                "models": ["Padmini", "Rio"]
            },
            {
                "name": "Opel",
                "country": "Germany",
                "models": ["Astra", "Corsa"]
            }
        ]

        for brand_info in brands_data:
            # Create brand
            brand = VehicleBrand(
                name=brand_info["name"],
                country=brand_info["country"]
            )
            db.add(brand)
            db.flush()

            # Create models
            for model_name in brand_info["models"]:
                model = VehicleModel(
                    brand_id=brand.id,
                    name=model_name,
                    year_start=2010,
                    fuel_type="Petrol",
                    transmission="Manual"
                )
                db.add(model)

        db.commit()
        return {"message": "Vehicle brands and models force reinitialized successfully!"}

    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    """Initialize default admin user and sample data"""
    print("STARTUP EVENT CALLED")
    db = SessionLocal()
    try:
        print("Creating default admin user...")
        # Create default admin user
        auth.create_default_admin(db)

        print("Initializing sample data...")
        # Initialize sample data
        from utils.data_initializer import initialize_sample_data
        initialize_sample_data(db)

        print("Startup initialization completed!")

    except Exception as e:
        print(f"Error during startup: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

from auth.auth import router as auth_router
app.include_router(auth_router)
