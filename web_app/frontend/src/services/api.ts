import axios from 'axios';
import {
  PredictionResponse,
  MapResponse,
  HistoryResponse,
} from '../types';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mock Data Generators
const mockPrediction = (city: string, month: number, year: number): PredictionResponse => {
  const isDrought = Math.random() > 0.5;
  const droughtProb = isDrought ? 60 + Math.random() * 35 : Math.random() * 40;
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  return {
    city,
    month,
    year,
    prediction: isDrought ? 'Drought' : 'No Drought',
    drought_probability: parseFloat(droughtProb.toFixed(1)),
    no_drought_probability: parseFloat((100 - droughtProb).toFixed(1)),
    climate_data: {
      precipitation: parseFloat((Math.random() * 50).toFixed(1)),
      temperature: parseFloat((15 + Math.random() * 20).toFixed(1)),
      et0: parseFloat((100 + Math.random() * 150).toFixed(1)),
      water_balance: parseFloat((-200 + Math.random() * 100).toFixed(1)),
      spi: parseFloat((-2 + Math.random() * 3).toFixed(2)),
      spi_category: isDrought ? 'Moderately Dry' : 'Near Normal',
    },
    last_6_months: months.map(m => ({
      month: m,
      precipitation: parseFloat((Math.random() * 40).toFixed(1)),
    })),
  };
};

const mockMap = (month: number, year: number): MapResponse => {
  const cities = [
    { city: 'Marrakech', lat: 31.6295, lng: -7.9811 },
    { city: 'Casablanca', lat: 33.5731, lng: -7.5898 },
    { city: 'Rabat', lat: 34.0209, lng: -6.8416 },
    { city: 'Agadir', lat: 30.4278, lng: -9.5981 },
    { city: 'Fes', lat: 34.0181, lng: -5.0078 },
    { city: 'Tanger', lat: 35.7595, lng: -5.8340 },
    { city: 'Oujda', lat: 34.6817, lng: -1.9086 },
    { city: 'Errachidia', lat: 31.9314, lng: -4.4247 },
    { city: 'Ouarzazate', lat: 30.9192, lng: -6.8938 },
    { city: 'Laayoune', lat: 27.1253, lng: -13.1625 },
    { city: 'Dakhla', lat: 23.6848, lng: -15.9570 },
    { city: 'Beni Mellal', lat: 32.3373, lng: -6.3498 },
    { city: 'Nador', lat: 35.1747, lng: -2.9287 },
    { city: 'Essaouira', lat: 31.5085, lng: -9.7595 },
    { city: 'Ifrane', lat: 33.5270, lng: -5.1068 },
  ];
  return {
    month,
    year,
    cities: cities.map(c => {
      const isDrought = Math.random() > 0.5;
      const prob = isDrought ? 50 + Math.random() * 45 : Math.random() * 45;
      return {
        ...c,
        prediction: isDrought ? 'Drought' : 'No Drought',
        drought_probability: parseFloat(prob.toFixed(1)),
        spi: isDrought ? -1.2 : 0.2,
        spi_category: isDrought ? 'Moderately Dry' : 'Near Normal',
      };
    }),
  };
};

const mockHistory = (city: string): HistoryResponse => {
  const data: HistoryResponse['data'] = [];
  for (let year = 2000; year <= 2025; year++) {
    for (let month = 1; month <= 12; month++) {
      const spi = -2 + Math.random() * 3;
      data.push({
        date: `${year}-${String(month).padStart(2, '0')}-01`,
        spi: parseFloat(spi.toFixed(2)),
        spi_category: spi < -2 ? 'Extremely Dry' : spi < -1.5 ? 'Severely Dry' : spi < -1 ? 'Moderately Dry' : 'Near Normal',
        precipitation: parseFloat((Math.random() * 80).toFixed(1)),
        label: spi < -1 ? 'Drought' : 'No Drought',
      });
    }
  }
  return { city, data };
};

export const USE_MOCK = false;

export const predictDrought = async (
  city: string,
  month: number,
  year: number
): Promise<PredictionResponse> => {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1200));
    return mockPrediction(city, month, year);
  }
  const res = await api.get('/predict', { params: { city, month, year } });
  return res.data;
};

export const getMapData = async (
  month: number,
  year: number
): Promise<MapResponse> => {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1000));
    return mockMap(month, year);
  }
  const res = await api.get('/map', { params: { month, year } });
  return res.data;
};

export const getHistory = async (city: string): Promise<HistoryResponse> => {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 800));
    return mockHistory(city);
  }
  const res = await api.get('/history', { params: { city } });
  return res.data;
};
