"""
Configuration module for the Drought Prediction API
"""

import os
from pathlib import Path

# Application Configuration
APP_VERSION = "1.0.0"
APP_NAME = "Drought Prediction API"

# Backend base directory
BACKEND_DIR = Path(__file__).parent
PROJECT_DIR = BACKEND_DIR.parent.parent

# Model paths
MODELS_DIR = BACKEND_DIR / "models"
DROUGHT_MODEL_PATH = MODELS_DIR / "drought_model.pkl"
CITY_ENCODER_PATH = MODELS_DIR / "city_encoder.pkl"

# Data paths
DATA_DIR = PROJECT_DIR / "data"
FEATURES_DATA_PATH = DATA_DIR / "morocco_climate_features.csv"
CITIES_DATA_PATH = DATA_DIR / "moroccan_cities.csv"

# API Configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
API_RELOAD = os.getenv("API_RELOAD", "true").lower() == "true"
API_LOG_LEVEL = os.getenv("API_LOG_LEVEL", "info")

# CORS Configuration
CORS_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:8080",  # Alternative port
    "http://localhost:3000",  # CRA default
]

if os.getenv("CORS_ORIGINS"):
    CORS_ORIGINS = os.getenv("CORS_ORIGINS").split(",")

# Request Configuration
REQUEST_TIMEOUT_SECONDS = 30
MAX_CONTENT_LENGTH = 1024 * 1024  # 1MB

# Feature Engineering
FEATURES_FOR_PREDICTION = [
    'city_encoded', 'precipitation_sum', 'temperature_2m_mean', 'et0_fao_evapotranspiration',
    'water_balance', 'SPI', 'precip_lag1', 'temp_lag1', 'precip_lag2',
    'temp_lag2', 'precip_lag3', 'temp_lag3', 'precip_rolling3',
    'precip_rolling6', 'temp_rolling3', 'et0_rolling3', 'season_encoded'
]

# Prediction Configuration
DROUGHT_THRESHOLD = 0.5  # Probability threshold for drought classification
MIN_AVAILABLE_DATA_YEARS = 2  # Minimum years of data required

# Logging Configuration
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_LEVEL = "INFO"

# Month names for formatting
MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

# Validation ranges
MIN_YEAR = 2000
MAX_YEAR = 2100
MIN_MONTH = 1
MAX_MONTH = 12

# Error messages
ERROR_MESSAGES = {
    'MODEL_NOT_LOADED': 'Models not loaded. Please check server logs.',
    'MODEL_NOT_FOUND': 'Model files not found. Please ensure all model files are in the models directory.',
    'DATA_NOT_FOUND': 'Required data files not found. Please check data directory.',
    'CITY_NOT_FOUND': 'City not found in available cities.',
    'DATA_UNAVAILABLE': 'No data available for the specified month/year.',
    'INVALID_MONTH': 'Month must be between 1 and 12.',
    'INVALID_YEAR': 'Year must be between 2000 and 2100.',
    'PREDICTION_ERROR': 'Error during prediction. Please try again.',
    'INTERNAL_ERROR': 'Internal server error. Please contact support.',
}

def validate_config():
    """Validate that all required configuration is correct"""
    import sys
    
    errors = []
    
    # Check model files
    if not MODELS_DIR.exists():
        errors.append(f"Models directory not found at {MODELS_DIR}")
    elif not DROUGHT_MODEL_PATH.exists():
        errors.append(f"Drought model not found at {DROUGHT_MODEL_PATH}")
    elif not CITY_ENCODER_PATH.exists():
        errors.append(f"City encoder not found at {CITY_ENCODER_PATH}")
    
    # Check data files
    if not DATA_DIR.exists():
        errors.append(f"Data directory not found at {DATA_DIR}")
    elif not FEATURES_DATA_PATH.exists():
        errors.append(f"Features data not found at {FEATURES_DATA_PATH}")
    elif not CITIES_DATA_PATH.exists():
        errors.append(f"Cities data not found at {CITIES_DATA_PATH}")
    
    if errors:
        print("\n❌ Configuration Errors:")
        for error in errors:
            print(f"  - {error}")
        return False
    
    return True

if __name__ == "__main__":
    print(f"\n{APP_NAME} v{APP_VERSION}")
    print(f"API will run on: {API_HOST}:{API_PORT}")
    print(f"Models directory: {MODELS_DIR}")
    print(f"Data directory: {DATA_DIR}")
    print()
    
    if validate_config():
        print("✓ All configurations are valid!")
    else:
        print("✗ Configuration validation failed!")
