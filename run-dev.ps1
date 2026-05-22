# Written in PowerShell for cross-platform support
# Run from project root: .\run-dev.ps1

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Drought Prediction - Development Server" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$backendDir = "web_app/backend"
$frontendDir = "web_app/frontend"
$condaEnv = "deep_env"

# Check if running from correct directory
if (-not (Test-Path $backendDir)) {
    Write-Host "ERROR: Must run from project root directory" -ForegroundColor Red
    exit 1
}

# Start backend in background job
Write-Host "[1/2] Starting Backend Server..." -ForegroundColor Yellow
$backendJob = Start-Job -WorkingDirectory $backendDir -ScriptBlock {
    conda activate deep_env
    python main.py
} -Name "DroughtBackend"

if ($null -eq $backendJob) {
    Write-Host "ERROR: Failed to start backend" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Backend started (Job ID: $($backendJob.Id))" -ForegroundColor Green
Write-Host ""

# Wait for backend to be ready
Write-Host "[2/2] Waiting for backend to be ready..." -ForegroundColor Yellow
$maxWait = 30
$waited = 0
$backendReady = $false

while ($waited -lt $maxWait) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            break
        }
    }
    catch {
        # Backend not ready yet
    }
    Start-Sleep -Seconds 1
    $waited++
}

if (-not $backendReady) {
    Write-Host "ERROR: Backend failed to start" -ForegroundColor Red
    Stop-Job -Job $backendJob
    exit 1
}

Write-Host "✓ Backend is ready at http://localhost:8000" -ForegroundColor Green
Write-Host ""

# Start frontend
Write-Host "[3/3] Starting Frontend Server..." -ForegroundColor Yellow
Write-Host "Opening new terminal for frontend..." -ForegroundColor Yellow
Write-Host ""

# Build startup command for frontend terminal
$frontendCmd = @"
cd '$frontendDir'
npm run dev
"@

# Open new terminal window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; npm run dev"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✓ SERVERS STARTED SUCCESSFULLY" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Frontend:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔗 Backend:   http://localhost:8000" -ForegroundColor Cyan
Write-Host "📚 API Docs:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend Job ID: $($backendJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop backend: Stop-Job -Id $($backendJob.Id)" -ForegroundColor Gray
Write-Host "To view backend logs: Receive-Job -Id $($backendJob.Id) -Keep" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C in frontend terminal to stop" -ForegroundColor Yellow
Write-Host ""

# Keep script running to monitor backend
while ($true) {
    Start-Sleep -Seconds 60
}
