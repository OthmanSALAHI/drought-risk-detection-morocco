#!/bin/bash
# Linux/Mac Setup and Run Script for Drought Prediction Backend

echo "================================================"
echo "Drought Prediction Backend - Setup & Run"
echo "================================================"
echo ""

# Check if conda is installed
if ! command -v conda &> /dev/null; then
    echo "[ERROR] Conda not found. Please install Conda/Anaconda first."
    exit 1
fi

echo "[INFO] Conda found!"
echo ""

# Ask user if they want to create the environment or use existing
echo "Do you have 'deep_env' conda environment created?"
echo "1. Use existing 'deep_env'"
echo "2. Create new 'deep_env'"
echo ""
read -p "Enter your choice (1 or 2): " choice

if [ "$choice" = "2" ]; then
    echo ""
    echo "[INFO] Creating new conda environment 'deep_env'..."
    conda create -n deep_env python=3.10 -y
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create conda environment"
        exit 1
    fi
fi

echo ""
echo "[INFO] Activating deep_env..."
eval "$(conda shell.bash hook)"
conda activate deep_env

echo "[INFO] Environment: $CONDA_DEFAULT_ENV"
echo ""

# Install requirements
echo "[INFO] Installing dependencies from requirements.txt..."
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies"
    exit 1
fi

echo ""
echo "================================================"
echo "[SUCCESS] Setup complete!"
echo "================================================"
echo ""
echo "Starting server on http://localhost:8000"
echo ""
echo "API Documentation:"
echo "  - Swagger UI: http://localhost:8000/docs"
echo "  - ReDoc: http://localhost:8000/redoc"
echo "  - Health check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================================"
echo ""

# Start the server
python main.py
