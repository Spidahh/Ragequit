@echo off
echo ========================================
echo RageQuit Multiplayer Server - Quick Start
echo ========================================
echo.

echo [1/3] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo ✓ Node.js found

echo.
echo [2/3] Installing dependencies...
call npm install

echo.
echo [3/3] Starting server...
echo.
echo Server will start at http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

call npm start
