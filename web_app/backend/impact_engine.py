"""
Agricultural Impact Engine
--------------------------
Translates SPI drought severity into estimated agricultural economic damage
for Moroccan cities based on empirical SPI-yield regression research.

Sources:
- CGIAR/ICARDA SPI-yield correlations for Morocco (R² 0.3–0.6)
- ONICL price benchmarks for Moroccan crops
- FAOSTAT historical production data (morocco_agriculture.csv)
"""

from __future__ import annotations

import os
from typing import Dict, List, Optional, Tuple
import pandas as pd


# ---------------------------------------------------------------------------
# Crop sensitivity coefficients (β) derived from SPI-yield regression studies
# for Morocco (CGIAR, MDPI, IWA Publishing).
# yield_loss_pct = min(85, max(0, β × |SPI| × 100)) when SPI < threshold
# ---------------------------------------------------------------------------
CROP_CONFIGS: Dict[str, dict] = {
    "barley": {
        "label": "Barley",
        "icon": "🌾",
        "sensitivity": 0.20,          # highest — grown on marginal rain-fed land
        "spi_threshold": -0.5,        # starts showing stress earlier
        "national_share": 0.28,       # share of total cereal area
    },
    "soft_wheat": {
        "label": "Soft Wheat",
        "icon": "🌿",
        "sensitivity": 0.15,
        "spi_threshold": -0.8,
        "national_share": 0.42,
    },
    "durum_wheat": {
        "label": "Durum Wheat",
        "icon": "🌱",
        "sensitivity": 0.16,
        "spi_threshold": -0.8,
        "national_share": 0.18,
    },
    "olives": {
        "label": "Olives",
        "icon": "🫒",
        "sensitivity": 0.07,          # tree crop — most resilient
        "spi_threshold": -1.2,
        "national_share": 0.12,       # share of all agricultural land used for olives
    },
}

VULNERABILITY_BANDS = [
    (75, "Very High", "#DC2626"),
    (50, "High",      "#F97316"),
    (25, "Moderate",  "#EAB308"),
    (0,  "Low",       "#22C55E"),
]

LOSS_FORMAT_THRESHOLDS = [
    (1_000_000_000, "B MAD"),
    (1_000_000,     "M MAD"),
    (1_000,         "K MAD"),
]


def _format_mad(value: float) -> str:
    for threshold, suffix in LOSS_FORMAT_THRESHOLDS:
        if value >= threshold:
            return f"{value / threshold:.1f} {suffix}"
    return f"{value:,.0f} MAD"


def _vulnerability_label(score: float) -> Tuple[str, str]:
    for threshold, label, color in VULNERABILITY_BANDS:
        if score >= threshold:
            return label, color
    return "Low", "#22C55E"


class AgriculturalImpactEngine:
    """Compute city-level agricultural economic impact from SPI values."""

    def __init__(self, agriculture_csv: str, city_crop_csv: str) -> None:
        self._agri_df: Optional[pd.DataFrame] = None
        self._city_df: Optional[pd.DataFrame] = None
        self._loaded = False
        self._load(agriculture_csv, city_crop_csv)

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    def _load(self, agriculture_csv: str, city_crop_csv: str) -> None:
        if not os.path.exists(agriculture_csv):
            raise FileNotFoundError(
                f"Agriculture CSV not found at {agriculture_csv}"
            )
        if not os.path.exists(city_crop_csv):
            raise FileNotFoundError(
                f"City-crop mapping CSV not found at {city_crop_csv}"
            )
        self._agri_df = pd.read_csv(agriculture_csv)
        self._city_df = pd.read_csv(city_crop_csv)
        self._city_df["city_lower"] = self._city_df["city"].str.lower()
        self._loaded = True

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_city_row(self, city: str) -> Optional[pd.Series]:
        if self._city_df is None:
            return None
        matches = self._city_df[self._city_df["city_lower"] == city.lower()]
        return matches.iloc[0] if len(matches) > 0 else None

    def _latest_production(self, crop: str) -> Tuple[float, float]:
        """Return (baseline_production_tonnes, price_mad_quintal) for a crop."""
        if self._agri_df is None:
            return 0.0, 280.0
        crop_data = self._agri_df[self._agri_df["crop"] == crop].sort_values(
            "year", ascending=False
        )
        # Use 5-year average as baseline (more stable than single year)
        recent = crop_data.head(5)
        if len(recent) == 0:
            return 0.0, 280.0
        baseline = float(recent["production_tonnes"].mean())
        price = float(recent["price_mad_quintal"].iloc[0])
        return baseline, price

    def _estimate_yield_loss(self, spi: float, crop: str) -> float:
        """Return estimated yield loss percentage (0–85) for a given SPI."""
        cfg = CROP_CONFIGS.get(crop)
        if cfg is None:
            return 0.0
        threshold = cfg["spi_threshold"]
        if spi >= threshold:
            return 0.0
        beta = cfg["sensitivity"]
        # Linear regression: loss increases as SPI drops below threshold
        severity = abs(spi - threshold)
        loss = beta * severity * 100
        return min(85.0, max(0.0, loss))

    def _vulnerability_score(self, yield_loss_pct: float, irrigated_pct: float) -> float:
        """
        Score 0–100 combining yield loss and rain-fed exposure.
        Rain-fed exposure amplifies vulnerability.
        """
        rain_fed_factor = 1.0 + (100 - irrigated_pct) / 200  # 1.0–1.5x
        raw = yield_loss_pct * rain_fed_factor
        return min(100.0, max(0.0, raw))

    def _find_similar_year(self, spi: float) -> Optional[dict]:
        """Find a historical drought year with a similar SPI magnitude."""
        # Known drought years with documented SPI and production impact
        HISTORICAL = [
            {"year": 1995, "spi": -2.3, "prod_drop_pct": 83.0},
            {"year": 2005, "spi": -1.6, "prod_drop_pct": 45.0},
            {"year": 2007, "spi": -1.4, "prod_drop_pct": 40.0},
            {"year": 2016, "spi": -1.3, "prod_drop_pct": 35.0},
            {"year": 2022, "spi": -1.8, "prod_drop_pct": 58.0},
            {"year": 2024, "spi": -1.7, "prod_drop_pct": 55.0},
        ]
        if spi >= -0.5:
            return None
        best = min(HISTORICAL, key=lambda h: abs(h["spi"] - spi))
        return best

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_regional_context(self, city: str) -> dict:
        row = self._get_city_row(city)
        if row is None:
            return {
                "region": "Unknown",
                "primary_crops": "Unknown",
                "rain_fed_pct": 80.0,
                "cereal_share_pct": 5.0,
            }
        crops_raw = str(row["primary_crops"]).replace(";", ", ")
        # Make crop names human-readable
        readable = (
            crops_raw
            .replace("soft_wheat", "Soft Wheat")
            .replace("durum_wheat", "Durum Wheat")
            .replace("barley", "Barley")
            .replace("olives", "Olives")
        )
        return {
            "region": str(row["region"]),
            "primary_crops": readable,
            "rain_fed_pct": round(100.0 - float(row["irrigated_pct"]), 1),
            "cereal_share_pct": float(row["cereal_share_pct"]),
        }

    def estimate_crop_risks(self, city: str, spi: float) -> List[dict]:
        """Return a sorted list of crop risk dicts for this city/SPI."""
        row = self._get_city_row(city)
        if row is None:
            crops = list(CROP_CONFIGS.keys())
            irrigated_pct = 20.0
        else:
            crops = [c.strip() for c in str(row["primary_crops"]).split(";")]
            irrigated_pct = float(row["irrigated_pct"])
            cereal_share = float(row["cereal_share_pct"]) / 100.0

        results = []
        for crop in crops:
            cfg = CROP_CONFIGS.get(crop)
            if cfg is None:
                continue

            baseline_tonnes, price_mad_quintal = self._latest_production(crop)

            # Scale national production by this region's cereal share
            if row is not None:
                cereal_share = float(row["cereal_share_pct"]) / 100.0
                if crop == "olives":
                    regional_share = cereal_share * 0.8   # olives loosely correlated
                else:
                    regional_share = cereal_share
            else:
                regional_share = 0.05

            yield_loss_pct = self._estimate_yield_loss(spi, crop)
            production_loss = baseline_tonnes * regional_share * (yield_loss_pct / 100.0)
            economic_loss = production_loss * 10 * price_mad_quintal  # tonnes→quintals

            vscore = self._vulnerability_score(yield_loss_pct, irrigated_pct)
            vulnerability, _ = _vulnerability_label(vscore)

            results.append({
                "crop": crop,
                "crop_label": cfg["label"],
                "icon": cfg["icon"],
                "vulnerability": vulnerability,
                "vulnerability_score": round(vscore, 1),
                "estimated_yield_loss_pct": round(yield_loss_pct, 1),
                "estimated_production_loss_tonnes": round(production_loss, 0),
                "estimated_economic_loss_mad": round(economic_loss, 0),
            })

        # Sort by vulnerability score descending
        results.sort(key=lambda x: x["vulnerability_score"], reverse=True)
        return results

    def compute_impact(self, city: str, spi: float, month: int, year: int) -> dict:
        """Master method — returns the full impact payload."""
        crop_risks = self.estimate_crop_risks(city, spi)
        total_loss = sum(r["estimated_economic_loss_mad"] for r in crop_risks)
        regional = self.get_regional_context(city)
        historical = self._find_similar_year(spi)

        # Drought severity label (mirrors classify_spi categories)
        if spi <= -2.0:
            severity = "Extreme"
        elif spi <= -1.5:
            severity = "Severe"
        elif spi <= -1.0:
            severity = "Moderate"
        elif spi < 0:
            severity = "Mild"
        else:
            severity = "None"

        total_fmt = _format_mad(total_loss) if total_loss > 0 else "No Impact"
        return {
            "city": city,
            "month": month,
            "year": year,
            "spi": round(spi, 3),
            "drought_severity": severity,
            "crop_risks": crop_risks,
            "total_estimated_loss_mad": round(total_loss, 0),
            "total_loss_formatted": total_fmt,
            "regional_context": regional,
            "historical_comparison": historical,
        }
