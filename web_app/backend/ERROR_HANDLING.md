# Backend Error Handling & Edge Cases Guide

## Overview
This document outlines all error cases handled by the Drought Prediction API and how to troubleshoot them.

## HTTP Status Codes

### 200 OK
- Request successful
- Prediction completed
- Data returned

### 400 Bad Request
- Invalid city name
- Invalid month/year range
- Missing required parameters
- No data available for the specified date

**Example Response:**
```json
{
  "detail": "City 'InvalidCity' not found. Available cities: Marrakech, Casablanca, ...",
  "status_code": 400,
  "error_code": "HTTP_ERROR"
}
```

### 503 Service Unavailable
- Models not loaded
- Model files missing
- Data files missing

**Example Response:**
```json
{
  "detail": "Models not available",
  "status_code": 503,
  "error_code": "HTTP_ERROR"
}
```

### 500 Internal Server Error
- Prediction model errors
- Unexpected exceptions
- Feature calculation errors

**Example Response:**
```json
{
  "detail": "Internal server error: [error details]",
  "status_code": 500,
  "error_code": "INTERNAL_ERROR"
}
```

## Error Cases & Solutions

### 1. Models Not Found

**Error:**
```
Drought model not found at /path/to/models/drought_model.pkl
```

**Cause:**
- Model files not in the correct directory
- Models weren't trained and saved

**Solution:**
1. Check that models are at `web_app/backend/models/`:
   - `drought_model.pkl`
   - `city_encoder.pkl`

2. If missing, train models using `web_app/backend/train_models.py` or the EDA notebook

3. Verify file permissions (readable)

### 2. Data Files Not Found

**Error:**
```
Features data not found at /path/to/data/morocco_climate_features.csv
```

**Cause:**
- CSV files not in the `data/` directory
- Files were moved or deleted

**Solution:**
1. Verify these files exist in the `data/` directory:
   - `data/morocco_climate_features.csv`
   - `data/moroccan_cities.csv`

2. Check file permissions (readable)

3. Ensure files are not corrupted

### 3. City Not Found

**Error Request:**
```
GET /predict?city=InvalidCity&month=6&year=2023
```

**Error Response:**
```json
{
  "detail": "City 'InvalidCity' not found. Available cities: Marrakech, Casablanca, ...",
  "status_code": 400,
  "error_code": "HTTP_ERROR"
}
```

**Solution:**
1. Check available cities via `/health` endpoint
2. Use correct spelling and capitalization
3. Cities are case-insensitive (e.g., "marrakech" = "Marrakech")

### 4. No Data for Date

**Error Request:**
```
GET /predict?city=Marrakech&month=6&year=2050
```

**Error Response:**
```json
{
  "detail": "No data available for Marrakech in 6/2050",
  "status_code": 400,
  "error_code": "HTTP_ERROR"
}
```

**Solution:**
1. Check available data range (typically 2000-2024)
2. Request dates within available data range
3. Use `/health` to see available data info

### 5. Invalid Month/Year

**Error Request:**
```
GET /predict?city=Marrakech&month=13&year=2023
```

**Error Response:**
```json
{
  "detail": "ensure this value is less than or equal to 12",
  "status_code": 422,
  "error_code": "VALIDATION_ERROR"
}
```

**Solution:**
1. Month must be 1-12
2. Year must be 2000-2100
3. Verify parameters before sending

### 6. Missing Features

**Error:**
```
Missing features: precip_lag1, temp_lag1
```

**Cause:**
- CSV file is corrupted or incomplete
- Features not calculated during preprocessing

**Solution:**
1. Regenerate features using `scripts/preprocess_data.py`
2. Verify CSV integrity
3. Check that preprocessing ran successfully

### 7. Model Prediction Error

**Error:**
```
Prediction error: Model input shape mismatch
```

**Cause:**
- Model expects different feature set
- Data preprocessing mismatch

**Solution:**
1. Verify model was trained with same features
2. Check data preprocessing matches training
3. Retrain model if necessary

### 8. CORS Errors

**Browser Error:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Cause:**
- Frontend running on different port/origin
- CORS not configured for that origin

**Solution:**
1. Check frontend is on allowed origin:
   - `http://localhost:5173` (Vite)
   - `http://localhost:8080`
   - `http://localhost:3000` (CRA)

2. If on different port, add to `CORS_ORIGINS` in `config.py`:
   ```python
   CORS_ORIGINS = [..., "http://localhost:YOUR_PORT"]
   ```

3. Restart backend

### 9. Connection Refused

**Error:**
```
[Errno 111] Connection refused
```

**Cause:**
- Backend not running
- Wrong port
- Firewall blocking

**Solution:**
1. Start backend: `python main.py`
2. Verify runs on `http://localhost:8000`
3. Check no firewall is blocking port 8000
4. Check for port conflicts: `netstat -an | grep 8000`

### 10. Timeout

**Error:**
```
Request timeout after 10000ms
```

**Cause:**
- Backend is slow
- Large dataset processing
- Network issues

**Solution:**
1. Increase timeout in frontend (`api.ts`):
   ```typescript
   timeout: 30000  // 30 seconds
   ```

2. Check backend performance
3. Verify network connectivity

## Common Edge Cases

### Leap Year Month (Feb 29)
- Not supported currently
- Use Feb 28 instead

### Very Old Data (pre-2000)
- Not available in dataset
- Use data from 2000 onwards

### Future Predictions (post-2024)
- No historical data available
- Use most recent available data

### Missing Data Points
- Handled with 0 fill (for NaN features)
- See `fillna(0)` in main.py

### All-Zero Features
- Model will still make prediction
- May indicate data quality issue
- Check source data

## Testing Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### Make Prediction
```bash
curl "http://localhost:8000/predict?city=Marrakech&month=6&year=2023"
```

### Get Map Data
```bash
curl "http://localhost:8000/map?month=6&year=2023"
```

### Get History
```bash
curl "http://localhost:8000/history?city=Marrakech"
```

### API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Logging

Check server logs for detailed error information:

```bash
# View logs (server running in foreground)
python main.py

# Or check saved logs (if configured)
tail -f logs/app.log
```

## Performance Considerations

| Endpoint | Typical Time | Max Time |
|----------|-------------|----------|
| `/predict` | 50-100ms | 500ms |
| `/map` | 800ms-1.2s | 3s |
| `/history` | 2-5s | 10s |
| `/health` | 10-50ms | 100ms |

If endpoints exceed max time, check:
- Server resources (CPU, memory)
- Data file size
- Network latency

## Debugging

### Enable Debug Logging
Set environment variable:
```bash
export API_LOG_LEVEL=DEBUG
python main.py
```

### Check Configuration
```bash
python config.py
```

### Validate Models
```python
import pickle
with open('models/drought_model.pkl', 'rb') as f:
    model = pickle.load(f)
print(model)  # Should print model info
```

### Test Backend Directly
```python
from main import model_manager

# Test model loading
print(model_manager.drought_model)

# Test data loading
print(model_manager.get_available_cities())

# Test prediction
city_data = model_manager.get_city_data('Marrakech', 2023, 6)
print(city_data)
```
