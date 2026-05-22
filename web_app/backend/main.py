import pickle
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging

from fastapi.responses import JSONResponse

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================
# Pydantic Models for Response
# ============================================

class ClimateData(BaseModel):
    precipitation: float
    temperature: float
    et0: float
    water_balance: float
    spi: float


class MonthData(BaseModel):
    month: str
    precipitation: float


class PredictionResponse(BaseModel):
    city: str
    month: int
    year: int
    prediction: str = Field(..., pattern="^(Drought|No Drought)$")
    drought_probability: float
    no_drought_probability: float
    climate_data: ClimateData
    last_6_months: List[MonthData]


class MapCityData(BaseModel):
    city: str
    lat: float
    lng: float
    prediction: str = Field(..., pattern="^(Drought|No Drought)$")
    drought_probability: float


class MapResponse(BaseModel):
    month: int
    year: int
    cities: List[MapCityData]


class HistoryDataPoint(BaseModel):
    date: str
    spi: float
    precipitation: float
    label: str = Field(..., pattern="^(Drought|No Drought)$")


class HistoryResponse(BaseModel):
    city: str
    data: List[HistoryDataPoint]


class ErrorResponse(BaseModel):
    detail: str
    error_code: str


# ============================================
# Initialize FastAPI App
# ============================================

app = FastAPI(
    title="Drought Prediction API",
    description="API for drought prediction in Moroccan cities",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Return structured JSON for HTTPException with an `error_code` field."""
    # Default error code for HTTP errors; specific handlers can override if needed
    content = {
        "detail": exc.detail if isinstance(exc.detail, (str, dict)) else str(exc.detail),
        "error_code": "HTTP_ERROR"
    }
    return JSONResponse(status_code=exc.status_code, content=content)

# ============================================
# Global State for Models and Data
# ============================================

class ModelManager:
    def __init__(self):
        self.drought_model = None
        self.city_encoder = None
        self.features_df = None
        self.cities_df = None
        self.model_path = os.path.join(os.path.dirname(__file__), 'models')
        self.data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')
        self.min_year = None
        self.max_year = None
        self.load_models()
        self.load_data()

    def load_models(self):
        """Load pickled models"""
        try:
            drought_model_path = os.path.join(self.model_path, 'drought_model.pkl')
            city_encoder_path = os.path.join(self.model_path, 'city_encoder.pkl')

            if not os.path.exists(drought_model_path):
                raise FileNotFoundError(f"Drought model not found at {drought_model_path}")
            if not os.path.exists(city_encoder_path):
                raise FileNotFoundError(f"City encoder not found at {city_encoder_path}")

            with open(drought_model_path, 'rb') as f:
                self.drought_model = pickle.load(f)
            logger.info("✓ Drought model loaded successfully")

            with open(city_encoder_path, 'rb') as f:
                self.city_encoder = pickle.load(f)
            logger.info("✓ City encoder loaded successfully")

        except Exception as e:
            logger.error(f"✗ Error loading models: {str(e)}")
            raise

    def load_data(self):
        """Load feature data and city information"""
        try:
            features_path = os.path.join(self.data_path, 'morocco_climate_features.csv')
            cities_path = os.path.join(self.data_path, 'moroccan_cities.csv')

            if not os.path.exists(features_path):
                raise FileNotFoundError(f"Features data not found at {features_path}")
            if not os.path.exists(cities_path):
                raise FileNotFoundError(f"Cities data not found at {cities_path}")

            self.features_df = pd.read_csv(features_path)
            self.features_df['time'] = pd.to_datetime(self.features_df['time'])
            
            # Get year range from data
            self.min_year = int(self.features_df['time'].dt.year.min())
            self.max_year = int(self.features_df['time'].dt.year.max())
            
            logger.info(f"✓ Features data loaded ({len(self.features_df)} records)")
            logger.info(f"  Data spans from {self.min_year} to {self.max_year}")

            self.cities_df = pd.read_csv(cities_path)
            logger.info(f"✓ Cities data loaded ({len(self.cities_df)} cities)")

        except Exception as e:
            logger.error(f"✗ Error loading data: {str(e)}")
            raise

    def get_available_cities(self) -> List[str]:
        """Get list of available cities"""
        if self.features_df is None:
            return []
        return sorted(self.features_df['city'].unique().tolist())

    def get_city_coordinates(self, city: str) -> Optional[Tuple[float, float]]:
        """Get latitude and longitude for a city"""
        if self.cities_df is None:
            return None
        city_data = self.cities_df[self.cities_df['city'].str.lower() == city.lower()]
        if len(city_data) > 0:
            return (city_data.iloc[0]['lat'], city_data.iloc[0]['lng'])
        return None

    def encode_city(self, city: str) -> int:
        """Encode a city using the loaded encoder artifact."""
        if self.city_encoder is None:
            raise ValueError("City encoder is not loaded")

        if hasattr(self.city_encoder, 'transform'):
            try:
                return int(self.city_encoder.transform([city])[0])
            except Exception:
                pass

        if isinstance(self.city_encoder, np.ndarray):
            matches = np.where(self.city_encoder.astype(str) == city)[0]
            if len(matches) > 0:
                return int(matches[0])

        if isinstance(self.city_encoder, (list, tuple)):
            try:
                return int(list(self.city_encoder).index(city))
            except ValueError:
                pass

        raise ValueError(f"City '{city}' could not be encoded")

    def get_city_data(self, city: str, year: int, month: int) -> Optional[pd.DataFrame]:
        """Get data for a specific city and time period"""
        if self.features_df is None:
            return None

        city_data = self.features_df[
            (self.features_df['city'].str.lower() == city.lower()) &
            (self.features_df['time'].dt.year == year) &
            (self.features_df['time'].dt.month == month)
        ]
        return city_data if len(city_data) > 0 else None

    def get_city_data_or_estimate(self, city: str, year: int, month: int) -> Optional[pd.DataFrame]:
        """Get data for a city/time, falling back to the most recent same-month data for future dates."""
        # Try exact match first
        city_data = self.get_city_data(city, year, month)
        if city_data is not None:
            return city_data

        if self.features_df is None:
            return None

        # Fallback: use the most recent available data for the same city + month
        city_month_data = self.features_df[
            (self.features_df['city'].str.lower() == city.lower()) &
            (self.features_df['time'].dt.month == month)
        ].sort_values('time', ascending=False)

        if len(city_month_data) > 0:
            result = city_month_data.head(1).copy()
            result['time'] = pd.Timestamp(year=year, month=month, day=1)
            return result

        return None

    def get_last_6_months_data(self, city: str, year: int, month: int) -> List[Dict[str, float]]:
        """Get precipitation data for last 6 months"""
        if self.features_df is None:
            return []

        from dateutil.relativedelta import relativedelta

        data = self.features_df[self.features_df['city'].str.lower() == city.lower()].copy()
        data = data.sort_values('time')

        target_date = datetime(year, month, 1)
        last_6_months = []

        for i in range(5, -1, -1):
            check_date = target_date - relativedelta(months=i)
            month_data = data[
                (data['time'].dt.year == check_date.year) &
                (data['time'].dt.month == check_date.month)
            ]
            # Fallback to most recent same-month data if not found
            if len(month_data) == 0:
                month_data = data[
                    data['time'].dt.month == check_date.month
                ].sort_values('time', ascending=False).head(1)

            if len(month_data) > 0:
                month_name = check_date.strftime('%b')
                last_6_months.append({
                    'month': month_name,
                    'precipitation': float(month_data.iloc[0]['precipitation_sum'])
                })

        return last_6_months


FEATURE_COLUMNS = [
    'city_encoded', 'precipitation_sum', 'temperature_2m_mean', 'et0_fao_evapotranspiration',
    'water_balance', 'precip_lag1', 'precip_lag2', 'precip_lag3', 'temp_lag1', 'temp_lag2',
    'temp_lag3', 'precip_rolling3', 'precip_rolling6', 'temp_rolling3', 'et0_rolling3',
    'month', 'season_encoded'
]


# Initialize model manager
try:
    model_manager = ModelManager()
    logger.info("✓ Model manager initialized successfully")
except Exception as e:
    logger.error(f"✗ Failed to initialize model manager: {str(e)}")
    model_manager = None


# ============================================
# Health Check Endpoint
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    if model_manager is None or model_manager.drought_model is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    return {
        "status": "healthy",
        "model_loaded": model_manager.drought_model is not None,
        "available_cities": model_manager.get_available_cities(),
        "data_range": {
            "min_year": model_manager.min_year,
            "max_year": model_manager.max_year
        }
    }


# ============================================
# Prediction Endpoint
# ============================================

@app.get("/predict", response_model=PredictionResponse)
async def predict(
    city: str = Query(..., min_length=1),
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100)
) -> PredictionResponse:
    """
    Predict drought for a specific city, month, and year.

    - **city**: City name (e.g., "Marrakech", "Casablanca")
    - **month**: Month (1-12)
    - **year**: Year (2000-2100)
    """
    try:
        # Validate model manager
        if model_manager is None:
            raise HTTPException(
                status_code=503,
                detail="Models not available"
            )

        # Validate city
        available_cities = model_manager.get_available_cities()
        if city.lower() not in [c.lower() for c in available_cities]:
            raise HTTPException(
                status_code=400,
                detail=f"City '{city}' not found. Available cities: {', '.join(available_cities)}"
            )

        # Validate year range (only reject years before data start)
        if year < model_manager.min_year:
            raise HTTPException(
                status_code=400,
                detail=f"Data not available for year {year}. Earliest available year: {model_manager.min_year}"
            )

        # Get city data for the specified month/year (with fallback for future dates)
        city_data = model_manager.get_city_data_or_estimate(city, year, month)
        if city_data is None or len(city_data) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No data available for {city} in month {month} of year {year}"
            )

        # Extract features for prediction
        features_cols = FEATURE_COLUMNS

        city_encoded = model_manager.encode_city(city)
        city_data = city_data.copy()
        city_data['city_encoded'] = city_encoded

        missing_cols = [col for col in features_cols if col not in city_data.columns]
        if missing_cols:
            raise HTTPException(
                status_code=500,
                detail=f"Missing features: {', '.join(missing_cols)}"
            )

        # Prepare features
        X = city_data[features_cols].fillna(0).values
        if len(X) > 1:
            X = X[0:1]  # Take first record if multiple

        # Make prediction
        try:
            prediction_proba = model_manager.drought_model.predict_proba(X)[0]
            prediction_class = model_manager.drought_model.predict(X)[0]

            # Map prediction class to label (assuming 1 = Drought, 0 = No Drought)
            prediction_label = "Drought" if prediction_class == 1 else "No Drought"
            drought_prob = float(prediction_proba[1]) * 100
            no_drought_prob = float(prediction_proba[0]) * 100

        except Exception as e:
            logger.error(f"Model prediction error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Prediction error: {str(e)}"
            )

        # Get climate data
        climate_data = ClimateData(
            precipitation=float(city_data.iloc[0]['precipitation_sum']),
            temperature=float(city_data.iloc[0]['temperature_2m_mean']),
            et0=float(city_data.iloc[0]['et0_fao_evapotranspiration']),
            water_balance=float(city_data.iloc[0]['water_balance']),
            spi=float(city_data.iloc[0]['SPI'])
        )

        # Get last 6 months data
        last_6_months = model_manager.get_last_6_months_data(city, year, month)

        return PredictionResponse(
            city=city,
            month=month,
            year=year,
            prediction=prediction_label,
            drought_probability=round(drought_prob, 1),
            no_drought_probability=round(no_drought_prob, 1),
            climate_data=climate_data,
            last_6_months=last_6_months
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in predict: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


# ============================================
# Map Data Endpoint (placeholder)
# ============================================

@app.get("/map", response_model=MapResponse)
async def get_map_data(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100)
) -> MapResponse:
    """
    Get drought predictions for all available cities for a specific month/year.
    """
    try:
        if model_manager is None:
            raise HTTPException(status_code=503, detail="Models not available")

        # Validate year range (only reject years before data start)
        if year < model_manager.min_year:
            raise HTTPException(
                status_code=400,
                detail=f"Data not available for year {year}. Earliest available year: {model_manager.min_year}"
            )

        available_cities = model_manager.get_available_cities()
        map_cities = []

        for city in available_cities:
            try:
                # Get prediction for each city (with fallback for future dates)
                city_data = model_manager.get_city_data_or_estimate(city, year, month)
                if city_data is None or len(city_data) == 0:
                    continue

                # Extract features
                features_cols = FEATURE_COLUMNS

                city_encoded = model_manager.encode_city(city)
                city_data = city_data.copy()
                city_data['city_encoded'] = city_encoded

                X = city_data[features_cols].fillna(0).values
                if len(X) > 1:
                    X = X[0:1]

                # Prediction
                prediction_proba = model_manager.drought_model.predict_proba(X)[0]
                prediction_class = model_manager.drought_model.predict(X)[0]
                prediction_label = "Drought" if prediction_class == 1 else "No Drought"
                drought_prob = float(prediction_proba[1]) * 100

                # Get coordinates
                coords = model_manager.get_city_coordinates(city)
                if coords:
                    map_cities.append(MapCityData(
                        city=city,
                        lat=coords[0],
                        lng=coords[1],
                        prediction=prediction_label,
                        drought_probability=round(drought_prob, 1)
                    ))
            except Exception as e:
                logger.warning(f"Error processing {city}: {str(e)}")
                continue

        return MapResponse(month=month, year=year, cities=map_cities)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in map endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# ============================================
# History Endpoint (placeholder)
# ============================================

@app.get("/history", response_model=HistoryResponse)
async def get_history(city: str = Query(..., min_length=1)) -> HistoryResponse:
    """
    Get historical drought data for a city.
    """
    try:
        if model_manager is None:
            raise HTTPException(status_code=503, detail="Models not available")

        available_cities = model_manager.get_available_cities()
        if city.lower() not in [c.lower() for c in available_cities]:
            raise HTTPException(
                status_code=400,
                detail=f"City '{city}' not found. Available cities: {', '.join(available_cities)}"
            )

        # Get all data for the city
        city_data = model_manager.features_df[
            model_manager.features_df['city'].str.lower() == city.lower()
        ].copy().sort_values('time')

        history_data = []
        for _, row in city_data.iterrows():
            # Predict for each historical point
            features_cols = FEATURE_COLUMNS

            row = row.copy()
            row['city_encoded'] = model_manager.encode_city(city)

            X = row[features_cols].fillna(0).values.reshape(1, -1)
            prediction_proba = model_manager.drought_model.predict_proba(X)[0]
            prediction_class = model_manager.drought_model.predict(X)[0]
            label = "Drought" if prediction_class == 1 else "No Drought"

            history_data.append(HistoryDataPoint(
                date=row['time'].strftime('%Y-%m-%d'),
                spi=float(row['SPI']),
                precipitation=float(row['precipitation_sum']),
                label=label
            ))

        return HistoryResponse(city=city, data=history_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in history endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# ============================================
# Error Handlers
# ============================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
            "error_code": "HTTP_ERROR"
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle unexpected exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "status_code": 500,
            "error_code": "INTERNAL_ERROR"
        }
    )


# ============================================
# Startup/Shutdown Events
# ============================================

@app.on_event("startup")
async def startup_event():
    """Startup event"""
    logger.info("=" * 50)
    logger.info("🚀 Drought Prediction API Starting...")
    logger.info("=" * 50)

    if model_manager is not None and model_manager.drought_model is not None:
        logger.info(f"✓ Models loaded successfully")
        logger.info(f"✓ Available cities: {', '.join(model_manager.get_available_cities())}")
    else:
        logger.error("✗ Failed to load models!")


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event"""
    logger.info("=" * 50)
    logger.info("🛑 Drought Prediction API Shutting Down...")
    logger.info("=" * 50)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
