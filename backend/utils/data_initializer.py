from sqlalchemy.orm import Session
from models.models import (
    VehicleBrand, VehicleModel, ServiceCategory, Service,
    PartCategory, Part
)
from .vehicle_data_initializer import initialize_global_vehicle_data

def initialize_sample_data(db: Session):
    """Initialize database with comprehensive data including global vehicle brands"""

    # Check if data already exists
    if db.query(VehicleBrand).count() > 0:
        return

    print("Initializing comprehensive sample data...")

    # Initialize global vehicle brands and models
    initialize_global_vehicle_data(db)

    # Service Categories and Services
    service_categories_data = [
        {
            "name": "Engine Services",
            "services": [
                {"name": "Oil Change", "base_price": 2000, "labor_hours": 1.0},
                {"name": "Engine Tuning", "base_price": 5000, "labor_hours": 3.0},
                {"name": "Engine Overhaul", "base_price": 25000, "labor_hours": 8.0},
                {"name": "Timing Belt Replacement", "base_price": 3500, "labor_hours": 2.5},
                {"name": "Spark Plug Replacement", "base_price": 1500, "labor_hours": 1.0},
                {"name": "Air Filter Replacement", "base_price": 800, "labor_hours": 0.5},
                {"name": "Fuel Filter Replacement", "base_price": 1200, "labor_hours": 1.0},
                {"name": "Coolant System Flush", "base_price": 1800, "labor_hours": 1.5},
                {"name": "Engine Cleaning", "base_price": 2500, "labor_hours": 2.0},
                {"name": "Valve Adjustment", "base_price": 3000, "labor_hours": 3.0},
            ]
        },
        {
            "name": "Brake Services",
            "services": [
                {"name": "Brake Pad Replacement", "base_price": 2500, "labor_hours": 2.0},
                {"name": "Brake Disc Replacement", "base_price": 4000, "labor_hours": 2.5},
                {"name": "Brake Fluid Change", "base_price": 800, "labor_hours": 1.0},
                {"name": "Brake System Inspection", "base_price": 500, "labor_hours": 0.5},
                {"name": "Brake Shoe Replacement", "base_price": 1800, "labor_hours": 1.5},
                {"name": "Handbrake Adjustment", "base_price": 600, "labor_hours": 0.5},
                {"name": "Brake Caliper Service", "base_price": 2200, "labor_hours": 2.0},
                {"name": "ABS System Check", "base_price": 1500, "labor_hours": 1.0},
            ]
        },
        {
            "name": "Electrical Services",
            "services": [
                {"name": "Battery Replacement", "base_price": 5000, "labor_hours": 1.0},
                {"name": "Alternator Repair", "base_price": 3500, "labor_hours": 2.0},
                {"name": "Starter Motor Repair", "base_price": 3000, "labor_hours": 2.5},
                {"name": "Wiring Harness Repair", "base_price": 2500, "labor_hours": 3.0},
                {"name": "Headlight Replacement", "base_price": 1200, "labor_hours": 1.0},
                {"name": "Tail Light Repair", "base_price": 800, "labor_hours": 0.5},
                {"name": "ECU Diagnosis", "base_price": 2000, "labor_hours": 1.5},
                {"name": "Fuse Box Inspection", "base_price": 500, "labor_hours": 0.5},
            ]
        },
        {
            "name": "AC Services",
            "services": [
                {"name": "AC Gas Refill", "base_price": 2000, "labor_hours": 1.0},
                {"name": "AC Compressor Repair", "base_price": 8000, "labor_hours": 4.0},
                {"name": "AC Filter Replacement", "base_price": 600, "labor_hours": 0.5},
                {"name": "AC System Diagnosis", "base_price": 1000, "labor_hours": 1.0},
                {"name": "Condenser Cleaning", "base_price": 800, "labor_hours": 1.0},
                {"name": "Evaporator Cleaning", "base_price": 1500, "labor_hours": 2.0},
            ]
        },
        {
            "name": "Transmission Services",
            "services": [
                {"name": "Gear Oil Change", "base_price": 1500, "labor_hours": 1.0},
                {"name": "Clutch Replacement", "base_price": 8000, "labor_hours": 6.0},
                {"name": "Transmission Repair", "base_price": 15000, "labor_hours": 8.0},
                {"name": "CV Joint Replacement", "base_price": 3500, "labor_hours": 3.0},
                {"name": "Drive Shaft Repair", "base_price": 4000, "labor_hours": 3.0},
            ]
        }
    ]

    for category_data in service_categories_data:
        category = ServiceCategory(name=category_data["name"])
        db.add(category)
        db.flush()

        for service_data in category_data["services"]:
            service = Service(
                category_id=category.id,
                name=service_data["name"],
                base_price=service_data["base_price"],
                labor_hours=service_data["labor_hours"]
            )
            db.add(service)

    # Parts Categories and Parts
    part_categories_data = [
        {
            "name": "Engine Parts",
            "parts": [
                {"name": "Engine Oil", "unit_price": 800, "part_number": "EO001"},
                {"name": "Oil Filter", "unit_price": 300, "part_number": "OF001"},
                {"name": "Air Filter", "unit_price": 400, "part_number": "AF001"},
                {"name": "Spark Plug", "unit_price": 150, "part_number": "SP001"},
                {"name": "Timing Belt", "unit_price": 2500, "part_number": "TB001"},
                {"name": "Water Pump", "unit_price": 3500, "part_number": "WP001"},
                {"name": "Thermostat", "unit_price": 800, "part_number": "TH001"},
                {"name": "Fuel Pump", "unit_price": 4500, "part_number": "FP001"},
                {"name": "Injector", "unit_price": 3000, "part_number": "INJ001"},
                {"name": "Piston Ring", "unit_price": 1500, "part_number": "PR001"},
            ]
        },
        {
            "name": "Brake Parts",
            "parts": [
                {"name": "Brake Pad Set", "unit_price": 1800, "part_number": "BP001"},
                {"name": "Brake Disc", "unit_price": 2500, "part_number": "BD001"},
                {"name": "Brake Fluid", "unit_price": 300, "part_number": "BF001"},
                {"name": "Brake Shoe", "unit_price": 1200, "part_number": "BS001"},
                {"name": "Brake Caliper", "unit_price": 3500, "part_number": "BC001"},
                {"name": "Master Cylinder", "unit_price": 2800, "part_number": "MC001"},
                {"name": "Brake Hose", "unit_price": 800, "part_number": "BH001"},
            ]
        },
        {
            "name": "Electrical Parts",
            "parts": [
                {"name": "Car Battery", "unit_price": 4500, "part_number": "CB001"},
                {"name": "Alternator", "unit_price": 8000, "part_number": "ALT001"},
                {"name": "Starter Motor", "unit_price": 6500, "part_number": "SM001"},
                {"name": "Headlight Bulb", "unit_price": 500, "part_number": "HB001"},
                {"name": "Tail Light Bulb", "unit_price": 200, "part_number": "TLB001"},
                {"name": "Fuse Set", "unit_price": 300, "part_number": "FS001"},
                {"name": "Relay", "unit_price": 150, "part_number": "REL001"},
                {"name": "Wiring Harness", "unit_price": 2000, "part_number": "WH001"},
            ]
        }
    ]

    for category_data in part_categories_data:
        category = PartCategory(name=category_data["name"])
        db.add(category)
        db.flush()

        for part_data in category_data["parts"]:
            part = Part(
                category_id=category.id,
                name=part_data["name"],
                part_number=part_data["part_number"],
                unit_price=part_data["unit_price"],
                stock_quantity=50  # Default stock
            )
            db.add(part)

    db.commit()
    print("Sample data initialized successfully!")