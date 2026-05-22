import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, MapPin, Brain, Zap,
  CloudRain, Thermometer, BarChart3, Database,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { StatCounter } from '../components/ui/StatCounter';

const FloatingParticle: React.FC<{ delay: number; x: string; size: number }> = ({ delay, x, size }) => (
  <motion.div
    className="absolute rounded-full bg-blue-400/20 blur-sm"
    style={{ width: size, height: size, left: x, top: '100%' }}
    animate={{ y: ['0vh', '-120vh'], opacity: [0, 0.6, 0] }}
    transition={{ duration: 12 + Math.random() * 8, repeat: Infinity, delay, ease: 'linear' }}
  />
);

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
        {[...Array(12)].map((_, i) => (
          <FloatingParticle key={i} delay={i * 1.2} x={`${5 + i * 8}%`} size={4 + (i % 3) * 3} />
        ))}

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              AI-Powered Climate Intelligence
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6"
          >
            Morocco Drought
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
              Prediction System
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            AI-powered early warning system using Machine Learning to predict drought risk across Moroccan cities with real-time climate data.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/predict"
              className="group flex items-center gap-2 px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              Predict Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/map"
              className="flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all"
            >
              <MapPin className="w-5 h-5" />
              View Map
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="py-20 relative">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCounter end={40} suffix="+" label="Cities Monitored" />
            <StatCounter end={25} suffix="" label="Years of Climate Data" />
            <StatCounter end={14000} suffix="+" label="Training Samples" />
            <StatCounter end={91} suffix="%+" label="Model Accuracy" />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Three simple steps to get your drought risk prediction</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: MapPin, step: '01', title: 'Select Location', desc: 'Choose your city and month from our comprehensive list of 40+ Moroccan cities.' },
              { icon: CloudRain, step: '02', title: 'AI Fetches Data', desc: 'Our system automatically retrieves real climate data from Open-Meteo API.' },
              { icon: Brain, step: '03', title: 'Get Prediction', desc: 'Receive instant drought risk assessment with confidence scores and insights.' },
            ].map((item, i) => (
              <GlassCard key={i} delay={i * 0.15} className="p-8">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-6">
                  <item.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-blue-400 text-sm font-bold mb-3">Step {item.step}</div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">{item.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Powered By</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Cutting-edge technologies behind our prediction engine</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Database, title: 'Python / scikit-learn', desc: 'Robust ML model training with Random Forest classifier' },
              { icon: CloudRain, title: 'Open-Meteo API', desc: 'Real-time and historical climate data for Morocco' },
              { icon: BarChart3, title: 'Random Forest', desc: 'Ensemble learning algorithm for high accuracy predictions' },
              { icon: Thermometer, title: '25 Years of Data', desc: 'Comprehensive Moroccan climate records since 2000' },
            ].map((item, i) => (
              <GlassCard key={i} delay={i * 0.1} className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
