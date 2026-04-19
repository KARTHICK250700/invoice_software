@echo off
title Invoice Software - Launcher
color 0A

echo.
echo ============================================================
echo        Om Murugan Car Service Center
echo        Invoice Software - Full Stack Launcher
echo ============================================================
echo.
echo   This will start:
echo     1. Backend  (FastAPI)  → http://localhost:8000
echo     2. Frontend (React)    → http://localhost:3002
echo.
echo   IMPORTANT: Make sure MySQL is running first!
echo.
pause

:: Start backend in a new window
start "Backend - Port 8000" cmd /k "cd /d "%~dp0backend" && pip install -r requirements.txt -q 2>nul && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait 4 seconds for backend to initialize
timeout /t 4 /nobreak >nul

:: Start frontend in a new window
start "Frontend - Port 3002" cmd /k "cd /d "%~dp0frontend" && npm install --silent 2>nul && npm run dev"

:: Wait 3 seconds then open browser
timeout /t 3 /nobreak >nul
start http://localhost:3002

echo.
echo   Both servers started in separate windows.
echo   Browser opening at http://localhost:3002
echo.
echo   To stop: Close both terminal windows.
echo.
pause
