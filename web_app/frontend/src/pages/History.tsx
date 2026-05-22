import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown, Calendar, TrendingDown,
  BarChart3, CloudRain, MapPin,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getHistory } from '../services/api';
import { HistoryResponse, DroughtEvent } from '../types';
import { CITY_NAMES } from '../constants/cities';
import {
  LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine,
} from 'recharts';

export const History: React.FC = () => {
  const [city, setCity] = useState('Marrakech');
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [city]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await getHistory(city);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const droughtEvents = useMemo(() => {
    if (!data) return [];
    const events: DroughtEvent[] = [];
    let currentEvent: { startMonth: string; startYear: number; count: number; minSpi: number } | null = null;

    data.data.forEach(d => {
      const date = new Date(d.date);
      const monthName = date.toLocaleString('en-US', { month: 'long' });
      const year = date.getFullYear();

      if (d.spi < -1.0) {
        if (!currentEvent) {
          currentEvent = { startMonth: monthName, startYear: year, count: 1, minSpi: d.spi };
        } else {
          currentEvent.count++;
          currentEvent.minSpi = Math.min(currentEvent.minSpi, d.spi);
        }
      } else {
        if (currentEvent) {
          events.push({
            month: currentEvent.startMonth,
            year: currentEvent.startYear,
            severity: currentEvent.minSpi < -2.0 ? 'Extreme' : currentEvent.minSpi < -1.5 ? 'Severe' : 'Moderate',
            duration: currentEvent.count,
          });
          currentEvent = null;
        }
      }
    });
    return events.slice(-8).reverse();
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return null;
    const droughtMonths = data.data.filter(d => d.spi < -1.0).length;
    const totalMonths = data.data.length;
    const droughtFreq = ((droughtMonths / totalMonths) * 100).toFixed(1);

    const yearlyData: Record<number, number[]> = {};
    data.data.forEach(d => {
      const y = new Date(d.date).getFullYear();
      if (!yearlyData[y]) yearlyData[y] = [];
      yearlyData[y].push(d.precipitation);
    });

    const avgRainfall = Object.values(yearlyData)
      .map(arr => arr.reduce((a, b) => a + b, 0))
      .reduce((a, b) => a + b, 0) / Object.keys(yearlyData).length;

    const worstYear = Object.entries(yearlyData)
      .map(([y, arr]) => ({ year: parseInt(y), total: arr.reduce((a, b) => a + b, 0) }))
      .sort((a, b) => a.total - b.total)[0];

    return {
      totalDroughtMonths: droughtMonths,
      worstYear: worstYear?.year ?? 2000,
      avgAnnualRainfall: avgRainfall.toFixed(1),
      droughtFrequency: droughtFreq,
    };
  }, [data]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.data.map(d => ({
      date: d.date,
      spi: d.spi,
      precipitation: d.precipitation,
      year: new Date(d.date).getFullYear(),
    }));
  }, [data]);

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Historical Drought Timeline</h1>
          <p className="text-slate-400">Explore 25 years of climate data and drought patterns</p>
        </motion.div>

        <div className="flex justify-center mb-8">
          <div className="relative w-64">
            <button
              onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                {city}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${cityDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {cityDropdownOpen && (
              <div className="absolute z-20 w-full mt-2 max-h-60 overflow-y-auto bg-navy-800 border border-white/10 rounded-xl shadow-2xl">
                {CITY_NAMES.map(c => (
                  <button
                    key={c}
                    onClick={() => { setCity(c); setCityDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      city === c ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : data && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Calendar, label: 'Drought Months', value: stats?.totalDroughtMonths ?? 0, color: 'text-red-400' },
                { icon: TrendingDown, label: 'Worst Year', value: stats?.worstYear ?? '-', color: 'text-orange-400' },
                { icon: CloudRain, label: 'Avg Rainfall', value: `${stats?.avgAnnualRainfall ?? 0} mm`, color: 'text-blue-400' },
                { icon: BarChart3, label: 'Drought Freq', value: `${stats?.droughtFrequency ?? 0}%`, color: 'text-purple-400' },
              ].map((item, i) => (
                <GlassCard key={i} delay={i * 0.1} className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                    <span className="text-xs text-slate-400 uppercase tracking-wider">{item.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{item.value}</div>
                </GlassCard>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <GlassCard className="lg:col-span-2 p-6" delay={0.2}>
                <h3 className="text-lg font-bold text-white mb-4">SPI Index Over Time</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <defs>
                        <linearGradient id="spiGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="year"
                        stroke="#64748B"
                        fontSize={11}
                        tickFormatter={(v) => String(v)}
                      />
                      <YAxis stroke="#64748B" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1E293B',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#fff',
                        }}
                      />
                      <ReferenceLine y={-1} stroke="#EF4444" strokeDasharray="5 5" label="Drought Threshold" />
                      <Area type="monotone" dataKey="spi" stroke="#3B82F6" fill="url(#spiGrad)" strokeWidth={2} />
                      <Line type="monotone" dataKey="spi" stroke="#3B82F6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <GlassCard className="p-6" delay={0.3}>
                <h3 className="text-lg font-bold text-white mb-4">Recent Drought Events</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {droughtEvents.length > 0 ? droughtEvents.map((event, i) => (
                    <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-semibold text-sm">{event.month} {event.year}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          event.severity === 'Extreme' ? 'bg-red-500/20 text-red-400' :
                          event.severity === 'Severe' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {event.severity}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Duration: {event.duration} month{event.duration > 1 ? 's' : ''}
                      </div>
                    </div>
                  )) : (
                    <p className="text-slate-500 text-sm text-center py-8">No drought events recorded</p>
                  )}
                </div>
              </GlassCard>
            </div>

            <GlassCard className="p-6" delay={0.4}>
              <h3 className="text-lg font-bold text-white mb-4">Monthly Rainfall Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.slice(-60)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickFormatter={(d) => d.slice(0, 7)} />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="precipitation" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};
