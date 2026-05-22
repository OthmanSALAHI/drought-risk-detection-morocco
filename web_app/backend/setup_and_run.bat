@echo off
REM Windows Setup and Run Script for Drought Prediction Backend

echo ================================================
echo Drought Prediction Backend - Setup & Run
echo ================================================
echo.

REM Check if conda is installed
conda --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Conda not found. Please install Conda/Anaconda first.
    pause
    exit /b 1
)

echo [INFO] Conda found!
echo.

REM Ask user if they want to create the environment or use existing
echo Do you have 'deep_env' conda environment created?
echo 1. Use existing 'deep_env'
echo 2. Create new 'deep_env'
echo.
set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="2" (
    echo.
    echo [INFO] Creating new conda environment 'deep_env'...
    call conda create -n deep_env python=3.10 -y
    if errorlevel 1 (
        echo [ERROR] Failed to create conda environment
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Activating deep_env...
call conda activate deep_env

echo [INFO] Environment: %CONDA_DEFAULT_ENV%
echo.

REM Install requirements
echo [INFO] Installing dependencies from requirements.txt...
cd /d "%~dp0"
pip install -r requirements.txt

if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ================================================
echo [SUCCESS] Setup complete!
echo ================================================
echo.
echo Starting server on http://localhost:8000
echo.
echo API Documentation:
echo   - Swagger UI: http://localhost:8000/docs
echo   - ReDoc: http://localhost:8000/redoc
echo   - Health check: http://localhost:8000/health
echo.
echo Press Ctrl+C to stop the server
echo ================================================
echo.

REM Start the server
python main.py
