@echo off
title Invoice Software - Backend
color 0A

echo.
echo ============================================
echo   Invoice Software - Backend Starting...
echo ============================================
echo.

cd /d "%~dp0backend"

echo [1/3] Installing / checking dependencies...
pip install -r requirements.txt -q 2>nul
echo       Done.

echo [2/3] Checking MySQL...
python -c "from app.db.session import engine; conn=engine.connect(); conn.close(); print('       MySQL OK - Connected')" 2>nul
if errorlevel 1 (
    color 0E
    echo       WARNING: MySQL may not be running.
    echo       Please start MySQL from Services or XAMPP panel first.
    echo.
    pause
)

echo [3/3] Starting FastAPI server...
echo.
echo   Backend URL  : http://localhost:8000
echo   API Docs     : http://localhost:8000/docs
echo   Health Check : http://localhost:8000/health
echo   Log Files    : backend\logs\app.log   (all logs)
echo                  backend\logs\errors.log (errors only)
echo.
echo   On first start: DB columns auto-added (startup migration)
echo   Press Ctrl+C to stop.
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause