@echo off
title Invoice Software - Frontend
color 0B

echo.
echo ============================================
echo   Invoice Software - Frontend Starting...
echo ============================================
echo.

cd /d "%~dp0frontend"

echo [1/2] Installing / checking dependencies...
npm install --silent 2>nul
echo       Done.

echo [2/2] Starting Vite dev server...
echo.
echo   Frontend URL : http://localhost:3002
echo   Backend API  : http://localhost:8000
echo.
echo   Make sure backend is running first!
echo   Press Ctrl+C to stop.
echo.

npm run dev

pause