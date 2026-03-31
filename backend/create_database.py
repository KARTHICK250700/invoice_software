#!/usr/bin/env python3
"""
Script to create the MySQL database for the invoice software
"""
import pymysql
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env")

def create_database():
    """Create the car_service_center database"""
    try:
        # Connect to MySQL server (without database)
        connection = pymysql.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            port=int(os.getenv("MYSQL_PORT", 3306)),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", "root"),
            charset='utf8mb4'
        )

        cursor = connection.cursor()

        # Create database
        database_name = os.getenv("MYSQL_DATABASE", "car_service_center")
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {database_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")

        print(f"SUCCESS: Database '{database_name}' created successfully!")

        # Show databases to confirm
        cursor.execute("SHOW DATABASES")
        databases = cursor.fetchall()
        print("\nAvailable databases:")
        for db in databases:
            print(f"  - {db[0]}")

        cursor.close()
        connection.close()

    except Exception as e:
        print(f"ERROR creating database: {e}")
        return False

    return True

if __name__ == "__main__":
    print("Creating MySQL database...")
    if create_database():
        print("\nSUCCESS: Database setup complete! You can now run the backend server.")
    else:
        print("\nERROR: Database setup failed!")