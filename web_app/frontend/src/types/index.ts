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
