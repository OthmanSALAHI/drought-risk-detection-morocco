import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, TrendingDown, Wheat, MapPin, Clock,
  ChevronLeft, Info,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getEconomicImpact } from '../services/api';
import { ImpactResponse, CropRisk } from '../types';
import { formatDecimal } from '../utils/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const VULNERABILITY_COLORS: Record<string, string> = {
  'Very High': '#DC2626',
  'High': '#F97316',
  'Moderate': '#EAB308',
  'Low': '#22C55E',
};

const SEVERITY_GRADIENTS: Record<string, string> = {
  'Extreme': 'from-red-900/60 to-red-700/30 border-red-500/40',
  'Severe': 'from-red-800/50 to-orange-700/30 border-orange-500/40',
  'Moderate': 'from-orange-800/50 to-amber-700/30 border-amber-500/40',
  'Mild': 'from-yellow-800/40 to-yellow-700/20 border-yellow-500/30',
  'None': 'from-emerald-900/40 to-emerald-700/20 border-emerald-500/30',
};


// Circular vulnerability gauge
const VulnerabilityGauge: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const color = VULNERABILITY_COLORS[label] || '#64748B';
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
        <motion.circle
          cx="36" cy="36" r={radius} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs font-bold" style={{ color }}>{label}</span>
    </div>
  );
};

// Single crop risk card
const CropCard: React.FC<{ crop: CropRisk; index: number }> = ({ crop, index }) => {
  const color = VULNERABILITY_COLORS[crop.vulnerability] || '#64748B';
  const lossM = crop.estimated_economic_loss_mad / 1_000_000;
  const lossFormatted = lossM >= 1000
    ? `${(lossM / 1000).toFixed(1)}B`
    : `${lossM.toFixed(1)}M`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <GlassCard className="p-6 h-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-3xl">{crop.icon}</span>
            <h3 className="text-lg font-bold text-white mt-1">{crop.crop_label}</h3>
          </div>
          <VulnerabilityGauge score={crop.vulnerability_score} label={crop.vulnerability} />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Yield Loss</span>
            <span className="font-bold text-lg" style={{ color }}>
              -{formatDecimal(crop.estimated_yield_loss_pct, 1)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, crop.estimated_yield_loss_pct)}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: index * 0.1 }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>

          <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
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
              <div className="font-semibold mt-0.5" style={{ color }}>
                {lossFormatted} MAD
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export const EconomicImpact: React.FC = () => {
  const [params] = useSearchParams();
  const city = params.get('city') || 'Marrakech';
  const month = parseInt(params.get('month') || String(new Date().getMonth() + 1));
  const year = parseInt(params.get('year') || String(new Date().getFullYear()));

  const [data, setData] = useState<ImpactResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getEconomicImpact(city, month, year)
      .then(setData)
      .catch(err => setError(err?.response?.data?.detail || err.message || 'Failed to load impact data'))
      .finally(() => setLoading(false));
  }, [city, month, year]);

  const severityClass = SEVERITY_GRADIENTS[data?.drought_severity || 'None'];

  // Radar chart data
  const radarData = data?.crop_risks.map(c => ({
    crop: c.crop_label,
    score: c.vulnerability_score,
  })) || [];

  // Bar chart data for historical comparison
  const barData = data?.historical_comparison
    ? [
        { label: `${data.historical_comparison.year} (Actual)`, value: data.historical_comparison.prod_drop_pct },
        {
          label: `${year} (Estimated)`,
          value: data.crop_risks.length > 0
            ? Math.max(...data.crop_risks.map(c => c.estimated_yield_loss_pct))
            : 0,
        },
      ]
    : [];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Back + header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            to="/predict"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Prediction
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                Agricultural Impact Analysis
              </h1>
              <p className="text-slate-400 mt-1 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {city} — {MONTH_NAMES[month - 1]} {year}
              </p>
            </div>
            {/* Disclaimer badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
              <Info className="w-4 h-4 flex-shrink-0" />
              Estimates based on SPI-yield regression models
            </div>
          </div>
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        )}

        {error && (
          <GlassCard className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-semibold">{error}</p>
          </GlassCard>
        )}

        <AnimatePresence>
          {data && !loading && (
            <motion.div
              key="impact-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Total loss hero card */}
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
                <GlassCard className={`p-8 bg-gradient-to-br ${severityClass}`}>
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1 text-center md:text-left">
                      <div className="text-sm text-slate-300 uppercase tracking-widest mb-2 font-medium">
                        Total Estimated Agricultural Loss
                      </div>
                      <div className="text-5xl md:text-6xl font-black text-white mb-2">
                        {data.total_loss_formatted}
                      </div>
                      <div className="flex items-center gap-3 justify-center md:justify-start">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          data.drought_severity === 'None'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : data.drought_severity === 'Mild'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : data.drought_severity === 'Moderate'
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {data.drought_severity} Drought
                        </span>
                        <span className="text-slate-400 text-sm">SPI: {formatDecimal(data.spi, 2)}</span>
                        <span className="text-slate-400 text-sm">— {data.spi_category}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <TrendingDown className="w-24 h-24 text-red-400/40 mx-auto" />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Crop risk cards */}
              <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Wheat className="w-5 h-5 text-amber-400" />
                  Crop Vulnerability by Type
                </h2>
                <div className={`grid gap-4 ${
                  data.crop_risks.length === 1 ? 'grid-cols-1 max-w-sm' :
                  data.crop_risks.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {data.crop_risks.map((crop, i) => (
                    <CropCard key={crop.crop} crop={crop} index={i} />
                  ))}
                </div>
              </div>

              {/* Bottom row: radar + regional context + historical */}
              <div className="grid lg:grid-cols-3 gap-6">

                {/* Radar chart */}
                {radarData.length > 1 && (
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Vulnerability Radar</h3>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="rgba(255,255,255,0.1)" />
                          <PolarAngleAxis dataKey="crop" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                          <Radar
                            name="Vulnerability"
                            dataKey="score"
                            stroke="#F97316"
                            fill="#F97316"
                            fillOpacity={0.25}
                            strokeWidth={2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>
                )}

                {/* Regional context */}
                <GlassCard className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    Regional Context
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Region</div>
                      <div className="text-white font-semibold">{data.regional_context.region}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Primary Crops</div>
                      <div className="text-white font-semibold">{data.regional_context.primary_crops}</div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400 uppercase tracking-wider">Rain-fed Land</span>
                        <span className="text-orange-400 font-bold">{data.regional_context.rain_fed_pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${data.regional_context.rain_fed_pct}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-orange-500 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">National Cereal Share</div>
                      <div className="text-white font-semibold">{data.regional_context.cereal_share_pct}%</div>
                    </div>
                  </div>
                </GlassCard>

                {/* Historical comparison */}
                {data.historical_comparison && (
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      Historical Comparison
                    </h3>
                    <p className="text-slate-400 text-sm mb-4">
                      Similar drought recorded in{' '}
                      <span className="text-white font-semibold">{data.historical_comparison.year}</span>
                      {' '}(SPI: {formatDecimal(data.historical_comparison.spi, 2)})
                    </p>
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                          <YAxis
                            tick={{ fill: '#94A3B8', fontSize: 10 }}
                            tickFormatter={v => `${v}%`}
                            domain={[0, 100]}
                          />
                          <Tooltip
                            formatter={(v: number) => [`${v.toFixed(1)}%`, 'Production Drop']}
                            contentStyle={{
                              backgroundColor: '#1E293B',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              color: '#fff',
                            }}
                          />
                          <Bar dataKey="value" fill="#F97316" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
