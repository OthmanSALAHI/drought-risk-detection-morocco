#!/bin/bash
# Linux/Mac development server startup script
# Run from project root: ./run-dev.sh

echo "================================================"
echo "Drought Prediction - Development Server"
echo "================================================"
echo ""

# Configuration
BACKEND_DIR="web_app/backend"
FRONTEND_DIR="web_app/frontend"
CONDA_ENV="deep_env"

# Check if running from correct directory
if [ ! -d "$BACKEND_DIR" ]; then
    echo "ERROR: Must run from project root directory"
    exit 1
fi

# Start backend in background
echo "[1/2] Starting Backend Server..."
(cd "$BACKEND_DIR" && conda run -n "$CONDA_ENV" python main.py) &
BACKEND_PID=$!

if [ -z "$BACKEND_PID" ]; then
    echo "ERROR: Failed to start backend"
    exit 1
fi

echo "✓ Backend started (PID: $BACKEND_PID)"
echo ""

# Wait for backend to be ready
echo "[2/2] Waiting for backend to be ready..."
MAX_WAIT=30
WAITED=0
BACKEND_READY=0

while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        BACKEND_READY=1
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done

if [ $BACKEND_READY -eq 0 ]; then
    echo "ERROR: Backend failed to start"
    kill $BACKEND_PID
    exit 1
fi

echo "✓ Backend is ready at http://localhost:8000"
echo ""

# Start frontend
echo "[3/3] Starting Frontend Server..."
echo ""

cd "$FRONTEND_DIR"
npm run dev

# Cleanup
echo ""
echo "Shutting down backend..."
kill $BACKEND_PID

echo ""
echo "================================================"
echo "Development servers stopped"
echo "================================================"
