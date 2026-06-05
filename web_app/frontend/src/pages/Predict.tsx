import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, AlertTriangle, CloudRain, Thermometer,
  Droplets, BarChart3, Search, ChevronDown, TrendingDown,
  TrendingUp, MapPin, Wheat, Clock, Info,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, Cell,
} from 'recharts';
import { GlassCard } from '../components/ui/GlassCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { CITY_NAMES } from '../constants/cities';
import { formatDecimal } from '../utils/format';
import { predictDrought, getEconomicImpact } from '../services/api';
import { PredictionResponse, ImpactResponse, CropRisk } from '../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const VULNERABILITY_COLORS: Record<string, string> = {
  'Very High': '#DC2626',
  'High':      '#F97316',
  'Moderate':  '#EAB308',
  'Low':       '#22C55E',
};

const SEVERITY_BG: Record<string, string> = {
  Extreme:  'from-red-900/60 to-red-800/30 border-red-500/30',
  Severe:   'from-red-800/50 to-orange-700/30 border-orange-500/30',
  Moderate: 'from-orange-800/40 to-amber-700/20 border-amber-500/30',
  Mild:     'from-yellow-900/40 to-yellow-800/20 border-yellow-500/20',
  None:     'from-emerald-900/30 to-emerald-800/10 border-emerald-500/20',
};

// Animated circular gauge
const Gauge: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const color = VULNERABILITY_COLORS[label] ?? '#64748B';
  const r = 24;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width="60" height="60" className="-rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <motion.circle
          cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - score / 100) }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[11px] font-bold" style={{ color }}>{label}</span>
    </div>
  );
};

// Single crop card
const CropCard: React.FC<{ crop: CropRisk; idx: number }> = ({ crop, idx }) => {
  const color = VULNERABILITY_COLORS[crop.vulnerability] ?? '#64748B';
  const lossM = crop.estimated_economic_loss_mad / 1_000_000;
  const lossStr = lossM >= 1000 ? `${(lossM / 1000).toFixed(1)}B` : `${lossM.toFixed(1)}M`;
  const hasImpact = crop.estimated_yield_loss_pct > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08 }}
    >
      <GlassCard className="p-5 h-full">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-2xl">{crop.icon}</span>
            <h4 className="text-base font-bold text-white mt-0.5">{crop.crop_label}</h4>
          </div>
          <Gauge score={crop.vulnerability_score} label={crop.vulnerability} />
        </div>

        {hasImpact ? (
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Yield Loss</span>
              <span className="font-bold text-base" style={{ color }}>
                -{formatDecimal(crop.estimated_yield_loss_pct, 1)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, crop.estimated_yield_loss_pct)}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: idx * 0.08 }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-white/5">
              <div>
                <div className="text-slate-400">Production Loss</div>
                <div className="text-white font-semibold mt-0.5">
                  {crop.estimated_production_loss_tonnes >= 1000
                    ? `${(crop.estimated_production_loss_tonnes / 1000).toFixed(1)}K`
                    : crop.estimated_production_loss_tonnes.toFixed(0)} t
                </div>
              </div>
              <div>
                <div className="text-slate-400">Economic Loss</div>
                <div className="font-semibold mt-0.5" style={{ color }}>{lossStr} MAD</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 pt-1">
            No significant impact at current SPI
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
};

// ─── main component ────────────────────────────────────────────────────────────

export const Predict: React.FC = () => {
  const [city, setCity] = useState('Marrakech');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [citySearch, setCitySearch] = useState('');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false);
        setCitySearch('');
      }
    };
    if (cityDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [cityDropdownOpen]);

  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [impact, setImpact] = useState<ImpactResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCities = CITY_NAMES.filter(c =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  const years = Array.from(
    { length: new Date().getFullYear() - 1999 },
    (_, i) => 2000 + i
  );

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPrediction(null);
    setImpact(null);
    try {
      // Fire both requests in parallel
      const [pred, imp] = await Promise.all([
        predictDrought(city, month, year),
        getEconomicImpact(city, month, year),
      ]);
      setPrediction(pred);
      setImpact(imp);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Analysis failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [city, month, year]);

  const isDrought = prediction?.prediction === 'Drought';
  const severityClass = SEVERITY_BG[impact?.drought_severity ?? 'None'];
  const totalLoss = impact?.total_estimated_loss_mad ?? 0;
  const hasAnyImpact = totalLoss > 0;

  // Radar data
  const radarData = (impact?.crop_risks ?? []).map(c => ({
    crop: c.crop_label,
    score: c.vulnerability_score,
  }));

  // Historical bar data
  const barData = impact?.historical_comparison
    ? [
        {
          label: `${impact.historical_comparison.year}`,
          value: impact.historical_comparison.prod_drop_pct,
          fill: '#94A3B8',
        },
        {
          label: `${year} (est.)`,
          value: impact.crop_risks.length
            ? Math.max(...impact.crop_risks.map(c => c.estimated_yield_loss_pct))
            : 0,
          fill: isDrought ? '#F97316' : '#22C55E',
        },
      ]
    : [];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Page title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
            Drought & Impact Analysis
          </h1>
          <p className="text-slate-400">
            Select a city and period to get drought prediction and estimated agricultural economic loss in one view.
          </p>
        </motion.div>

        {/* ── controls row ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative z-50"
        >
          <GlassCard className="p-5 mb-6">
            <div className="flex flex-wrap gap-3 items-end">

              {/* City selector */}
              <div ref={cityDropdownRef} className="flex-1 min-w-[180px] relative">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  City
                </label>
                <button
                  onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors text-sm"
                >
                  <span>{city}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${cityDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {cityDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute z-[200] w-full mt-1.5 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    >
                      <div className="p-2">
                        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg mb-1.5">
                          <Search className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search city..."
                            value={citySearch}
                            onChange={e => setCitySearch(e.target.value)}
                            className="bg-transparent text-white text-sm w-full outline-none placeholder:text-slate-500"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-44 overflow-y-auto space-y-0.5">
                          {filteredCities.map(c => (
                            <button
                              key={c}
                              onClick={() => { setCity(c); setCityDropdownOpen(false); setCitySearch(''); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${city === c ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300 hover:bg-white/5'}`}
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

              {/* Month */}
              <div className="min-w-[140px]">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Month</label>
                <select
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-blue-500/50 appearance-none"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i + 1} value={i + 1} className="bg-slate-900">{m}</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div className="min-w-[110px]">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Year</label>
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-blue-500/50 appearance-none"
                >
                  {years.map(y => (
                    <option key={y} value={y} className="bg-slate-900">{y}</option>
                  ))}
                </select>
              </div>

              {/* Analyze button */}
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 text-sm whitespace-nowrap"
              >
                {loading ? <><LoadingSpinner /><span>Analyzing…</span></> : <><BarChart3 className="w-4 h-4" /><span>Analyze</span></>}
              </button>
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* ── empty state ── */}
        <AnimatePresence>
          {!prediction && !loading && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-24"
            >
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-5">
                  <BarChart3 className="w-10 h-10 text-blue-400/50" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Ready to Analyze</h3>
                <p className="text-slate-400 max-w-sm">
                  Select a city and date above, then click <strong>Analyze</strong> to get the full drought &amp; economic impact report.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── results ── */}
        <AnimatePresence>
          {prediction && impact && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >

              {/* ── Section 1: Prediction hero ── */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Drought verdict */}
                <GlassCard className={`p-6 bg-gradient-to-br ${isDrought ? 'from-red-900/40 to-red-800/20 border-red-500/20' : 'from-emerald-900/30 to-emerald-800/10 border-emerald-500/20'}`}>
                  <div className="flex items-center gap-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${isDrought ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}
                    >
                      {isDrought
                        ? <AlertTriangle className="w-8 h-8 text-red-400" />
                        : <ShieldCheck className="w-8 h-8 text-emerald-400" />
                      }
                    </motion.div>
                    <div>
                      <div className={`text-2xl font-extrabold ${isDrought ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isDrought ? 'Drought Detected' : 'No Drought'}
                      </div>
                      <div className="text-slate-400 text-sm mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {prediction.city} — {MONTHS[prediction.month - 1]} {prediction.year}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
                        SPI: <span className="font-bold text-white">{formatDecimal(prediction.climate_data.spi, 2)}</span>
                        <span className="text-slate-500">·</span>
                        {prediction.climate_data.spi_category}
                      </div>
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">Model Confidence</span>
                      <span className={`font-bold ${isDrought ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isDrought
                          ? formatDecimal(prediction.drought_probability, 1)
                          : formatDecimal(prediction.no_drought_probability, 1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${isDrought ? prediction.drought_probability : prediction.no_drought_probability}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full rounded-full ${isDrought ? 'bg-red-500' : 'bg-emerald-500'}`}
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Economic impact hero */}
                <GlassCard className={`p-6 bg-gradient-to-br ${severityClass}`}>
                  <div className="flex items-center gap-3 mb-1">
                    <TrendingDown className={`w-5 h-5 ${hasAnyImpact ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                      Estimated Agricultural Loss
                    </span>
                  </div>
                  <div className={`text-4xl font-black mb-2 ${hasAnyImpact ? 'text-white' : 'text-slate-500'}`}>
                    {hasAnyImpact ? impact.total_loss_formatted : 'No Impact'}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      impact.drought_severity === 'None' ? 'bg-emerald-500/20 text-emerald-400'
                      : impact.drought_severity === 'Mild' ? 'bg-yellow-500/20 text-yellow-400'
                      : impact.drought_severity === 'Moderate' ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-red-500/20 text-red-400'
                    }`}>
                      {impact.drought_severity} Drought
                    </span>
                    {!hasAnyImpact && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" />
                        SPI above crop stress threshold
                      </span>
                    )}
                  </div>
                  {hasAnyImpact && impact.crop_risks[0] && (
                    <div className="mt-3 text-sm text-slate-400">
                      Top risk: <span className="text-amber-400 font-semibold">{impact.crop_risks[0].crop_label}</span>
                      {' '}— <span className="text-red-400 font-semibold">{impact.crop_risks[0].vulnerability}</span> vulnerability
                    </div>
                  )}
                  <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Based on SPI-yield regression models
                  </div>
                </GlassCard>
              </div>

              {/* ── Section 2: Climate stats ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: CloudRain, label: 'Rainfall', value: `${formatDecimal(prediction.climate_data.precipitation, 1)} mm`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { icon: Thermometer, label: 'Temperature', value: `${formatDecimal(prediction.climate_data.temperature, 1)} °C`, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                  { icon: Droplets, label: 'Water Balance', value: `${formatDecimal(prediction.climate_data.water_balance, 1)} mm`, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                  { icon: BarChart3, label: 'SPI Index', value: formatDecimal(prediction.climate_data.spi, 2), color: 'text-purple-400', bg: 'bg-purple-500/10' },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                    <GlassCard className="p-4">
                      <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center mb-2.5`}>
                        <item.icon className={`w-4.5 h-4.5 ${item.color}`} />
                      </div>
                      <div className="text-xl font-bold text-white">{item.value}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">{item.label}</div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>

              {/* ── Section 3: Rainfall chart + crop risks ── */}
              <div className="grid lg:grid-cols-5 gap-4">

                {/* Rainfall chart */}
                <div className="lg:col-span-2">
                  <GlassCard className="p-5 h-full">
                    <h3 className="text-base font-bold text-white mb-4">Last 6 Months Rainfall</h3>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={prediction.last_6_months}>
                          <defs>
                            <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                          <YAxis stroke="#64748B" fontSize={11} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }}
                          />
                          <Area type="monotone" dataKey="precipitation" stroke="#3B82F6" strokeWidth={2} fill="url(#rg)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>
                </div>

                {/* Crop risk cards */}
                <div className="lg:col-span-3">
                  <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                    <Wheat className="w-4 h-4 text-amber-400" />
                    Crop Vulnerability
                  </h3>
                  <div className={`grid gap-3 ${impact.crop_risks.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-3'}`}>
                    {impact.crop_risks.length > 0
                      ? impact.crop_risks.map((c, i) => <CropCard key={c.crop} crop={c} idx={i} />)
                      : (
                        <div className="col-span-2 flex items-center justify-center py-8 text-slate-500 text-sm text-center">
                          <div>
                            <TrendingUp className="w-10 h-10 mx-auto mb-2 text-emerald-500/40" />
                            No crop stress detected at current SPI level.<br />
                            Crops are within normal range.
                          </div>
                        </div>
                      )
                    }
                  </div>
                </div>
              </div>

              {/* ── Section 4: Regional context + radar + historical ── */}
              <div className="grid md:grid-cols-3 gap-4">

                {/* Regional context */}
                <GlassCard className="p-5">
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    Regional Context
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Region</div>
                      <div className="text-white font-semibold">{impact.regional_context.region}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Primary Crops</div>
                      <div className="text-white font-semibold">{impact.regional_context.primary_crops}</div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400 uppercase tracking-wider">Rain-fed Land</span>
                        <span className="text-orange-400 font-bold">{impact.regional_context.rain_fed_pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${impact.regional_context.rain_fed_pct}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-orange-500 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">National Cereal Share</div>
                      <div className="text-white font-semibold">{impact.regional_context.cereal_share_pct}%</div>
                    </div>
                  </div>
                </GlassCard>

                {/* Vulnerability radar */}
                <GlassCard className="p-5">
                  <h3 className="text-base font-bold text-white mb-2">Vulnerability Radar</h3>
                  {radarData.length > 1 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="rgba(255,255,255,0.08)" />
                          <PolarAngleAxis dataKey="crop" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                          <Radar dataKey="score" stroke="#F97316" fill="#F97316" fillOpacity={0.2} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-500 text-sm text-center">
                      Not enough crop types for radar view
                    </div>
                  )}
                </GlassCard>

                {/* Historical comparison */}
                <GlassCard className="p-5">
                  <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    Historical Comparison
                  </h3>
                  {impact.historical_comparison ? (
                    <>
                      <p className="text-xs text-slate-400 mb-3">
                        Nearest historical drought: <span className="text-white font-semibold">{impact.historical_comparison.year}</span>
                        {' '}(SPI {formatDecimal(impact.historical_comparison.spi, 2)})
                      </p>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                            <Tooltip
                              formatter={(v: number) => [`${v.toFixed(1)}%`, 'Production Drop']}
                              contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {barData.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-slate-500 text-sm text-center">
                      No comparable historical drought found
                    </div>
                  )}
                </GlassCard>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};
