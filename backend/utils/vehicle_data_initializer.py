from sqlalchemy.orm import Session
from models.models import VehicleBrand, VehicleModel

# Comprehensive global vehicle brands and models data
GLOBAL_VEHICLE_DATA = {
    "Maruti Suzuki": {
        "country": "India",
        "models": [
            {"name": "Swift", "year_start": 2005, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Baleno", "year_start": 2015, "fuel_type": "Petrol/CNG", "transmission": "Manual/CVT"},
            {"name": "Alto", "year_start": 2000, "fuel_type": "Petrol/CNG", "transmission": "Manual"},
            {"name": "Vitara Brezza", "year_start": 2016, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Dzire", "year_start": 2008, "fuel_type": "Petrol/Diesel/CNG", "transmission": "Manual/AMT"},
            {"name": "Ertiga", "year_start": 2012, "fuel_type": "Petrol/Diesel/CNG", "transmission": "Manual/Automatic"},
            {"name": "XL6", "year_start": 2019, "fuel_type": "Petrol", "transmission": "Manual/Automatic"},
            {"name": "S-Cross", "year_start": 2015, "fuel_type": "Diesel/Petrol", "transmission": "Manual/Automatic"},
            {"name": "Wagon R", "year_start": 1999, "fuel_type": "Petrol/CNG", "transmission": "Manual/AMT"},
            {"name": "Ciaz", "year_start": 2014, "fuel_type": "Petrol/Diesel", "transmission": "Manual/CVT"},
        ]
    },
    "Hyundai": {
        "country": "South Korea",
        "models": [
            {"name": "i20", "year_start": 2008, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Creta", "year_start": 2015, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Verna", "year_start": 2006, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Venue", "year_start": 2019, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Tucson", "year_start": 2005, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Alcazar", "year_start": 2021, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Santro", "year_start": 1998, "fuel_type": "Petrol/CNG", "transmission": "Manual/AMT"},
            {"name": "Elite i20", "year_start": 2014, "fuel_type": "Petrol/Diesel", "transmission": "Manual/CVT"},
            {"name": "Xcent", "year_start": 2014, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Kona Electric", "year_start": 2019, "fuel_type": "Electric", "transmission": "Automatic"},
        ]
    },
    "Tata": {
        "country": "India",
        "models": [
            {"name": "Nexon", "year_start": 2017, "fuel_type": "Petrol/Diesel/Electric", "transmission": "Manual/AMT"},
            {"name": "Harrier", "year_start": 2019, "fuel_type": "Diesel/Petrol", "transmission": "Manual/Automatic"},
            {"name": "Safari", "year_start": 1998, "fuel_type": "Diesel/Petrol", "transmission": "Manual/Automatic"},
            {"name": "Altroz", "year_start": 2020, "fuel_type": "Petrol/Diesel", "transmission": "Manual/DCT"},
            {"name": "Tiago", "year_start": 2016, "fuel_type": "Petrol/CNG", "transmission": "Manual/AMT"},
            {"name": "Tigor", "year_start": 2017, "fuel_type": "Petrol/CNG/Electric", "transmission": "Manual/AMT"},
            {"name": "Punch", "year_start": 2021, "fuel_type": "Petrol", "transmission": "Manual/AMT"},
            {"name": "Hexa", "year_start": 2017, "fuel_type": "Diesel", "transmission": "Manual/Automatic"},
        ]
    },
    "Mahindra": {
        "country": "India",
        "models": [
            {"name": "XUV500", "year_start": 2011, "fuel_type": "Diesel/Petrol", "transmission": "Manual/Automatic"},
            {"name": "XUV300", "year_start": 2019, "fuel_type": "Petrol/Diesel", "transmission": "Manual/AMT"},
            {"name": "Scorpio", "year_start": 2002, "fuel_type": "Diesel", "transmission": "Manual/Automatic"},
            {"name": "Thar", "year_start": 2010, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Bolero", "year_start": 2001, "fuel_type": "Diesel", "transmission": "Manual"},
            {"name": "KUV100", "year_start": 2016, "fuel_type": "Petrol/Diesel", "transmission": "Manual"},
            {"name": "Marazzo", "year_start": 2018, "fuel_type": "Diesel", "transmission": "Manual"},
            {"name": "XUV700", "year_start": 2021, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
        ]
    },
    "Toyota": {
        "country": "Japan",
        "models": [
            {"name": "Innova", "year_start": 2005, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Fortuner", "year_start": 2009, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Camry", "year_start": 1982, "fuel_type": "Petrol/Hybrid", "transmission": "Automatic"},
            {"name": "Corolla", "year_start": 1966, "fuel_type": "Petrol/Hybrid", "transmission": "Manual/CVT"},
            {"name": "Yaris", "year_start": 1999, "fuel_type": "Petrol", "transmission": "Manual/CVT"},
            {"name": "Glanza", "year_start": 2019, "fuel_type": "Petrol", "transmission": "Manual/CVT"},
            {"name": "Urban Cruiser", "year_start": 2020, "fuel_type": "Petrol", "transmission": "Manual/Automatic"},
            {"name": "Land Cruiser", "year_start": 1951, "fuel_type": "Diesel", "transmission": "Automatic"},
            {"name": "Prius", "year_start": 1997, "fuel_type": "Hybrid", "transmission": "CVT"},
        ]
    },
    "Honda": {
        "country": "Japan",
        "models": [
            {"name": "City", "year_start": 1996, "fuel_type": "Petrol/Diesel", "transmission": "Manual/CVT"},
            {"name": "Amaze", "year_start": 2013, "fuel_type": "Petrol/Diesel", "transmission": "Manual/CVT"},
            {"name": "WR-V", "year_start": 2017, "fuel_type": "Petrol/Diesel", "transmission": "Manual/CVT"},
            {"name": "Jazz", "year_start": 2009, "fuel_type": "Petrol/Diesel", "transmission": "Manual/CVT"},
            {"name": "CR-V", "year_start": 1995, "fuel_type": "Petrol/Diesel", "transmission": "CVT"},
            {"name": "Civic", "year_start": 1972, "fuel_type": "Petrol", "transmission": "Manual/CVT"},
            {"name": "Accord", "year_start": 1976, "fuel_type": "Petrol/Hybrid", "transmission": "CVT"},
            {"name": "BR-V", "year_start": 2016, "fuel_type": "Petrol", "transmission": "Manual/CVT"},
        ]
    },
    "Ford": {
        "country": "USA",
        "models": [
            {"name": "EcoSport", "year_start": 2003, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Endeavour", "year_start": 2003, "fuel_type": "Diesel", "transmission": "Manual/Automatic"},
            {"name": "Aspire", "year_start": 2015, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Figo", "year_start": 2010, "fuel_type": "Petrol/Diesel", "transmission": "Manual"},
            {"name": "Freestyle", "year_start": 2018, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Mustang", "year_start": 1964, "fuel_type": "Petrol", "transmission": "Manual/Automatic"},
            {"name": "F-150", "year_start": 1975, "fuel_type": "Petrol", "transmission": "Automatic"},
        ]
    },
    "BMW": {
        "country": "Germany",
        "models": [
            {"name": "3 Series", "year_start": 1975, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "5 Series", "year_start": 1972, "fuel_type": "Petrol/Diesel/Hybrid", "transmission": "Automatic"},
            {"name": "X1", "year_start": 2009, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "X3", "year_start": 2003, "fuel_type": "Petrol/Diesel", "transmission": "Automatic"},
            {"name": "X5", "year_start": 1999, "fuel_type": "Petrol/Diesel", "transmission": "Automatic"},
            {"name": "7 Series", "year_start": 1977, "fuel_type": "Petrol/Diesel/Hybrid", "transmission": "Automatic"},
            {"name": "i3", "year_start": 2013, "fuel_type": "Electric", "transmission": "Automatic"},
            {"name": "i4", "year_start": 2021, "fuel_type": "Electric", "transmission": "Automatic"},
            {"name": "iX", "year_start": 2021, "fuel_type": "Electric", "transmission": "Automatic"},
        ]
    },
    "Mercedes-Benz": {
        "country": "Germany",
        "models": [
            {"name": "A-Class", "year_start": 1997, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "C-Class", "year_start": 1993, "fuel_type": "Petrol/Diesel/Hybrid", "transmission": "Manual/Automatic"},
            {"name": "E-Class", "year_start": 1953, "fuel_type": "Petrol/Diesel/Hybrid", "transmission": "Automatic"},
            {"name": "S-Class", "year_start": 1972, "fuel_type": "Petrol/Diesel/Hybrid", "transmission": "Automatic"},
            {"name": "GLA", "year_start": 2013, "fuel_type": "Petrol/Diesel", "transmission": "Automatic"},
            {"name": "GLC", "year_start": 2015, "fuel_type": "Petrol/Diesel", "transmission": "Automatic"},
            {"name": "GLE", "year_start": 1997, "fuel_type": "Petrol/Diesel", "transmission": "Automatic"},
            {"name": "EQC", "year_start": 2018, "fuel_type": "Electric", "transmission": "Automatic"},
        ]
    },
    "Audi": {
        "country": "Germany",
        "models": [
            {"name": "A3", "year_start": 1996, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "A4", "year_start": 1994, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "A6", "year_start": 1994, "fuel_type": "Petrol/Diesel", "transmission": "Automatic"},
            {"name": "A8", "year_start": 1994, "fuel_type": "Petrol/Diesel", "transmission": "Automatic"},
            {"name": "Q3", "year_start": 2011, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Q5", "year_start": 2008, "fuel_type": "Petrol/Diesel", "transmission": "Automatic"},
            {"name": "Q7", "year_start": 2005, "fuel_type": "Petrol/Diesel", "transmission": "Automatic"},
            {"name": "e-tron", "year_start": 2018, "fuel_type": "Electric", "transmission": "Automatic"},
        ]
    },
    "Volkswagen": {
        "country": "Germany",
        "models": [
            {"name": "Polo", "year_start": 1975, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Vento", "year_start": 2010, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Tiguan", "year_start": 2007, "fuel_type": "Petrol/Diesel", "transmission": "Automatic"},
            {"name": "Passat", "year_start": 1973, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Golf", "year_start": 1974, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Jetta", "year_start": 1979, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "ID.4", "year_start": 2020, "fuel_type": "Electric", "transmission": "Automatic"},
        ]
    },
    "Skoda": {
        "country": "Czech Republic",
        "models": [
            {"name": "Rapid", "year_start": 2011, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Octavia", "year_start": 1996, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Superb", "year_start": 2001, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Kushaq", "year_start": 2021, "fuel_type": "Petrol", "transmission": "Manual/Automatic"},
            {"name": "Kodiaq", "year_start": 2016, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Karoq", "year_start": 2017, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
        ]
    },
    "Kia": {
        "country": "South Korea",
        "models": [
            {"name": "Seltos", "year_start": 2019, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Sonet", "year_start": 2020, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Carnival", "year_start": 2020, "fuel_type": "Diesel", "transmission": "Automatic"},
            {"name": "Stinger", "year_start": 2017, "fuel_type": "Petrol", "transmission": "Automatic"},
            {"name": "EV6", "year_start": 2021, "fuel_type": "Electric", "transmission": "Automatic"},
        ]
    },
    "MG": {
        "country": "UK",
        "models": [
            {"name": "Hector", "year_start": 2019, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "ZS EV", "year_start": 2020, "fuel_type": "Electric", "transmission": "Automatic"},
            {"name": "Astor", "year_start": 2021, "fuel_type": "Petrol", "transmission": "Manual/CVT"},
            {"name": "Gloster", "year_start": 2020, "fuel_type": "Diesel", "transmission": "Automatic"},
        ]
    },
    "Jeep": {
        "country": "USA",
        "models": [
            {"name": "Compass", "year_start": 2006, "fuel_type": "Petrol/Diesel", "transmission": "Manual/Automatic"},
            {"name": "Meridian", "year_start": 2022, "fuel_type": "Diesel", "transmission": "Manual/Automatic"},
            {"name": "Wrangler", "year_start": 1986, "fuel_type": "Petrol", "transmission": "Manual/Automatic"},
            {"name": "Grand Cherokee", "year_start": 1992, "fuel_type": "Petrol/Diesel", "transmission": "Automatic"},
        ]
    },
    "Nissan": {
        "country": "Japan",
        "models": [
            {"name": "Magnite", "year_start": 2020, "fuel_type": "Petrol", "transmission": "Manual/CVT"},
            {"name": "Kicks", "year_start": 2016, "fuel_type": "Petrol", "transmission": "Manual/CVT"},
            {"name": "Micra", "year_start": 1982, "fuel_type": "Petrol/Diesel", "transmission": "Manual/CVT"},
            {"name": "Sunny", "year_start": 1966, "fuel_type": "Petrol/Diesel", "transmission": "Manual/CVT"},
            {"name": "X-Trail", "year_start": 2000, "fuel_type": "Petrol/Diesel", "transmission": "CVT"},
            {"name": "Leaf", "year_start": 2010, "fuel_type": "Electric", "transmission": "Automatic"},
        ]
    },
    "Renault": {
        "country": "France",
        "models": [
            {"name": "Kwid", "year_start": 2015, "fuel_type": "Petrol", "transmission": "Manual/AMT"},
            {"name": "Triber", "year_start": 2019, "fuel_type": "Petrol", "transmission": "Manual/AMT"},
            {"name": "Duster", "year_start": 2010, "fuel_type": "Petrol/Diesel", "transmission": "Manual/CVT"},
            {"name": "Captur", "year_start": 2013, "fuel_type": "Petrol/Diesel", "transmission": "Manual/CVT"},
            {"name": "Kiger", "year_start": 2021, "fuel_type": "Petrol", "transmission": "Manual/CVT"},
        ]
    }
}

def initialize_global_vehicle_data(db: Session):
    """Initialize global vehicle brands and models data."""
    try:
        # Check if data already exists
        existing_brands = db.query(VehicleBrand).count()
        if existing_brands > 0:
            print(f"Vehicle data already exists ({existing_brands} brands). Skipping initialization.")
            return

        print("Initializing global vehicle brands and models...")

        for brand_name, brand_data in GLOBAL_VEHICLE_DATA.items():
            # Create brand
            brand = VehicleBrand(
                name=brand_name,
                country=brand_data["country"]
            )
            db.add(brand)
            db.flush()  # Get the brand ID

            # Create models for this brand
            for model_data in brand_data["models"]:
                model = VehicleModel(
                    brand_id=brand.id,
                    name=model_data["name"],
                    year_start=model_data["year_start"],
                    fuel_type=model_data["fuel_type"],
                    transmission=model_data["transmission"]
                )
                db.add(model)

        db.commit()
        print(f"Successfully initialized {len(GLOBAL_VEHICLE_DATA)} vehicle brands with models.")

    except Exception as e:
        print(f"Error initializing vehicle data: {str(e)}")
        db.rollback()