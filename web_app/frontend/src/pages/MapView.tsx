import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronDown,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { GlassCard } from '../components/ui/GlassCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getMapData } from '../services/api';
import { MapResponse } from '../types';
import { formatDecimal } from '../utils/format';

export const MapView: React.FC = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<MapResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const years = Array.from({ length: new Date().getFullYear() - 1999 }, (_, i) => 2000 + i);

  useEffect(() => {
    loadData();
  }, [month, year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getMapData(month, year);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (prob: number) => {
    if (prob > 70) return '#EF4444';
    if (prob > 50) return '#F97316';
    return '#3B82F6';
  };

  const getMarkerRadius = (prob: number) => {
    return 6 + (prob / 100) * 14;
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
            <p className="text-slate-400">Interactive map showing drought risk across Moroccan cities</p>
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="appearance-none px-4 py-2.5 pr-10 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-blue-500/50"
              >
                {months.map((m, i) => (
                  <option key={i + 1} value={i + 1} className="bg-navy-800">{m}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
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
                    radius={getMarkerRadius(city.drought_probability)}
                    fillColor={getMarkerColor(city.drought_probability)}
                    color={getMarkerColor(city.drought_probability)}
                    fillOpacity={0.6}
                    weight={2}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <h3 className="font-bold text-white text-lg mb-2">{city.city}</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Prediction:</span>
                            <span className={`font-semibold ${city.prediction === 'Drought' ? 'text-red-400' : 'text-emerald-400'}`}>
                              {city.prediction}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Probability:</span>
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
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Drought Risk</h4>
                <div className="space-y-2">
                  {[
                    { color: '#EF4444', label: 'High Risk (>70%)' },
                    { color: '#F97316', label: 'Moderate Risk (50-70%)' },
                    { color: '#3B82F6', label: 'Low Risk (<50%)' },
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
