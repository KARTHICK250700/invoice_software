"""Script to populate the database with sample vehicle brands and models"""

from app.db.session import SessionLocal
from models.models import VehicleBrand, VehicleModel

def populate_vehicle_data():
    db = SessionLocal()
    try:
        # Check if data already exists
        existing_brands = db.query(VehicleBrand).count()
        if existing_brands > 0:
            print(f"Vehicle brands already exist in database: {existing_brands}")
            return

        # Popular Indian car brands and models
        vehicle_data = [
            {
                "brand": "Maruti Suzuki",
                "country": "Japan/India",
                "models": ["Swift", "Baleno", "Dzire", "Alto", "WagonR", "Vitara Brezza", "Ertiga", "Ciaz"]
            },
            {
                "brand": "Hyundai",
                "country": "South Korea",
                "models": ["i20", "Creta", "Venue", "Verna", "Grand i10", "Tucson", "Santro"]
            },
            {
                "brand": "Tata",
                "country": "India",
                "models": ["Nexon", "Harrier", "Safari", "Altroz", "Punch", "Tigor", "Tiago"]
            },
            {
                "brand": "Mahindra",
                "country": "India",
                "models": ["XUV500", "XUV300", "Scorpio", "Bolero", "Thar", "KUV100"]
            },
            {
                "brand": "Honda",
                "country": "Japan",
                "models": ["City", "Amaze", "Jazz", "WR-V", "CR-V", "Civic"]
            },
            {
                "brand": "Toyota",
                "country": "Japan",
                "models": ["Innova Crysta", "Fortuner", "Glanza", "Urban Cruiser", "Camry"]
            },
            {
                "brand": "Kia",
                "country": "South Korea",
                "models": ["Seltos", "Sonet", "Carnival", "Carens"]
            },
            {
                "brand": "MG",
                "country": "UK/China",
                "models": ["Hector", "ZS EV", "Astor", "Gloster"]
            }
        ]

        brands_added = 0
        models_added = 0

        for brand_data in vehicle_data:
            # Create brand
            brand = VehicleBrand(
                name=brand_data["brand"],
                country=brand_data["country"]
            )
            db.add(brand)
            db.flush()  # Get the brand ID
            brands_added += 1

            # Create models for this brand
            for model_name in brand_data["models"]:
                model = VehicleModel(
                    brand_id=brand.id,
                    name=model_name,
                    fuel_type="Petrol/Diesel"
                )
                db.add(model)
                models_added += 1

        db.commit()
        print(f"Successfully added {brands_added} brands and {models_added} models to database")

    except Exception as e:
        db.rollback()
        print(f"Error populating vehicle data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    populate_vehicle_data()