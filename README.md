# Morocco Drought Prediction

Full-stack drought prediction project for Moroccan cities. The repository includes data preparation scripts, exploratory analysis, a FastAPI prediction backend, and a Vite/React frontend.

## Project Structure

```text
.
├── assets/
│   └── figures/          # Generated charts and prediction visualizations
├── data/                 # Source and processed CSV data
├── docs/                 # Implementation notes and setup references
├── notebooks/            # Exploratory analysis notebooks
├── scripts/              # Data collection and preprocessing scripts
├── web_app/
│   ├── backend/          # FastAPI API and trained model artifacts
│   └── frontend/         # React + Vite user interface
├── run-dev.ps1           # Windows development launcher
└── run-dev.sh            # Unix development launcher
```

## Requirements

- Python 3.10 recommended for the backend
- Node.js 18+ recommended for the frontend
- Backend Python packages from `web_app/backend/requirements.txt`
- Frontend npm packages from `web_app/frontend/package.json`

## Setup

Install backend dependencies:

```bash
cd web_app/backend
pip install -r requirements.txt
```

Install frontend dependencies:

```bash
cd web_app/frontend
npm install
```

## Run Locally

From the project root, use the helper script:

```powershell
.\run-dev.ps1
```

Or run the services manually.

Backend:

```bash
cd web_app/backend
python main.py
```

Frontend:

```bash
cd web_app/frontend
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

## Data and Models

The backend reads processed data from `data/morocco_climate_features.csv` and city metadata from `data/moroccan_cities.csv`.

Trained model artifacts are expected in `web_app/backend/models/`:

- `drought_model.pkl`
- `city_encoder.pkl`

Model artifacts are ignored by Git because they are generated binary files.

## Useful Scripts

- `scripts/cities.py`: extracts Moroccan cities from the world cities dataset.
- `scripts/data.py`: collects climate data.
- `scripts/preprocess_data.py`: generates the processed feature dataset.
