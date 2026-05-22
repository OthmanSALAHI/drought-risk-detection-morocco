import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, AlertTriangle, CloudRain, Thermometer,
  Droplets, BarChart3, Search, ChevronDown,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { usePrediction } from '../hooks/usePrediction';
import { CITY_NAMES } from '../constants/cities';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export const Predict: React.FC = () => {
  const { result, loading, error, predict } = usePrediction();
  const [city, setCity] = useState('Marrakech');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [citySearch, setCitySearch] = useState('');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  const filteredCities = CITY_NAMES.filter(c =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  const handlePredict = () => {
    predict(city, month, year);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const years = Array.from({ length: new Date().getFullYear() - 1999 }, (_, i) => 2000 + i);

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Drought Risk Prediction</h1>
          <p className="text-slate-400">Select a city and date to analyze drought risk using our ML model</p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <GlassCard className="p-6 md:p-8 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Prediction Parameters
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">City</label>
                  <div className="relative">
                    <button
                      onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors"
                    >
                      <span>{city}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${cityDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {cityDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-20 w-full mt-2 bg-navy-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                        >
                          <div className="p-2">
                            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg mb-2">
                              <Search className="w-4 h-4 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Search city..."
                                value={citySearch}
                                onChange={e => setCitySearch(e.target.value)}
                                className="bg-transparent text-white text-sm w-full outline-none placeholder:text-slate-500"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-0.5">
                              {filteredCities.map(c => (
                                <button
                                  key={c}
                                  onClick={() => { setCity(c); setCityDropdownOpen(false); setCitySearch(''); }}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                    city === c ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300 hover:bg-white/5'
                                  }`}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Month</label>
                  <select
                    value={month}
                    onChange={e => setMonth(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 transition-colors appearance-none"
                  >
                    {months.map((m, i) => (
                      <option key={i + 1} value={i + 1} className="bg-navy-800">{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
                  <select
                    value={year}
                    onChange={e => setYear(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-blue-500/50 transition-colors appearance-none"
                  >
                    {years.map(y => (
                      <option key={y} value={y} className="bg-navy-800">{y}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handlePredict}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-5 h-5" />
                      Predict Drought Risk
                    </>
                  )}
                </button>

                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {!result && !loading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center"
                >
                  <GlassCard className="p-12 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
                      <BarChart3 className="w-10 h-10 text-blue-400/50" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Ready to Predict</h3>
                    <p className="text-slate-400 max-w-sm">Configure your parameters and click the button to get your drought risk assessment.</p>
                  </GlassCard>
                </motion.div>
              )}

              {result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <GlassCard className="p-8">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        className={`w-24 h-24 rounded-2xl flex items-center justify-center ${
                          result.prediction === 'Drought'
                            ? 'bg-red-500/20'
                            : 'bg-emerald-500/20'
                        }`}
                      >
                        {result.prediction === 'Drought' ? (
                          <AlertTriangle className="w-12 h-12 text-red-400" />
                        ) : (
                          <ShieldCheck className="w-12 h-12 text-emerald-400" />
                        )}
                      </motion.div>

                      <div className="flex-1 text-center md:text-left">
                        <div className={`text-3xl md:text-4xl font-extrabold mb-2 ${
                          result.prediction === 'Drought' ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          {result.prediction === 'Drought' ? 'Drought Risk Detected' : 'No Drought Risk'}
                        </div>
                        <p className="text-slate-400 mb-4">
                          {result.city} &mdash; {months[result.month - 1]} {result.year}
                        </p>

                        <div className="w-full max-w-md">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-400">Confidence</span>
                            <span className={`font-bold ${
                              result.prediction === 'Drought' ? 'text-red-400' : 'text-emerald-400'
                            }`}>
                              {result.prediction === 'Drought'
                                ? result.drought_probability
                                : result.no_drought_probability}%
                            </span>
                          </div>
                          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${result.prediction === 'Drought' ? result.drought_probability : result.no_drought_probability}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className={`h-full rounded-full ${
                                result.prediction === 'Drought' ? 'bg-red-500' : 'bg-emerald-500'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: CloudRain, label: 'Rainfall', value: `${result.climate_data.precipitation} mm`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                      { icon: Thermometer, label: 'Temperature', value: `${result.climate_data.temperature} °C`, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                      { icon: Droplets, label: 'Water Balance', value: `${result.climate_data.water_balance} mm`, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                      { icon: BarChart3, label: 'SPI Index', value: result.climate_data.spi.toFixed(2), color: 'text-purple-400', bg: 'bg-purple-500/10' },
                    ].map((item, i) => (
                      <GlassCard key={i} delay={i * 0.1} className="p-5">
                        <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center mb-3`}>
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">{item.value}</div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider">{item.label}</div>
                      </GlassCard>
                    ))}
                  </div>

                  <GlassCard className="p-6">
                    <h3 className="text-lg font-bold text-white mb-6">Last 6 Months Rainfall</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={result.last_6_months}>
                          <defs>
                            <linearGradient id="rainfallGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                          <YAxis stroke="#64748B" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1E293B',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              color: '#fff',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="precipitation"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            fill="url(#rainfallGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
