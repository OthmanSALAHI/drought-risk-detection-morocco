import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronDown,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { GlassCard } from '../components/ui/GlassCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getHealth, getMapData } from '../services/api';
import { HealthResponse, MapResponse } from '../types';
import { formatDecimal } from '../utils/format';

export const MapView: React.FC = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<HealthResponse['data_range'] | null>(null);
  const [data, setData] = useState<MapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const years = dateRange
    ? Array.from({ length: dateRange.max_year - dateRange.min_year + 1 }, (_, i) => dateRange.min_year + i)
    : [];

  useEffect(() => {
    const loadDateRange = async () => {
      setLoading(true);
      try {
        const health = await getHealth();
        setDateRange(health.data_range);
        setMonth(health.data_range.max_month);
        setYear(health.data_range.max_year);
      } catch (err) {
        console.error(err);
        setError('Unable to load observed climate data range.');
        setLoading(false);
      }
    };

    loadDateRange();
  }, []);

  useEffect(() => {
    if (!dateRange || month === null || year === null) return;
    loadData(month, year);
  }, [dateRange, month, year]);

  const loadData = async (selectedMonth: number, selectedYear: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMapData(selectedMonth, selectedYear);
      setData(res);
    } catch (err) {
      console.error(err);
      setData(null);
      setError('No observed map data is available for this month.');
    } finally {
      setLoading(false);
    }
  };

  const isMonthAvailable = (monthNumber: number, yearNumber: number | null) => {
    if (!dateRange || yearNumber === null) return false;
    if (yearNumber === dateRange.min_year && monthNumber < dateRange.min_month) return false;
    if (yearNumber === dateRange.max_year && monthNumber > dateRange.max_month) return false;
    return true;
  };

  const handleYearChange = (nextYear: number) => {
    if (!dateRange || month === null) {
      setYear(nextYear);
      return;
    }

    let nextMonth = month;
    if (nextYear === dateRange.min_year && nextMonth < dateRange.min_month) {
      nextMonth = dateRange.min_month;
    }
    if (nextYear === dateRange.max_year && nextMonth > dateRange.max_month) {
      nextMonth = dateRange.max_month;
    }

    setYear(nextYear);
    setMonth(nextMonth);
  };

  const getMarkerColor = (spi: number) => {
    if (spi <= -2) return '#7F1D1D';
    if (spi <= -1.5) return '#DC2626';
    if (spi <= -1) return '#F97316';
    if (spi < 1) return '#3B82F6';
    return '#14B8A6';
  };

  const getMarkerRadius = (spi: number) => {
    if (spi <= -2) return 20;
    if (spi <= -1.5) return 17;
    if (spi <= -1) return 14;
    return 8;
  };

  return (
    <div className="min-h-screen pt-20 pb-6 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Morocco Drought Map</h1>
            <p className="text-slate-400">Observed SPI drought conditions across Moroccan cities</p>
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <select
                value={month ?? ''}
                onChange={e => setMonth(Number(e.target.value))}
                disabled={!dateRange || month === null}
                className="appearance-none px-4 py-2.5 pr-10 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-blue-500/50"
              >
                {months.map((m, i) => (
                  <option
                    key={i + 1}
                    value={i + 1}
                    disabled={!isMonthAvailable(i + 1, year)}
                    className="bg-navy-800"
                  >
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={year ?? ''}
                onChange={e => handleYearChange(Number(e.target.value))}
                disabled={!dateRange || year === null}
                className="appearance-none px-4 py-2.5 pr-10 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-blue-500/50"
              >
                {years.map(y => (
                  <option key={y} value={y} className="bg-navy-800">{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </motion.div>

        <GlassCard className="p-0 overflow-hidden" delay={0.1}>
          {loading ? (
            <div className="h-[600px] flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="h-[600px] flex items-center justify-center px-6 text-center text-slate-300">
              {error}
            </div>
          ) : (
            <div className="relative">
              <MapContainer
                center={[31.7917, -7.0926]}
                zoom={5}
                scrollWheelZoom={true}
                style={{ height: '600px', width: '100%', background: '#0F172A' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {data?.cities.map((city) => (
                  <CircleMarker
                    key={city.city}
                    center={[city.lat, city.lng]}
                    radius={getMarkerRadius(city.spi)}
                    fillColor={getMarkerColor(city.spi)}
                    color={getMarkerColor(city.spi)}
                    fillOpacity={0.72}
                    weight={2}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <h3 className="font-bold text-white text-lg mb-2">{city.city}</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Status:</span>
                            <span className={`font-semibold ${city.prediction === 'Drought' ? 'text-red-400' : 'text-emerald-400'}`}>
                              {city.prediction}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Confidence:</span>
                            <span className="font-semibold text-white">{formatDecimal(city.drought_probability)}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">SPI:</span>
                            <span className="font-semibold text-white">{formatDecimal(city.spi)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Category:</span>
                            <span className="font-semibold text-white">{city.spi_category}</span>
                          </div>
                          <button
                            onClick={() => navigate(`/predict?city=${encodeURIComponent(city.city)}`)}
                            className="w-full mt-3 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            Full Prediction
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>

              <div className="absolute bottom-4 left-4 bg-navy-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-xl">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">SPI Category</h4>
                <div className="space-y-2">
                  {[
                    { color: '#7F1D1D', label: 'Extremely Dry (SPI <= -2)' },
                    { color: '#DC2626', label: 'Severely Dry (-2 to -1.5)' },
                    { color: '#F97316', label: 'Moderately Dry (-1.5 to -1)' },
                    { color: '#3B82F6', label: 'Near Normal (-1 to 1)' },
                    { color: '#14B8A6', label: 'Wet (SPI >= 1)' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-slate-300">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
