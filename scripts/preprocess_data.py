import numpy as np
import pandas as pd
from statistics import NormalDist

try:
    from scipy.stats import gamma
except ImportError:
    gamma = None


SPI_WINDOW_MONTHS = 3
STANDARD_NORMAL = NormalDist()


# Load source data
df = pd.read_csv("data/morocco_climate_data.csv")

# Handle mixed datetime formats (with and without " 00:00:00")
df["time"] = pd.to_datetime(df["time"], format="mixed")

# Some cities appear more than once for the same month. Keep one monthly
# climate observation per city so the SPI climatology is not overweighted.
df = (
    df.groupby(["city", "time"], as_index=False)
    .agg({
        "precipitation_sum": "mean",
        "temperature_2m_mean": "mean",
        "et0_fao_evapotranspiration": "mean",
    })
)

# Sort by city and time
df = df.sort_values(["city", "time"]).reset_index(drop=True)

# ============================================
# FEATURE 1 — Water Balance
# ============================================
df["water_balance"] = df["precipitation_sum"] - df["et0_fao_evapotranspiration"]

# ============================================
# FEATURE 2 - SPI-3 (uses 3-month accumulated precipitation)
# ============================================
def empirical_spi(values: pd.Series) -> pd.Series:
    """Fallback SPI estimate using plotting positions when gamma fit is weak."""
    result = pd.Series(np.nan, index=values.index, dtype=float)
    valid = values.dropna()
    if valid.empty:
        return result

    ranks = valid.rank(method="average")
    probabilities = (ranks - 0.44) / (len(valid) + 0.12)
    probabilities = probabilities.clip(1e-6, 1 - 1e-6)
    result.loc[valid.index] = probabilities.map(STANDARD_NORMAL.inv_cdf)
    return result


def calculate_spi(values: pd.Series) -> pd.Series:
    """Compute SPI from accumulated precipitation for one city/month climatology."""
    result = pd.Series(np.nan, index=values.index, dtype=float)
    valid = values.dropna()
    if valid.empty:
        return result

    positive = valid[valid > 0]
    zero_probability = (valid == 0).mean()

    if gamma is None or len(positive) < 4 or positive.nunique() < 2:
        return empirical_spi(values)

    try:
        shape, loc, scale = gamma.fit(positive, floc=0)
        probabilities = zero_probability + (1 - zero_probability) * gamma.cdf(
            valid,
            a=shape,
            loc=loc,
            scale=scale,
        )
        probabilities = pd.Series(probabilities, index=valid.index).clip(1e-6, 1 - 1e-6)
        result.loc[valid.index] = probabilities.map(STANDARD_NORMAL.inv_cdf)
        return result
    except Exception:
        return empirical_spi(values)


df["month"] = df["time"].dt.month
df["spi_3_month_precipitation"] = df.groupby("city")["precipitation_sum"].transform(
    lambda x: x.rolling(SPI_WINDOW_MONTHS, min_periods=SPI_WINDOW_MONTHS).sum()
)

# SPI is standardized separately for each city and calendar month. That keeps
# July in a dry city from being judged against wet-season months or wet cities.
df["SPI"] = df.groupby(["city", "month"])["spi_3_month_precipitation"].transform(calculate_spi)

# ============================================
# FEATURE 3 - Lag Features (previous months)
# ============================================
for lag in [1, 2, 3]:
    df[f"precip_lag{lag}"] = df.groupby("city")["precipitation_sum"].shift(lag)
    df[f"temp_lag{lag}"]   = df.groupby("city")["temperature_2m_mean"].shift(lag)

# ============================================
# FEATURE 4 — Rolling Averages
# ============================================
df["precip_rolling3"] = df.groupby("city")["precipitation_sum"].transform(lambda x: x.rolling(3).mean())
df["precip_rolling6"] = df.groupby("city")["precipitation_sum"].transform(lambda x: x.rolling(6).mean())
df["temp_rolling3"]   = df.groupby("city")["temperature_2m_mean"].transform(lambda x: x.rolling(3).mean())
df["et0_rolling3"]    = df.groupby("city")["et0_fao_evapotranspiration"].transform(lambda x: x.rolling(3).mean())

# ============================================
# FEATURE 5 - Seasonality
# ============================================
df["season"] = df["month"].map({
    12: "Winter", 1: "Winter", 2: "Winter",
    3:  "Spring", 4: "Spring", 5: "Spring",
    6:  "Summer", 7: "Summer", 8: "Summer",
    9:  "Autumn", 10:"Autumn", 11:"Autumn"
})
df["season_encoded"] = df["season"].map({"Winter":0, "Spring":1, "Summer":2, "Autumn":3})

# ============================================
# LABEL - Real-world SPI drought thresholds
# ============================================
def classify_spi(spi: float) -> str:
    if pd.isna(spi):
        return np.nan
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


df["spi_category"] = df["SPI"].apply(classify_spi)
df["drought_label"] = np.where(df["SPI"] <= -1.0, "Drought", "No Drought")

# ============================================
# Drop rows with NaN (from lag/rolling)
# ============================================
df = df.dropna().reset_index(drop=True)

# Save
df.to_csv("data/morocco_climate_features.csv", index=False)

# Preview
print(f"\nDataset shape: {df.shape}")
print(f"\nSPI-3 category distribution:")
print(df["spi_category"].value_counts())
print(f"\nDrought label distribution:")
print(df["drought_label"].value_counts())
print(f"\nDrought label percentage:")
print((df["drought_label"].value_counts(normalize=True) * 100).round(1))
print(f"\nSPI summary:")
print(df["SPI"].describe())
print(f"\nSample row:")
print(df[df["city"] == "Casablanca"].head(3).T)
