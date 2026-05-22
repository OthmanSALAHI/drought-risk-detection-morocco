# Quick Reference Card

## 🚀 Quick Start (5 minutes)

### Windows (CMD/PowerShell)
```bash
# Terminal 1: Backend
cd web_app\backend
setup_and_run.bat

# Terminal 2: Frontend (after backend is ready)
cd web_app\frontend
npm install
npm run dev
```

### Linux/Mac (Bash)
```bash
# Terminal 1: Backend
cd web_app/backend
chmod +x setup_and_run.sh
./setup_and_run.sh

# Terminal 2: Frontend
cd web_app/frontend
npm install
npm run dev
```

## 📍 URLs

| Component | URL | Purpose |
|-----------|-----|---------|
| Frontend | http://localhost:5173 | Web interface |
| Backend | http://localhost:8000 | API server |
| API Docs (Swagger) | http://localhost:8000/docs | Interactive API testing |
| API Docs (ReDoc) | http://localhost:8000/redoc | API documentation |
| Health Check | http://localhost:8000/health | Backend status |

## 🔌 API Endpoints Quick Reference

### GET /predict
Get drought prediction for a city
```bash
curl "http://localhost:8000/predict?city=Marrakech&month=6&year=2023"
```

### GET /map
Get predictions for all cities
```bash
curl "http://localhost:8000/map?month=6&year=2023"
```

### GET /history
Get historical data for a city
```bash
curl "http://localhost:8000/history?city=Marrakech"
```

### GET /health
Check backend status
```bash
curl http://localhost:8000/health
```

## 📋 Request Parameters

| Parameter | Type | Range | Required |
|-----------|------|-------|----------|
| city | string | Any Moroccan city | Yes |
| month | integer | 1-12 | Yes |
| year | integer | 2000-2100 | Yes |

## ✅ Response Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful prediction |
| 400 | Bad Request | Invalid parameters |
| 503 | Unavailable | Models not loaded |
| 500 | Server Error | Unexpected error |

## 🛠️ Common Commands

### Environment
```bash
# Activate conda environment
conda activate deep_env

# Check Python version
python --version

# List installed packages
pip list
```

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python main.py

# Run on different port
uvicorn main:app --port 8001

# Debug mode
python main.py 2>&1 | grep ERROR

# Check configuration
python config.py
```

### Frontend
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview build
npm run preview
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
netstat -an | findstr 8000  # Windows
lsof -i :8000               # Mac/Linux

# Kill process on port 8000
taskkill /PID <PID> /F      # Windows
kill -9 <PID>               # Mac/Linux
```

### Models not found
```bash
# Verify model files exist
ls web_app/backend/models/
# Should show:
# - drought_model.pkl
# - city_encoder.pkl

# Check file size
ls -lh web_app/backend/models/
```

### CORS errors
```bash
# Ensure both are running:
# - Backend on localhost:8000
# - Frontend on localhost:5173

# Check /health endpoint
curl http://localhost:8000/health
```

### Conda environment issues
```bash
# Recreate environment
conda remove --name deep_env --all
conda create -n deep_env python=3.10

# Or activate existing
conda activate deep_env
```

## 📊 Testing Predictions

### Available Cities (as of setup)
Marrakech, Casablanca, Fès, Tangier, Agadir, Errachidia, Ouarzazate, Laayoune, Dakhla, and more...

### Available Years
2000 - 2024 (historical data)

### Available Months
1-12 (January-December)

### Example Test Requests
```bash
# Test 1: Spring prediction
curl "http://localhost:8000/predict?city=Marrakech&month=4&year=2023"

# Test 2: Summer prediction
curl "http://localhost:8000/predict?city=Casablanca&month=7&year=2023"

# Test 3: Winter prediction
curl "http://localhost:8000/predict?city=Fès&month=1&year=2023"

# Test 4: Get all cities prediction
curl "http://localhost:8000/map?month=6&year=2023"

# Test 5: Historical data
curl "http://localhost:8000/history?city=Marrakech"
```

## 📁 Important File Locations

```
web_app/
├── backend/
│   ├── main.py              ← FastAPI app
│   ├── config.py            ← Settings
│   ├── requirements.txt      ← Dependencies
│   └── README.md            ← Backend docs
├── frontend/
│   ├── src/services/api.ts  ← API client
│   └── package.json         ← Node dependencies
    └── models/
        ├── drought_model.pkl    ← ML model
        └── city_encoder.pkl     ← Encoder
```

## 🚦 Status Indicators

```
✅ Backend ready       - GET /health returns 200
✅ API responding      - Can access /predict endpoint
✅ Frontend connected  - No CORS errors in console
✅ Predictions working - Getting valid predictions
✅ Model loaded        - drought_probability field exists
```

## 📞 Error Messages Quick Fix

| Error | Solution |
|-------|----------|
| "Connection refused" | Start backend: `python main.py` |
| "City not found" | Check spelling, use `/health` to see available |
| "No data available" | Use year 2000-2024 |
| "Models not available" | Check `web_app/backend/models/` has `.pkl` files |
| "CORS error" | Ensure backend on :8000, frontend on :5173 |
| "Port in use" | Kill existing process or use different port |

## 🎯 Development Workflow

1. **Start Backend**
   ```bash
   cd web_app/backend
   python main.py
   ```

2. **Start Frontend** (new terminal)
   ```bash
   cd web_app/frontend
   npm run dev
   ```

3. **Access Application**
   - Open http://localhost:5173

4. **Test API**
   - Visit http://localhost:8000/docs

5. **Make Changes**
   - Backend: Edit `main.py`, server auto-reloads
   - Frontend: Edit `.tsx` files, browser auto-refreshes

6. **View Logs**
   - Backend: Terminal 1
   - Frontend: Terminal 2

## 🔄 Restart Services

```bash
# Kill all Python processes
pkill -f "python main.py"

# Kill all node processes
pkill -f "node"

# Or just close terminals and restart
```

## 📈 Performance Check

```bash
# Single prediction (should be ~100ms)
time curl "http://localhost:8000/predict?city=Marrakech&month=6&year=2023"

# Map data (should be ~1-2 seconds)
time curl "http://localhost:8000/map?month=6&year=2023"

# History (should be ~2-5 seconds)
time curl "http://localhost:8000/history?city=Marrakech"
```

## 🔐 Security Notes

- Never commit API keys or secrets
- CORS limited to localhost (development)
- Validate all user input (already implemented)
- Use HTTPS in production
- Implement rate limiting for production

## 📚 Documentation Files

| File | Contains |
|------|----------|
| `docs/SETUP_COMPLETE.md` | Complete setup guide |
| `docs/BACKEND_IMPLEMENTATION.md` | What was built |
| `web_app/backend/README.md` | API documentation |
| `web_app/backend/ERROR_HANDLING.md` | Error reference |
| `web_app/backend/config.py` | Configuration guide |

## 💾 Backup Important Files

```bash
# Models (critical)
cp web_app/backend/models/ backup/models/

# Data files
cp data/*.csv backup/

# Configuration
cp web_app/backend/config.py backup/
```

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: Production Ready ✅
