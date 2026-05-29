<div align="center">

# 🌍 DroughtWatch Morocco

### Système de Prédiction et d'Impact Économique de la Sécheresse au Maroc

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-RandomForest-F7931E?style=flat&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

*Full-stack machine learning system that predicts drought risk for 44 Moroccan cities and estimates the resulting agricultural economic loss in MAD.*

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Data Pipeline](#-data-pipeline)
- [Machine Learning Model](#-machine-learning-model)
- [Agricultural Impact Engine](#-agricultural-impact-engine)
- [API Reference](#-api-reference)
- [Frontend Pages](#-frontend-pages)
- [Setup & Installation](#-setup--installation)
- [Running Locally](#-running-locally)
- [Reproducing the Model](#-reproducing-the-model)
- [Data Sources](#-data-sources)

---

## 🌟 Overview

DroughtWatch Morocco is a research-grade, full-stack application that combines **climate science**, **machine learning**, and **agricultural economics** to answer two questions:

1. **Is there a drought?** — A Random Forest classifier trained on 25 years of climate data for 44 Moroccan cities predicts drought probability using the Standardized Precipitation Index (SPI-3) and 18 engineered features.

2. **What does it cost?** — An agricultural impact engine translates the predicted SPI drought severity into estimated crop yield losses and economic damage in Moroccan Dirhams (MAD), broken down by crop type (barley, soft wheat, durum wheat, olives).

The system supports **future date predictions** beyond the training data cutoff by falling back to the most recent available same-month observations for each city.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🗺️ **Interactive Map** | Leaflet map showing SPI drought conditions for all 44 cities |
| 📊 **Unified Dashboard** | Single-page drought prediction + economic impact analysis |
| 💰 **Economic Impact** | Estimated MAD loss per crop type with vulnerability gauges |
| 📈 **Historical Analysis** | 25-year SPI time series per city with recharts visualizations |
| 🔮 **Future Predictions** | Extrapolation beyond training data using same-month fallback |
| 🌡️ **Climate Metrics** | Rainfall, temperature, water balance, and SPI displayed per prediction |
| 📱 **Responsive UI** | Dark glassmorphism design, works on mobile and desktop |
| ⚡ **Parallel API Calls** | Predict + Impact fetched simultaneously for fast load |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React + Vite Frontend                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Predict  │ │   Map    │ │ History  │ │  About   │   │
│  │(unified) │ │(Leaflet) │ │(recharts)│ │          │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / JSON
┌────────────────────────▼────────────────────────────────┐
│                  FastAPI Backend (port 8000)              │
│                                                          │
│  GET /predict   GET /impact   GET /map   GET /history    │
│       │               │                                  │
│  ┌────▼──────┐  ┌─────▼──────────────┐                  │
│  │ Random    │  │ Agricultural       │                  │
│  │ Forest    │  │ Impact Engine      │                  │
│  │ Classifier│  │ (SPI → MAD loss)   │                  │
│  └────┬──────┘  └─────┬──────────────┘                  │
│       │               │                                  │
│  ┌────▼───────────────▼──────────────────────────────┐  │
│  │          morocco_climate_features.csv              │  │
│  │  morocco_agriculture.csv  city_crop_mapping.csv   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Drought & Water/
├── data/
│   ├── morocco_climate_data.csv          # Raw climate data (Open-Meteo)
│   ├── morocco_climate_features.csv      # Processed features (output of preprocess_data.py)
│   ├── moroccan_cities.csv               # City coordinates (lat/lng)
│   ├── morocco_agriculture.csv           # Crop production + prices 2000–2025 (FAOSTAT/ONICL)
│   └── city_crop_mapping.csv             # City → region → crops → irrigated %
│
├── scripts/
│   ├── cities.py                         # Extract Moroccan cities from world cities dataset
│   ├── data.py                           # Collect climate data via Open-Meteo API
│   └── preprocess_data.py                # Feature engineering & SPI calculation
│
├── notebooks/
│   └── *.ipynb                           # Exploratory analysis notebooks
│
├── web_app/
│   ├── backend/
│   │   ├── main.py                       # FastAPI application (all endpoints)
│   │   ├── impact_engine.py              # Agricultural economic impact calculator
│   │   ├── train_models.py               # Model training script
│   │   ├── requirements.txt              # Python dependencies
│   │   └── models/
│   │       ├── drought_model.pkl         # Trained RandomForestClassifier (git-ignored)
│   │       └── city_encoder.pkl          # LabelEncoder for city names (git-ignored)
│   │
│   └── frontend/
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Predict.tsx           # Unified drought + impact dashboard
│       │   │   ├── MapView.tsx           # Interactive Leaflet map
│       │   │   ├── History.tsx           # Historical SPI time series
│       │   │   ├── Home.tsx              # Landing page
│       │   │   ├── About.tsx             # Project info
│       │   │   └── EconomicImpact.tsx    # Standalone impact page (standalone route)
│       │   ├── services/api.ts           # Axios API client + mock generators
│       │   ├── types/index.ts            # TypeScript interfaces
│       │   ├── hooks/usePrediction.ts    # Prediction hook
│       │   ├── components/              # GlassCard, Navbar, Footer, LoadingSpinner
│       │   ├── constants/cities.ts      # List of 44 city names
│       │   └── utils/format.ts          # formatDecimal utility
│       └── package.json
│
├── run-dev.ps1                           # Windows: launch backend + frontend together
├── run-dev.sh                            # Unix: launch backend + frontend together
└── README.md
```

---

## 🔬 Data Pipeline

### Step 1 — City Extraction (`scripts/cities.py`)
Filters the world cities dataset to Moroccan cities and outputs `moroccan_cities.csv` with coordinates.

### Step 2 — Climate Data Collection (`scripts/data.py`)
Calls the [Open-Meteo](https://open-meteo.com/) historical weather API for each city from 2000 to 2025 and saves `morocco_climate_data.csv` with monthly:
- `precipitation_sum` (mm)
- `temperature_2m_mean` (°C)
- `et0_fao_evapotranspiration` (mm — reference evapotranspiration)

### Step 3 — Feature Engineering (`scripts/preprocess_data.py`)

| Feature Group | Features Generated |
|--------------|-------------------|
| **Water Balance** | `water_balance = precipitation − ET₀` |
| **SPI-3** | 3-month rolling Gamma-fitted Standardized Precipitation Index, per city per calendar month |
| **Lag Features** | `precip_lag1/2/3`, `temp_lag1/2/3` (previous months) |
| **Rolling Averages** | `precip_rolling3/6`, `temp_rolling3`, `et0_rolling3` |
| **Seasonality** | `month`, `season_encoded` (Winter=0, Spring=1, Summer=2, Autumn=3) |
| **Labels** | `spi_category` (7 classes), `drought_label` (Drought / No Drought, threshold SPI ≤ -1.0) |

**SPI Calculation method:**
- Fits a Gamma distribution to historical 3-month accumulated precipitation for each `(city, calendar_month)` pair
- Falls back to empirical plotting-position method when sample is too small or distribution fit fails
- Result is transformed to a standard normal value

---

## 🤖 Machine Learning Model

### Algorithm
**Random Forest Classifier** (`sklearn.ensemble.RandomForestClassifier`)

### Hyperparameters
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `n_estimators` | 300 | Enough trees for stable probabilities |
| `class_weight` | `balanced` | Drought is minority class (~20–30%) |
| `min_samples_leaf` | 2 | Reduces overfitting |
| `random_state` | 42 | Reproducibility |
| `n_jobs` | -1 | Parallel training |

### Features (18 total)
```
city_encoded, precipitation_sum, temperature_2m_mean, et0_fao_evapotranspiration,
water_balance, SPI, precip_lag1, precip_lag2, precip_lag3,
temp_lag1, temp_lag2, temp_lag3, precip_rolling3, precip_rolling6,
temp_rolling3, et0_rolling3, month, season_encoded
```

### Target
Binary label: **1 = Drought** (SPI ≤ -1.0), **0 = No Drought**

### Train/Test Split
80% train / 20% test, stratified by drought label

### Inference — Future Date Support
For dates beyond the training data cutoff, `get_city_data_or_estimate()` uses the **most recent available data for the same city and calendar month** as a proxy, allowing predictions for any future year/month combination.

---

## 💰 Agricultural Impact Engine

Located in `web_app/backend/impact_engine.py`, this module translates SPI values into agricultural economic estimates.

### Method
For each crop grown near the predicted city, the engine computes:

1. **Yield Loss %**
   ```
   yield_loss = min(85, max(0, β × |SPI − threshold| × 100))   when SPI < threshold
   ```
   where β is a crop-specific sensitivity coefficient derived from CGIAR/ICARDA regression studies for Morocco (R² ≈ 0.3–0.6).

2. **Production Loss** (tonnes)
   ```
   production_loss = national_baseline × regional_cereal_share × (yield_loss / 100)
   ```

3. **Economic Loss** (MAD)
   ```
   economic_loss = production_loss_tonnes × 10 × price_MAD_per_quintal
   ```
   *(× 10 converts tonnes to quintals)*

### Crop Sensitivity Coefficients

| Crop | β (sensitivity) | Stress Threshold | Notes |
|------|----------------|-----------------|-------|
| Barley | 0.20 | SPI < -0.5 | Most vulnerable — rain-fed marginal land |
| Durum Wheat | 0.16 | SPI < -0.8 | Slightly more resilient |
| Soft Wheat | 0.15 | SPI < -0.8 | Commercial irrigated areas buffer losses |
| Olives | 0.07 | SPI < -1.2 | Tree crop — deep root system, most resilient |

### Reference Prices (ONICL)
- Barley: 290 MAD/quintal
- Soft Wheat: 320 MAD/quintal
- Durum Wheat: 340 MAD/quintal
- Olive Oil: 625 MAD/quintal

---

## 📡 API Reference

Base URL: `http://localhost:8000`

Interactive docs: `http://localhost:8000/docs`

### `GET /health`
Returns model status, available cities, and data date range.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "available_cities": ["Agadir", "Casablanca", ...],
  "data_range": {
    "min_year": 2000, "max_year": 2025,
    "min_month": 1, "max_month": 4,
    "min_date": "2000-01-01", "max_date": "2025-04-01"
  }
}
```

### `GET /predict?city=X&month=N&year=N`
Runs the drought prediction model and returns probabilities, climate data, and an economic impact summary.

**Parameters:** `city` (string), `month` (1–12), `year` (2000–2100)

**Response (drought example):**
```json
{
  "city": "Marrakech",
  "month": 3,
  "year": 2022,
  "prediction": "Drought",
  "drought_probability": 87.3,
  "no_drought_probability": 12.7,
  "climate_data": {
    "precipitation": 4.2,
    "temperature": 18.5,
    "et0": 98.1,
    "water_balance": -93.9,
    "spi": -1.82,
    "spi_category": "Severely Dry"
  },
  "last_6_months": [...],
  "economic_impact": {
    "total_loss_formatted": "532.6M MAD",
    "top_risk_crop": "Barley",
    "top_risk_vulnerability": "Very High"
  }
}
```

### `GET /impact?city=X&month=N&year=N`
Returns the full per-crop economic impact breakdown.

**Response:**
```json
{
  "city": "Marrakech",
  "spi": -1.82,
  "spi_category": "Severely Dry",
  "drought_severity": "Severe",
  "crop_risks": [
    {
      "crop": "barley",
      "crop_label": "Barley",
      "icon": "🌾",
      "vulnerability": "Very High",
      "vulnerability_score": 82.4,
      "estimated_yield_loss_pct": 26.4,
      "estimated_production_loss_tonnes": 45200,
      "estimated_economic_loss_mad": 130580000
    }
  ],
  "total_estimated_loss_mad": 532600000,
  "total_loss_formatted": "532.6M MAD",
  "regional_context": {
    "region": "Marrakech-Safi",
    "primary_crops": "Soft Wheat, Olives",
    "rain_fed_pct": 80.0,
    "cereal_share_pct": 12.0
  },
  "historical_comparison": {
    "year": 2022,
    "spi": -1.8,
    "prod_drop_pct": 58.0
  }
}
```

### `GET /map?month=N&year=N`
Returns SPI and drought status for all available cities (observed historical data only — no fallback estimation for the map).

### `GET /history?city=X`
Returns the full monthly SPI time series for a city from 2000 to the data cutoff.

---

## 🖥️ Frontend Pages

### `/predict` — Unified Analysis Dashboard
The main page. Enter city + month + year and click **Analyze** to get:
- Drought verdict with confidence bar
- Estimated agricultural economic loss (total + per crop)
- 4 climate metric tiles
- 6-month rainfall chart
- Crop vulnerability cards with animated circular gauges
- Regional context (rain-fed %, crop mix, cereal share)
- Vulnerability radar chart
- Historical drought comparison bar chart

### `/map` — Interactive Morocco Map
Leaflet map with circle markers colored by SPI category. Click any city for a popup with status, SPI, and a link to its full prediction.

### `/history` — Historical SPI Viewer
Recharts area chart showing 25 years of monthly SPI for a selected city. Drought periods highlighted in red.

---

## ⚙️ Setup & Installation

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.10+ | Backend runtime |
| Node.js | 18+ | Frontend build |
| pip | latest | Python package manager |
| npm | latest | Node package manager |

### Backend

```bash
cd web_app/backend
pip install -r requirements.txt
```

Key Python packages:
- `fastapi` + `uvicorn` — API server
- `scikit-learn` — Random Forest model
- `pandas` + `numpy` — Data processing
- `scipy` — Gamma distribution for SPI
- `python-dateutil` — Date arithmetic

### Frontend

```bash
cd web_app/frontend
npm install
```

Key npm packages:
- `react` + `react-router-dom` — SPA framework
- `framer-motion` — Animations
- `recharts` — Charts
- `react-leaflet` — Interactive map
- `lucide-react` — Icons
- `axios` — HTTP client

---

## 🚀 Running Locally

### Option 1 — Helper Scripts (recommended)

**Windows (PowerShell):**
```powershell
.\run-dev.ps1
```

**Linux / macOS:**
```bash
chmod +x run-dev.sh
./run-dev.sh
```

### Option 2 — Manual

**Terminal 1 — Backend:**
```bash
cd web_app/backend
python main.py
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

**Terminal 2 — Frontend:**
```bash
cd web_app/frontend
npm run dev
# → http://localhost:5173
```

---

## 🔁 Reproducing the Model

If you want to retrain the model from raw data:

```bash
# 1. Extract cities
python scripts/cities.py

# 2. Download climate data (takes ~10–30 min for all cities)
python scripts/data.py

# 3. Engineer features and calculate SPI
python scripts/preprocess_data.py

# 4. Train the Random Forest model
cd web_app/backend
python train_models.py
# → outputs models/drought_model.pkl and models/city_encoder.pkl
```

---

## 📊 Data Sources

| Dataset | Source | Coverage |
|---------|--------|---------|
| Climate data (precipitation, temp, ET₀) | [Open-Meteo Historical API](https://open-meteo.com/) | 44 cities, 2000–2025, monthly |
| City coordinates | World cities dataset (filtered) | 44 Moroccan cities |
| Crop production data | [FAOSTAT](https://www.fao.org/faostat/) — Morocco (code 137) | 2000–2025, 4 crops |
| Crop prices | [ONICL](https://www.onicl.org.ma/) — Office National Interprofessionnel des Céréales et Légumineuses | Reference prices 2024–2025 |
| SPI-yield regression coefficients | CGIAR/ICARDA — Morocco drought studies | Published R² 0.3–0.6 |
| Agricultural region mapping | Haut-Commissariat au Plan (HCP) — Morocco | Cereal share %, irrigated % per region |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
Built for Moroccan drought resilience research · Faculté des Sciences Ben M'Sik · Université Hassan II de Casablanca
</div>
