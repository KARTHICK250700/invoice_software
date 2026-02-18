@echo off
echo Starting Car Service Center Application...
echo.

echo 1. Starting Backend Server...
start "Backend Server" cmd /k "cd backend && py -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo 2. Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo 3. Starting Frontend Development Server...
start "Frontend Server" cmd /k "cd frontend  && npm run dev"

echo 4. Opening Browser...
timeout /t 8 /nobreak >nul
start http://localhost:5173

echo.
echo ✅ Car Service Center Application Started!
echo.
echo Backend API: http://localhost:8000
echo Frontend UI: http://localhost:5173
echo Admin Login: admin / Avan@123
echo.
echo Press any key to continue...
pause >nul