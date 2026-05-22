# Drought Prediction Backend API

FastAPI backend for drought prediction in Moroccan cities.

## Setup Instructions

### 1. Navigate to Backend Directory

```bash
cd web_app/backend
```

### 2. Create and Activate Conda Environment

If you don't have the conda environment yet:
```bash
conda create -n deep_env python=3.10
conda activate deep_env
```

Or activate existing environment:
```bash
conda activate deep_env
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Backend Server

```bash
python main.py
```

The API will start at `http://localhost:8000`

## API Endpoints

### Health Check
- **GET** `/health` - Check if the API is healthy and models are loaded

### Predictions
- **GET** `/predict` - Get drought prediction for a city
  - Query params: `city` (string), `month` (1-12), `year` (2000-2100)
  - Returns: `PredictionResponse` with prediction, probabilities, and climate data

### Map Data
- **GET** `/map` - Get predictions for all cities in a month/year
  - Query params: `month` (1-12), `year` (2000-2100)
  - Returns: `MapResponse` with all cities and their predictions

### History
- **GET** `/history` - Get historical drought data for a city
  - Query params: `city` (string)
  - Returns: `HistoryResponse` with time-series drought predictions

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Response Format

### PredictionResponse
```json
{
  "city": "Marrakech",
  "month": 6,
  "year": 2023,
  "prediction": "Drought",
  "drought_probability": 75.5,
  "no_drought_probability": 24.5,
  "climate_data": {
    "precipitation": 5.2,
    "temperature": 28.5,
    "et0": 150.3,
    "water_balance": -145.1,
    "spi": -0.82
  },
  "last_6_months": [
    {"month": "Jan", "precipitation": 12.3},
    {"month": "Feb", "precipitation": 8.5}
  ]
}
```

## Error Handling

The API provides detailed error responses:

### 400 Bad Request
- Invalid city name
- No data available for the specified month/year
- Invalid month or year range

### 503 Service Unavailable
- Models not loaded
- Required data files not found

### 500 Internal Server Error
- Prediction model errors
- Unexpected exceptions

## Troubleshooting

### Models not found
Ensure the model files exist at:
- `web_app/backend/models/drought_model.pkl`
- `web_app/backend/models/city_encoder.pkl`

### Data files not found
Ensure these files are in the project `data/` directory:
- `data/morocco_climate_features.csv`
- `data/moroccan_cities.csv`

### CORS errors
The API is configured to accept requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:8080`

## Development

### Run with auto-reload
```bash
python main.py
```

### Run on different port
```bash
uvicorn main:app --host 0.0.0.0 --port 8001
```

## Performance Notes

- Model inference is fast (< 100ms per prediction)
- Map endpoint predicts all cities (multiple cities, may take 1-2 seconds)
- History endpoint processes entire time series for a city (may take 2-5 seconds)
