import requests
import pandas as pd
import time
import os

print("🚀 Script started...")

cities = {
    # 🔴 Most drought-prone (southern/desert)
    "Errachidia":       (31.9314, -4.4244),
    "Zagora":           (30.3300, -5.8380),
    "Ouarzazate":       (30.9335, -6.9370),
    "Guelmim":          (28.9870, -10.0574),
    "Midelt":           (32.6809, -4.7340),
    "Tinghir":          (31.5150, -5.5300),
    "Tan-Tan":          (28.4380, -11.1030),
    "Laayoune":         (27.1418, -13.1875),
    "Dakhla":           (23.6847, -15.9571),
    "Tata":             (29.7500, -7.9700),
    "Marrakech":        (31.6295, -7.9811),
    "Agadir":           (30.4278, -9.5981),
    "Tiznit":           (29.6974, -9.7316),
    "Taroudant":        (30.4702, -8.8772),
    "Beni Mellal":      (32.3372, -6.3498),
    "Khouribga":        (32.8811, -6.9063),
    "Settat":           (33.0014, -7.6167),
    "Khenifra":         (32.9342, -5.6670),
    "Oujda":            (34.6814, -1.9086),
    "Figuig":           (32.1100, -1.2300),
    "Fes":              (34.0181, -5.0078),
    "Meknes":           (33.8935, -5.5473),
    "Taza":             (34.2133, -4.0100),
    "Nador":            (35.1740, -2.9287),
    "Berkane":          (34.9200, -2.3200),
    "Safi":             (32.2994, -9.2372),
    "El Jadida":        (33.2316, -8.5007),
    "Essaouira":        (31.5085, -9.7595),
    "Ksar El Kebir":    (35.0000, -5.9000),
    "Larache":          (35.1932, -6.1567),
    "Casablanca":       (33.5731, -7.5898),
    "Rabat":            (34.0209, -6.8416),
    "Tanger":           (35.7595, -5.8340),
    "Tetouan":          (35.5785, -5.3684),
    "Kenitra":          (34.2610, -6.5802),
    "Al Hoceima":       (35.2517, -3.9372),
    "Ifrane":           (33.5228, -5.1073),
    "Chefchaouen":      (35.1688, -5.2636),
    "Mohammedia":       (33.6861, -7.3830),
    "Salé":             (34.0365, -6.8217),
}

print(f"📋 {len(cities)} cities loaded")

SAVE_FILE = "data/morocco_climate_data.csv"
DELAY_BETWEEN_CITIES = 22

def fetch_daily_to_monthly(city_name, lat, lon, start="2000-01-01", end="2025-04-30"):
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start,
        "end_date": end,
        "daily": ["precipitation_sum", "temperature_2m_mean", "et0_fao_evapotranspiration"],
        "timezone": "Africa/Casablanca"
    }
    print(f"   📡 Sending request to API...")  # ← confirms request is being sent
    r = requests.get(url, params=params, timeout=30)
    print(f"   📥 Response received: {r.status_code}")  # ← confirms response came back
    data = r.json()

    if "error" in data:
        return None, data["reason"]

    df = pd.DataFrame(data["daily"])
    df["time"] = pd.to_datetime(df["time"])
    df.set_index("time", inplace=True)

    monthly = df.resample("MS").agg({
        "precipitation_sum": "sum",
        "temperature_2m_mean": "mean",
        "et0_fao_evapotranspiration": "sum"
    }).reset_index()

    monthly["city"] = city_name
    return monthly, None


def fetch_with_retry(city_name, lat, lon, max_retries=3):
    for attempt in range(max_retries):
        df, error = fetch_daily_to_monthly(city_name, lat, lon)
        if df is not None:
            return df
        if "limit" in error.lower():
            wait = 90 * (attempt + 1)
            print(f"   ⏳ Rate limit — waiting {wait}s (attempt {attempt+1}/{max_retries})...")
            time.sleep(wait)
        else:
            print(f"   ❌ Error: {error}")
            return None
    print(f"   ❌ Gave up after {max_retries} retries")
    return None


# Load already downloaded cities
if os.path.exists(SAVE_FILE):
    existing = pd.read_csv(SAVE_FILE)
    done_cities = set(existing["city"].unique())
    results = [existing]
    print(f"📂 Resuming — {len(done_cities)} cities already done: {done_cities}\n")
else:
    done_cities = set()
    results = []
    print("🆕 Starting fresh\n")

city_items = [(c, coords) for c, coords in cities.items() if c not in done_cities]
print(f"⏳ {len(city_items)} cities left to download\n")

failed = []

for i, (city, (lat, lon)) in enumerate(city_items):
    print(f"[{i+1}/{len(city_items)}] Fetching {city}...")
    df = fetch_with_retry(city, lat, lon)

    if df is not None:
        results.append(df)
        print(f"   ✅ {city}: {len(df)} months")
        pd.concat(results).to_csv(SAVE_FILE, index=False)
        print(f"   💾 Saved to {SAVE_FILE}")
    else:
        failed.append(city)

    if i < len(city_items) - 1:
        print(f"   ⏸️  Waiting {DELAY_BETWEEN_CITIES}s before next city...\n")
        time.sleep(DELAY_BETWEEN_CITIES)

print(f"\n{'='*50}")
print(f"✅ DONE!")
print(f"✅ Cities: {pd.concat(results)['city'].nunique()}")
print(f"✅ Total rows: {len(pd.concat(results))}")
if failed:
    print(f"⚠️  Failed: {', '.join(failed)}")
print(f"{'='*50}")
