#!/usr/bin/env python3
"""
Invoice Software - Centralized Logging System
Complete logging for Backend, Database, and API operations
"""

import logging
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional
import json
import traceback
from functools import wraps
import time

# Create logs directory
LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

class InvoiceLogger:
    """Enhanced Logger for Invoice Software"""

    def __init__(self, name: str = "invoice_software"):
        self.name = name
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)
        self.logger.handlers.clear()

        # Create formatters
        self.detailed_formatter = logging.Formatter(
            '%(asctime)s | %(levelname)-8s | %(name)s | %(module)s.%(funcName)s:%(lineno)d | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

        self.simple_formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s: %(message)s',
            datefmt='%H:%M:%S'
        )

        self._setup_handlers()

    def _setup_handlers(self):
        """Setup different log handlers"""
        today = datetime.now().strftime("%Y-%m-%d")

        # Console Handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(self.simple_formatter)
        self.logger.addHandler(console_handler)

        # All logs file
        all_logs_file = os.path.join(LOGS_DIR, f"invoice_software_{today}.log")
        file_handler = logging.FileHandler(all_logs_file, encoding='utf-8')
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(self.detailed_formatter)
        self.logger.addHandler(file_handler)

        # Error logs file
        error_file = os.path.join(LOGS_DIR, f"errors_{today}.log")
        error_handler = logging.FileHandler(error_file, encoding='utf-8')
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(self.detailed_formatter)
        self.logger.addHandler(error_handler)

    def info(self, message: str, extra_data: Dict = None):
        """Log info message"""
        self._log(logging.INFO, message, extra_data)

    def error(self, message: str, error: Exception = None, extra_data: Dict = None):
        """Log error message"""
        if error:
            message += f" | Error: {str(error)}"
            if extra_data is None:
                extra_data = {}
            extra_data['traceback'] = traceback.format_exc()
        self._log(logging.ERROR, message, extra_data)

    def warning(self, message: str, extra_data: Dict = None):
        """Log warning message"""
        self._log(logging.WARNING, message, extra_data)

    def debug(self, message: str, extra_data: Dict = None):
        """Log debug message"""
        self._log(logging.DEBUG, message, extra_data)

    def _log(self, level: int, message: str, extra_data: Dict = None):
        """Internal logging method"""
        if extra_data:
            message += f" | Data: {json.dumps(extra_data, default=str, ensure_ascii=False)}"
        self.logger.log(level, message)

    def log_api_request(self, method: str, path: str, status_code: int = 200,
                       response_time: float = None, request_data: Dict = None):
        """Log API request"""
        log_data = {
            "method": method,
            "path": path,
            "status_code": status_code,
            "response_time": f"{response_time:.3f}s" if response_time else None,
            "timestamp": datetime.now().isoformat()
        }

        if request_data:
            log_data["request_data"] = request_data

        message = f"API {method} {path} - {status_code}"
        if response_time:
            message += f" ({response_time:.3f}s)"

        self.info(f"API_REQUEST: {message}", log_data)

    def log_database_operation(self, operation: str, table: str, record_id: str = None,
                              affected_rows: int = None, execution_time: float = None):
        """Log database operation"""
        log_data = {
            "operation": operation,
            "table": table,
            "record_id": record_id,
            "affected_rows": affected_rows,
            "execution_time": f"{execution_time:.3f}s" if execution_time else None,
            "timestamp": datetime.now().isoformat()
        }

        message = f"DB {operation.upper()} on {table}"
        if record_id:
            message += f" (ID: {record_id})"
        if execution_time:
            message += f" ({execution_time:.3f}s)"

        self.info(f"DATABASE: {message}", log_data)

# Global logger instance
logger = InvoiceLogger()

# API logging decorator
def log_api_endpoint(func):
    """Decorator for API endpoint logging"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()

        # Extract request info
        method = getattr(args[0] if args else None, 'method', 'UNKNOWN')
        path = getattr(args[0] if args else None, 'path', 'unknown')

        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            status_code = getattr(result, 'status_code', 200)

            logger.log_api_request(method, path, status_code, execution_time)
            return result

        except Exception as e:
            execution_time = time.time() - start_time
            logger.log_api_request(method, path, 500, execution_time)
            logger.error(f"API Error: {method} {path}", e)
            raise

    return wrapper

# Database logging functions
def log_client_operation(operation: str, client_id: str = None, details: Dict = None):
    """Log client operations"""
    logger.log_database_operation(operation, "clients", client_id)
    if details:
        logger.info(f"CLIENT_{operation.upper()}: {details}")

def log_vehicle_operation(operation: str, vehicle_id: str = None, details: Dict = None):
    """Log vehicle operations"""
    logger.log_database_operation(operation, "vehicles", vehicle_id)
    if details:
        logger.info(f"VEHICLE_{operation.upper()}: {details}")

def log_invoice_operation(operation: str, invoice_id: str = None, details: Dict = None):
    """Log invoice operations"""
    logger.log_database_operation(operation, "invoices", invoice_id)
    if details:
        logger.info(f"INVOICE_{operation.upper()}: {details}")

def log_quotation_operation(operation: str, quotation_id: str = None, details: Dict = None):
    """Log quotation operations"""
    logger.log_database_operation(operation, "quotations", quotation_id)
    if details:
        logger.info(f"QUOTATION_{operation.upper()}: {details}")

# Initialize logging system
logger.info("Invoice Software Logging System Initialized", {
    "logs_directory": LOGS_DIR,
    "timestamp": datetime.now().isoformat()
})