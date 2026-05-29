export interface ClimateData {
  precipitation: number;
  temperature: number;
  et0: number;
  water_balance: number;
  spi: number;
  spi_category: string;
}

export interface MonthData {
  month: string;
  precipitation: number;
}

export interface PredictionResponse {
  city: string;
  month: number;
  year: number;
  prediction: 'Drought' | 'No Drought';
  drought_probability: number;
  no_drought_probability: number;
  climate_data: ClimateData;
  last_6_months: MonthData[];
  economic_impact?: EconomicImpactSummary;
}

export interface EconomicImpactSummary {
  total_loss_formatted: string;
  top_risk_crop: string;
  top_risk_vulnerability: string;
}

export interface CropRisk {
  crop: string;
  crop_label: string;
  icon: string;
  vulnerability: 'Very High' | 'High' | 'Moderate' | 'Low';
  vulnerability_score: number;
  estimated_yield_loss_pct: number;
  estimated_production_loss_tonnes: number;
  estimated_economic_loss_mad: number;
}

export interface RegionalContext {
  region: string;
  primary_crops: string;
  rain_fed_pct: number;
  cereal_share_pct: number;
}

export interface HistoricalComparison {
  year: number;
  spi: number;
  prod_drop_pct: number;
}

export interface ImpactResponse {
  city: string;
  month: number;
  year: number;
  spi: number;
  spi_category: string;
  drought_severity: string;
  crop_risks: CropRisk[];
  total_estimated_loss_mad: number;
  total_loss_formatted: string;
  regional_context: RegionalContext;
  historical_comparison: HistoricalComparison | null;
}

export interface MapCityData {
  city: string;
  lat: number;
  lng: number;
  prediction: 'Drought' | 'No Drought';
  drought_probability: number;
  spi: number;
  spi_category: string;
}

export interface MapResponse {
  month: number;
  year: number;
  cities: MapCityData[];
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  available_cities: string[];
  data_range: {
    min_year: number;
    max_year: number;
    min_month: number;
    max_month: number;
    min_date: string;
    max_date: string;
  };
}

export interface HistoryDataPoint {
  date: string;
  spi: number;
  spi_category: string;
  precipitation: number;
  label: 'Drought' | 'No Drought';
}

export interface HistoryResponse {
  city: string;
  data: HistoryDataPoint[];
}

export interface DroughtEvent {
  month: string;
  year: number;
  severity: string;
  duration: number;
}

export interface CityInfo {
  name: string;
  lat: number;
  lng: number;
}
