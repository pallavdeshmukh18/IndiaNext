@echo off
REM IndiaNext Full Stack Setup Script for Windows
REM This script sets up and runs the entire IndiaNext platform

setlocal enabledelayedexpansion

echo.
echo 🚀 IndiaNext Full Stack Setup
echo ==============================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION%

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed. Please install npm
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo ✓ npm %NPM_VERSION%

REM Check Python (optional)
where python3 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    where python >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo ⚠ Python is not installed. Some features may not work
    ) else (
        for /f "tokens=*" %%i in ('python --version') do echo ✓ %%i
    )
) else (
    for /f "tokens=*" %%i in ('python3 --version') do echo ✓ %%i
)

REM Check Docker (optional)
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠ Docker is not installed. You can install it to use docker-compose up
) else (
    for /f "tokens=*" %%i in ('docker --version') do echo ✓ %%i
)

echo.
echo Setting up directories...

REM Verify directory structure
if not exist "backend" (
    echo ❌ backend directory not found
    exit /b 1
)

if not exist "frontend" (
    echo ❌ frontend directory not found
    exit /b 1
)

mkdir logs >nul 2>&1
echo ✓ Directories verified

echo.
echo Installing dependencies...

REM Install backend dependencies
cd backend
echo Installing backend dependencies...
call npm install
cd ..
echo ✓ Backend dependencies installed

REM Install frontend dependencies
cd frontend
echo Installing frontend dependencies...
call npm install
cd ..
echo ✓ Frontend dependencies installed

echo.
echo Checking environment files...

REM Check backend .env
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
        echo ⚠ Created backend\.env from .env.example - Please fill in your credentials
    ) else (
        echo ⚠ Please create backend\.env with your configuration
    )
)
echo ✓ Backend .env exists

REM Check frontend .env
if not exist "frontend\.env" (
    if exist "frontend\.env.example" (
        copy "frontend\.env.example" "frontend\.env" >nul
    )
)
echo ✓ Frontend .env exists

echo.
echo ==============================
echo Setup Complete! 🎉
echo ==============================
echo.

echo Next steps:
echo.
echo Option 1: Run with npm (3 terminals needed^):
echo   Terminal 1: cd backend ^&^& npm run dev
echo   Terminal 2: cd frontend ^&^& npm run dev
echo   Terminal 3: Wait for servers to start
echo.
echo Option 2: Run with Docker Compose (Recommended^):
echo   docker-compose up
echo.
echo Then open http://localhost:5173 in your browser
echo.
echo Important:
echo 1. Update backend\.env with your MongoDB URI
echo 2. Update backend\.env with your Hugging Face API token (if using HF API mode^)
echo 3. Ensure MongoDB is running (locally or via Atlas^)
echo.
echo For more details, see INTEGRATION_GUIDE.md
echo.

pause
