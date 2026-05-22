# Complete Setup Guide

## Project Structure

```
Drought & Water/
├── web_app/
│   ├── backend/
│   │   ├── main.py                 # FastAPI application
│   │   ├── config.py               # Configuration
│   │   ├── requirements.txt        # Python dependencies
│   │   ├── setup_and_run.bat       # Windows setup script
│   │   ├── setup_and_run.sh        # Linux/Mac setup script
│   │   └── README.md               # Backend documentation
│   ├── frontend/                   # React/TypeScript frontend
│   ├── models/
│   │   ├── drought_model.pkl       # ML Model
│   │   └── city_encoder.pkl        # Label encoder
│   └── ...
├── data files (.csv)
└── ...
```

## Prerequisites

1. **Python 3.10+**
2. **Conda or pip**
3. **Node.js 16+** (for frontend)
4. **Model Files** in `web_app/backend/models/`

## Quick Start

### Option 1: Windows (Recommended)

#### Step 1: Setup Backend

1. Navigate to backend folder:
   ```bash
   cd web_app\backend
   ```

2. Run setup script (will create conda environment and install dependencies):
   ```bash
   setup_and_run.bat
   ```

3. The backend will start on `http://localhost:8000`

4. Keep this terminal open and running

#### Step 2: Setup Frontend

1. Open a **new terminal** in the project root

2. Navigate to frontend:
   ```bash
   cd web_app\frontend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Frontend will be at `http://localhost:5173`

### Option 2: Linux/Mac

#### Step 1: Setup Backend

1. Navigate to backend:
   ```bash
   cd web_app/backend
   ```

2. Run setup script:
   ```bash
   chmod +x setup_and_run.sh
   ./setup_and_run.sh
   ```

3. Backend starts on `http://localhost:8000`

#### Step 2: Setup Frontend

1. Open a new terminal in project root

2. Navigate to frontend:
   ```bash
   cd web_app/frontend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start dev server:
   ```bash
   npm run dev
   ```

### Option 3: Manual Setup

#### Backend Setup

1. Activate conda environment:
   ```bash
   conda activate deep_env
   ```

2. Navigate to backend:
   ```bash
   cd web_app/backend
   ```

3. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```

4. Verify configuration:
   ```bash
   python config.py
   ```

5. Start server:
   ```bash
   python main.py
   ```

#### Frontend Setup

1. Navigate to frontend:
   ```bash
   cd web_app/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start dev server:
   ```bash
   npm run dev
   ```

## Verify Installation

### Check Backend

Visit in browser or curl:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "available_cities": ["Agadir", "Casablanca", ...]
}
```

### Check Frontend

Visit: `http://localhost:5173`

Should see the drought prediction dashboard.

## API Documentation

Once backend is running:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Troubleshooting

### Backend Issues

#### Models Not Found
```
FileNotFoundError: Drought model not found
```
- Ensure model files exist in `web_app/backend/models/`
- Check file paths and permissions

#### Port Already in Use
```
Address already in use
```
- Kill process on port 8000: `lsof -ti:8000 | xargs kill -9` (Mac/Linux)
- Or use different port: `uvicorn main:app --port 8001`

#### CORS Errors
- Ensure backend is running on `localhost:8000`
- Check frontend is on allowed origin (localhost:5173, 3000, 8080)

### Frontend Issues

#### Can't Connect to Backend
- Verify backend is running on `http://localhost:8000`
- Check browser console for errors
- Try `/health` endpoint directly

#### Port 5173 Already in Use
```bash
npm run dev -- --port 5174
```

#### Node Modules Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

## Environment Variables (Optional)

### Backend

Create `.env` file in `web_app/backend/`:

```env
API_HOST=0.0.0.0
API_PORT=8000
API_LOG_LEVEL=info
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend

Create `.env` file in `web_app/frontend/`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Production Deployment

### Backend

1. Install production server:
   ```bash
   pip install gunicorn
   ```

2. Run with Gunicorn:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:8000 main:app
   ```

3. Consider using:
   - Nginx as reverse proxy
   - SSL/TLS certificates
   - Docker containerization
   - Cloud deployment (AWS, Google Cloud, etc.)

### Frontend

1. Build for production:
   ```bash
   npm run build
   ```

2. Serve build folder with web server
3. Configure API_BASE_URL for production

## Docker (Optional)

Create `Dockerfile` in backend:
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
COPY ../models ./models
COPY ../*.csv .

CMD ["python", "main.py"]
```

Build and run:
```bash
docker build -t drought-api .
docker run -p 8000:8000 drought-api
```

## Next Steps

1. ✅ Backend and frontend running
2. 📊 Visit `http://localhost:5173`
3. 🔍 Try predictions in the Predict page
4. 📈 View drought patterns on Map page
5. 📚 Check historical data on History page

## Support

For issues:
1. Check `ERROR_HANDLING.md` in backend folder
2. Review server logs (terminal output)
3. Check browser console (F12)
4. Visit API docs: `http://localhost:8000/docs`

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI application |
| `backend/config.py` | Configuration & validation |
| `backend/requirements.txt` | Python dependencies |
| `frontend/src/services/api.ts` | API client |
| `frontend/src/hooks/usePrediction.ts` | Prediction hook |
| `web_app/backend/models/drought_model.pkl` | ML model |

## Performance Tips

- Backend processes predictions in ~100ms
- Frontend is optimized with React Query patterns
- Large history queries may take 2-5 seconds
- Restart backend if experiencing slowness

Good luck! 🌍
