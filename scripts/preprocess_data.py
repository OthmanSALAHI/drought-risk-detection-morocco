import pandas as pd
import numpy as np

# Load your data
df = pd.read_csv("data/morocco_climate_data.csv")

# ✅ FIX 1 — Handle mixed datetime formats (with and without " 00:00:00")
df["time"] = pd.to_datetime(df["time"], format="mixed")

# Sort by city and time
df = df.sort_values(["city", "time"]).reset_index(drop=True)

# ============================================
# FEATURE 1 — Water Balance
# ============================================
df["water_balance"] = df["precipitation_sum"] - df["et0_fao_evapotranspiration"]

# ============================================
# FEATURE 2 — SPI (uses precipitation_sum)
# ============================================
def calculate_spi(group, column="precipitation_sum", window=3):
    rolling = group[column].rolling(window=window, min_periods=1).sum()
    mean = rolling.mean()
    std = rolling.std()
    spi = (rolling - mean) / (std + 1e-8)
    return spi

df["SPI"] = df.groupby("city", group_keys=False).apply(calculate_spi)

# ============================================
# FEATURE 3 — Lag Features (previous months)
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
# FEATURE 5 — Seasonality
# ============================================
df["month"] = df["time"].dt.month
df["season"] = df["month"].map({
    12: "Winter", 1: "Winter", 2: "Winter",
    3:  "Spring", 4: "Spring", 5: "Spring",
    6:  "Summer", 7: "Summer", 8: "Summer",
    9:  "Autumn", 10:"Autumn", 11:"Autumn"
})
df["season_encoded"] = df["season"].map({"Winter":0, "Spring":1, "Summer":2, "Autumn":3})

# ============================================
# LABEL — ✅ FIX 2: Use percentiles for balanced classes
# ============================================
low  = df["SPI"].quantile(0.33)
high = df["SPI"].quantile(0.66)

print(f"📊 SPI thresholds from your data:")
print(f"   Severe   → SPI ≤ {low:.2f}")
print(f"   Moderate → SPI ≤ {high:.2f}")
print(f"   Normal   → SPI > {high:.2f}")

def classify_drought(spi):
    if spi <= low:
        return "Severe"
    elif spi <= high:
        return "Moderate"
    else:
        return "Normal"

df["drought_label"] = df["SPI"].apply(classify_drought)

# ============================================
# Drop rows with NaN (from lag/rolling)
# ============================================
df = df.dropna().reset_index(drop=True)

# Save
df.to_csv("data/morocco_climate_features.csv", index=False)

# Preview
print(f"\n✅ Dataset shape: {df.shape}")
print(f"\n📊 Drought label distribution:")
print(df["drought_label"].value_counts())
print(f"\n📊 Drought label percentage:")
print((df["drought_label"].value_counts(normalize=True) * 100).round(1))
print(f"\n🔍 Sample row:")
print(df[df["city"] == "Casablanca"].head(3).T)
