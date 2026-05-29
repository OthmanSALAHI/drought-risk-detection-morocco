import pickle
import os
import sys
import math
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from impact_engine import AgriculturalImpactEngine
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


CITY_COORDINATE_OVERRIDES: Dict[str, Tuple[float, float]] = {
    "al hoceima": (35.2472, -3.9322),
    "beni mellal": (32.3394, -6.3608),
    "boujdour": (26.1333, -14.5000),
    "chefchaouen": (35.1714, -5.2697),
    "dakhla": (23.7081, -15.9456),
    "el jadida": (33.2547, -8.5060),
    "fes": (34.0433, -5.0033),
    "khenifra": (32.9394, -5.6675),
    "khouribga": (32.8811, -6.9063),
    "laayoune": (27.1500, -13.1989),
    "meknes": (33.8950, -5.5547),
    "midelt": (32.6853, -4.7451),
    "ouarzazate": (30.9192, -6.8938),
    "oujda": (34.6867, -1.9114),
    "salé": (34.0333, -6.8000),
    "tanger": (35.7767, -5.8039),
    "taroudant": (30.4710, -8.8806),
    "tetouan": (35.5667, -5.3667),
    "tinghir": (31.5147, -5.5328),
}


# ============================================
# Pydantic Models for Response
# ============================================

class ClimateData(BaseModel):
    precipitation: float
    temperature: float
    et0: float
    water_balance: float
    spi: float
    spi_category: str


class EconomicImpactSummary(BaseModel):
    total_loss_formatted: str
    top_risk_crop: str
    top_risk_vulnerability: str


class CropRisk(BaseModel):
    crop: str
    crop_label: str
    icon: str
    vulnerability: str
    vulnerability_score: float
    estimated_yield_loss_pct: float
    estimated_production_loss_tonnes: float
    estimated_economic_loss_mad: float


class RegionalContext(BaseModel):
    region: str
    primary_crops: str
    rain_fed_pct: float
    cereal_share_pct: float


class HistoricalComparison(BaseModel):
    year: int
    spi: float
    prod_drop_pct: float


class ImpactResponse(BaseModel):
    city: str
    month: int
    year: int
    spi: float
    spi_category: str
    drought_severity: str
    crop_risks: List[CropRisk]
    total_estimated_loss_mad: float
    total_loss_formatted: str
    regional_context: RegionalContext
    historical_comparison: Optional[HistoricalComparison] = None



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
    economic_impact: Optional[EconomicImpactSummary] = None


class MapCityData(BaseModel):
    city: str
    lat: float
    lng: float
    prediction: str = Field(..., pattern="^(Drought|No Drought)$")
    drought_probability: float
    spi: float
    spi_category: str


class MapResponse(BaseModel):
    month: int
    year: int
    cities: List[MapCityData]


class HistoryDataPoint(BaseModel):
    date: str
    spi: float
    spi_category: str
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
        self.min_date = None
        self.max_date = None
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
            self.min_date = self.features_df['time'].min()
            self.max_date = self.features_df['time'].max()
            self.min_year = int(self.min_date.year)
            self.max_year = int(self.max_date.year)
            
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
        city_key = city.lower()
        if city_key in CITY_COORDINATE_OVERRIDES:
            return CITY_COORDINATE_OVERRIDES[city_key]

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
    'water_balance', 'SPI', 'precip_lag1', 'precip_lag2', 'precip_lag3', 'temp_lag1', 'temp_lag2',
    'temp_lag3', 'precip_rolling3', 'precip_rolling6', 'temp_rolling3', 'et0_rolling3',
    'month', 'season_encoded'
]


def classify_spi(spi: float) -> str:
    """Translate SPI values to standard drought/wetness categories."""
    if spi <= -2.0:
        return "Extremely Dry"
    if spi <= -1.5:
        return "Severely Dry"
    if spi <= -1.0:
        return "Moderately Dry"
    if spi < 1.0:
        return "Near Normal"
    if spi < 1.5:
        return "Moderately Wet"
    if spi < 2.0:
        return "Very Wet"
    return "Extremely Wet"


def predict_drought_probability(model, X: np.ndarray) -> Tuple[str, float, float]:
    """Return binary drought label and probabilities with class-order safety."""
    prediction_proba = model.predict_proba(X)[0]
    classes = list(model.classes_)
    drought_idx = classes.index(1) if 1 in classes else len(classes) - 1
    no_drought_idx = classes.index(0) if 0 in classes else 0

    drought_prob = float(prediction_proba[drought_idx]) * 100
    no_drought_prob = float(prediction_proba[no_drought_idx]) * 100
    prediction_label = "Drought" if drought_prob >= 50 else "No Drought"

    return prediction_label, drought_prob, no_drought_prob


def drought_risk_from_spi(spi: float) -> Tuple[str, float, float]:
    """Score drought risk from the accepted SPI drought threshold."""
    drought_prob = 100 / (1 + math.exp(2.8 * (spi + 1.0)))
    no_drought_prob = 100 - drought_prob
    prediction_label = "Drought" if spi <= -1.0 else "No Drought"
    return prediction_label, drought_prob, no_drought_prob


# Initialize model manager
try:
    model_manager = ModelManager()
    logger.info("✓ Model manager initialized successfully")
except Exception as e:
    logger.error(f"✗ Failed to initialize model manager: {str(e)}")
    model_manager = None

# Initialize agricultural impact engine
try:
    _data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')
    impact_engine = AgriculturalImpactEngine(
        agriculture_csv=os.path.join(_data_dir, 'morocco_agriculture.csv'),
        city_crop_csv=os.path.join(_data_dir, 'city_crop_mapping.csv'),
    )
    logger.info("✓ Agricultural impact engine initialized successfully")
except Exception as e:
    logger.error(f"✗ Failed to initialize impact engine: {str(e)}")
    impact_engine = None


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
            "max_year": model_manager.max_year,
            "min_month": int(model_manager.min_date.month),
            "max_month": int(model_manager.max_date.month),
            "min_date": model_manager.min_date.strftime("%Y-%m-%d"),
            "max_date": model_manager.max_date.strftime("%Y-%m-%d"),
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
        X = city_data[features_cols].fillna(0)
        if len(X) > 1:
            X = X.iloc[0:1]  # Take first record if multiple

        spi = float(city_data.iloc[0]['SPI'])
        try:
            prediction_label, drought_prob, no_drought_prob = predict_drought_probability(
                model_manager.drought_model,
                X,
            )
        except Exception as e:
            logger.warning(f"Model prediction failed, falling back to SPI rule: {str(e)}")
            prediction_label, drought_prob, no_drought_prob = drought_risk_from_spi(spi)

        # Get climate data
        climate_data = ClimateData(
            precipitation=float(city_data.iloc[0]['precipitation_sum']),
            temperature=float(city_data.iloc[0]['temperature_2m_mean']),
            et0=float(city_data.iloc[0]['et0_fao_evapotranspiration']),
            water_balance=float(city_data.iloc[0]['water_balance']),
            spi=spi,
            spi_category=str(city_data.iloc[0].get(
                'spi_category',
                classify_spi(spi),
            )),
        )

        # Get last 6 months data
        last_6_months = model_manager.get_last_6_months_data(city, year, month)

        # Build economic impact summary (only when drought predicted)
        economic_impact = None
        if prediction_label == "Drought" and impact_engine is not None:
            try:
                impact_data = impact_engine.compute_impact(city, spi, month, year)
                if impact_data["crop_risks"]:
                    top = impact_data["crop_risks"][0]
                    economic_impact = EconomicImpactSummary(
                        total_loss_formatted=impact_data["total_loss_formatted"],
                        top_risk_crop=top["crop_label"],
                        top_risk_vulnerability=top["vulnerability"],
                    )
            except Exception as ie:
                logger.warning(f"Economic impact summary failed: {ie}")

        return PredictionResponse(
            city=city,
            month=month,
            year=year,
            prediction=prediction_label,
            drought_probability=round(drought_prob, 1),
            no_drought_probability=round(no_drought_prob, 1),
            climate_data=climate_data,
            last_6_months=last_6_months,
            economic_impact=economic_impact,
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
# Agricultural Impact Endpoint
# ============================================

@app.get("/impact", response_model=ImpactResponse)
async def get_economic_impact(
    city: str = Query(..., min_length=1),
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
) -> ImpactResponse:
    """
    Get agricultural economic impact for a city/month/year based on SPI.
    """
    try:
        if model_manager is None:
            raise HTTPException(status_code=503, detail="Models not available")
        if impact_engine is None:
            raise HTTPException(status_code=503, detail="Impact engine not available")

        available_cities = model_manager.get_available_cities()
        if city.lower() not in [c.lower() for c in available_cities]:
            raise HTTPException(
                status_code=400,
                detail=f"City '{city}' not found. Available cities: {', '.join(available_cities)}"
            )

        if year < model_manager.min_year:
            raise HTTPException(
                status_code=400,
                detail=f"Earliest available year: {model_manager.min_year}"
            )

        city_data = model_manager.get_city_data_or_estimate(city, year, month)
        if city_data is None or len(city_data) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"No data available for {city} in month {month} of year {year}"
            )

        spi = float(city_data.iloc[0]["SPI"])
        spi_category = classify_spi(spi)

        payload = impact_engine.compute_impact(city, spi, month, year)

        crop_risks = [CropRisk(**r) for r in payload["crop_risks"]]
        regional = RegionalContext(**payload["regional_context"])
        hist = payload.get("historical_comparison")
        historical = (
            HistoricalComparison(
                year=hist["year"],
                spi=hist["spi"],
                prod_drop_pct=hist["prod_drop_pct"],
            )
            if hist else None
        )

        return ImpactResponse(
            city=city,
            month=month,
            year=year,
            spi=spi,
            spi_category=spi_category,
            drought_severity=payload["drought_severity"],
            crop_risks=crop_risks,
            total_estimated_loss_mad=payload["total_estimated_loss_mad"],
            total_loss_formatted=payload["total_loss_formatted"],
            regional_context=regional,
            historical_comparison=historical,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in impact endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# ============================================
# Map Data Endpoint
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

        requested_date = pd.Timestamp(year=year, month=month, day=1)
        if requested_date < model_manager.min_date or requested_date > model_manager.max_date:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Observed map data is available from "
                    f"{model_manager.min_date.strftime('%Y-%m')} to "
                    f"{model_manager.max_date.strftime('%Y-%m')}"
                )
            )


        available_cities = model_manager.get_available_cities()
        map_cities = []

        for city in available_cities:
            try:
                # Use exact historical observations only. The map should not
                # display reused fallback months as if they were real data.
                city_data = model_manager.get_city_data(city, year, month)
                if city_data is None or len(city_data) == 0:
                    continue

                # Extract features
                features_cols = FEATURE_COLUMNS

                city_encoded = model_manager.encode_city(city)
                city_data = city_data.copy()
                city_data['city_encoded'] = city_encoded

                X = city_data[features_cols].fillna(0)
                if len(X) > 1:
                    X = X.iloc[0:1]

                spi = float(city_data.iloc[0]['SPI'])
                try:
                    prediction_label, drought_prob, _ = predict_drought_probability(
                        model_manager.drought_model,
                        X,
                    )
                except Exception as e:
                    logger.warning(f"Model prediction failed for {city}, falling back to SPI rule: {str(e)}")
                    prediction_label, drought_prob, _ = drought_risk_from_spi(spi)

                # Get coordinates
                coords = model_manager.get_city_coordinates(city)
                if coords:
                    map_cities.append(MapCityData(
                        city=city,
                        lat=coords[0],
                        lng=coords[1],
                        prediction=prediction_label,
                        drought_probability=round(drought_prob, 1),
                        spi=round(spi, 2),
                        spi_category=str(city_data.iloc[0].get('spi_category', classify_spi(spi))),
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
            spi = float(row['SPI'])
            spi_category = str(row.get('spi_category', classify_spi(spi)))
            label = "Drought" if spi <= -1.0 else "No Drought"

            history_data.append(HistoryDataPoint(
                date=row['time'].strftime('%Y-%m-%d'),
                spi=spi,
                spi_category=spi_category,
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
