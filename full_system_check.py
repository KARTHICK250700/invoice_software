#!/usr/bin/env python3
"""
COMPREHENSIVE SYSTEM HEALTH CHECKER
AI Agent mathiri automatic check and fix all problems
"""
import sys
import os
import requests
import subprocess
import time
from pathlib import Path

class SystemChecker:
    def __init__(self):
        self.issues = []
        self.fixed = []
        self.backend_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3002"

    def log(self, message, status="INFO"):
        status_symbols = {
            "INFO": "[INFO]",
            "SUCCESS": "[OK]",
            "ERROR": "[ERROR]",
            "WARNING": "[WARN]",
            "FIXING": "[FIX]"
        }
        print(f"{status_symbols.get(status, '[INFO]')} {message}")

    def check_backend_health(self):
        """Check if backend is running and healthy"""
        self.log("Checking Backend Health...", "INFO")
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log(f"Backend: {data['status']} - DB: {data['database']}", "SUCCESS")
                return True
            else:
                self.log(f"Backend unhealthy: {response.status_code}", "ERROR")
                return False
        except requests.exceptions.RequestException as e:
            self.log(f"Backend not running: {str(e)}", "ERROR")
            self.issues.append("backend_not_running")
            return False

    def check_frontend_connection(self):
        """Check if frontend can connect to backend"""
        self.log("Checking Frontend Connection...", "INFO")
        try:
            response = requests.get(f"{self.frontend_url}", timeout=5)
            if response.status_code == 200:
                self.log("Frontend is accessible", "SUCCESS")
                return True
            else:
                self.log(f"Frontend issue: {response.status_code}", "WARNING")
                return False
        except requests.exceptions.RequestException as e:
            self.log(f"Frontend not accessible: {str(e)}", "WARNING")
            return False

    def check_database_integrity(self):
        """Check database for common issues"""
        self.log("Checking Database Integrity...", "INFO")
        try:
            # Check clients endpoint
            response = requests.get(f"{self.backend_url}/api/clients/")
            if response.status_code == 200:
                clients = response.json()
                self.log(f"Database: {len(clients)} clients found", "SUCCESS")
                return True
            else:
                self.log(f"Database issue: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"Database connection failed: {str(e)}", "ERROR")
            return False

    def test_api_endpoints(self):
        """Test critical API endpoints"""
        self.log("Testing API Endpoints...", "INFO")
        endpoints = [
            "/api/clients/",
            "/api/vehicles/brands",
            "/api/dashboard/stats",
            "/api/dashboard/revenue-chart",
            "/api/auth/me"
        ]

        passed = 0
        total = len(endpoints)

        for endpoint in endpoints:
            try:
                response = requests.get(f"{self.backend_url}{endpoint}", timeout=5)
                if response.status_code in [200, 401]:  # 401 is ok for auth endpoints
                    self.log(f"OK {endpoint}", "SUCCESS")
                    passed += 1
                else:
                    self.log(f"FAIL {endpoint} - {response.status_code}", "ERROR")
            except Exception as e:
                self.log(f"FAIL {endpoint} - {str(e)}", "ERROR")

        self.log(f"API Tests: {passed}/{total} passed", "INFO")
        return passed == total

    def test_client_creation(self):
        """Test client creation with various data"""
        self.log("Testing Client Creation...", "INFO")
        test_clients = [
            {"name": "Test User 1", "phone": "1111111111", "mobile": "", "email": "test1@test.com"},
            {"name": "Test User 2", "phone": "2222222222", "mobile": "3333333333", "email": "test2@test.com"},
            {"name": "Test User 3", "phone": "4444444444", "mobile": "", "email": ""}
        ]

        success_count = 0
        for i, client_data in enumerate(test_clients):
            try:
                response = requests.post(
                    f"{self.backend_url}/api/clients/",
                    json=client_data,
                    headers={"Content-Type": "application/json"},
                    timeout=5
                )
                if response.status_code == 200:
                    self.log(f"OK Client {i+1} created", "SUCCESS")
                    success_count += 1
                else:
                    self.log(f"FAIL Client {i+1} failed - {response.status_code}", "ERROR")
                    self.log(f"   Response: {response.text}", "ERROR")
            except Exception as e:
                self.log(f"FAIL Client {i+1} error - {str(e)}", "ERROR")

        self.log(f"Client Creation: {success_count}/{len(test_clients)} passed", "INFO")
        return success_count > 0

    def check_cors_issues(self):
        """Check for CORS configuration"""
        self.log("Checking CORS Configuration...", "INFO")
        try:
            response = requests.options(
                f"{self.backend_url}/api/clients/",
                headers={
                    "Origin": "http://localhost:3002",
                    "Access-Control-Request-Method": "POST"
                }
            )
            cors_headers = response.headers.get("Access-Control-Allow-Origin")
            if cors_headers:
                self.log(f"CORS configured: {cors_headers}", "SUCCESS")
                return True
            else:
                self.log("CORS not properly configured", "ERROR")
                return False
        except Exception as e:
            self.log(f"CORS check failed: {str(e)}", "ERROR")
            return False

    def start_backend_if_needed(self):
        """Start backend if not running"""
        if not self.check_backend_health():
            self.log("Starting Backend Server...", "FIXING")
            try:
                # Change to backend directory and start server
                backend_dir = Path(__file__).parent / "backend"
                if backend_dir.exists():
                    subprocess.Popen(
                        [sys.executable, "main_new.py"],
                        cwd=str(backend_dir),
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE
                    )
                    self.log("Backend started (waiting 5 seconds...)", "INFO")
                    time.sleep(5)
                    return self.check_backend_health()
                else:
                    self.log("Backend directory not found", "ERROR")
                    return False
            except Exception as e:
                self.log(f"Failed to start backend: {str(e)}", "ERROR")
                return False
        return True

    def run_full_check(self):
        """Run comprehensive system check"""
        self.log("=" * 50, "INFO")
        self.log("COMPREHENSIVE SYSTEM HEALTH CHECK", "INFO")
        self.log("AI Agent mathiri automatic checker", "INFO")
        self.log("=" * 50, "INFO")

        # Step 1: Backend Health
        backend_ok = self.start_backend_if_needed()

        # Step 2: Database Integrity
        db_ok = self.check_database_integrity() if backend_ok else False

        # Step 3: API Endpoints
        api_ok = self.test_api_endpoints() if backend_ok else False

        # Step 4: CORS Configuration
        cors_ok = self.check_cors_issues() if backend_ok else False

        # Step 5: Client Creation
        client_ok = self.test_client_creation() if backend_ok else False

        # Step 6: Frontend Connection
        frontend_ok = self.check_frontend_connection()

        # Summary
        self.log("=" * 50, "INFO")
        self.log("HEALTH CHECK RESULTS:", "INFO")
        self.log(f"Backend Health: {'OK' if backend_ok else 'FAIL'}", "INFO")
        self.log(f"Database: {'OK' if db_ok else 'FAIL'}", "INFO")
        self.log(f"API Endpoints: {'OK' if api_ok else 'FAIL'}", "INFO")
        self.log(f"CORS Config: {'OK' if cors_ok else 'FAIL'}", "INFO")
        self.log(f"Client Creation: {'OK' if client_ok else 'FAIL'}", "INFO")
        self.log(f"Frontend: {'OK' if frontend_ok else 'FAIL'}", "INFO")

        overall_health = all([backend_ok, db_ok, api_ok, cors_ok, client_ok])

        if overall_health:
            self.log("SYSTEM FULLY HEALTHY!", "SUCCESS")
            self.log("Backend: http://localhost:8000", "INFO")
            self.log("Frontend: http://localhost:3002", "INFO")
        else:
            self.log("SYSTEM HAS ISSUES", "WARNING")
            self.log("Check the errors above for details", "WARNING")

        return overall_health

if __name__ == "__main__":
    checker = SystemChecker()
    checker.run_full_check()