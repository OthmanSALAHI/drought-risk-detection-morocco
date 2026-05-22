import React from 'react';
import { motion } from 'framer-motion';
import {
  Droplets, Brain, Database, CloudRain, BarChart3,
  Github, ArrowRight, Globe, Shield,
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">About the Project</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Understanding the science and technology behind Morocco DroughtWatch
          </p>
        </motion.div>

        <GlassCard className="p-8 mb-8" delay={0.1}>
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Droplets className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Project Overview</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Morocco DroughtWatch is an AI-powered early warning system designed to predict drought risk across Moroccan cities.
                Using machine learning models trained on 25 years of historical climate data, the system provides accurate,
                real-time drought risk assessments to help communities, farmers, and policymakers prepare for and mitigate
                the impacts of drought.
              </p>
              <p className="text-slate-300 leading-relaxed">
                The platform integrates data from Open-Meteo API and applies a Random Forest classifier to analyze
                precipitation, temperature, evapotranspiration, and SPI to deliver actionable insights.
              </p>
            </div>
          </div>
        </GlassCard>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Why Morocco?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Globe, stat: '40+', label: 'Cities Monitored', desc: 'Comprehensive coverage across all Moroccan regions from Tangier to Dakhla.' },
              { icon: Shield, stat: '25 Years', label: 'Historical Data', desc: 'Rich climate dataset spanning from 2000 to present for robust model training.' },
              { icon: BarChart3, stat: '91%+', label: 'Model Accuracy', desc: 'High-precision predictions using ensemble learning with Random Forest algorithm.' },
            ].map((item, i) => (
              <GlassCard key={i} delay={i * 0.15} className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-blue-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{item.stat}</div>
                <div className="text-blue-400 font-semibold text-sm mb-3">{item.label}</div>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Methodology</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Database,
                title: 'Data Sources',
                desc: 'We use Open-Meteo API for real-time climate data and CHIRPS satellite rainfall estimates. The dataset includes monthly precipitation, mean temperature, potential evapotranspiration (ET0), and derived water balance metrics.',
              },
              {
                icon: Brain,
                title: 'Feature Engineering',
                desc: 'Key features include SPI (Standardized Precipitation Index), water balance (P - ET0), seasonal indicators, and rolling averages. These engineered features capture both short-term anomalies and long-term climate trends.',
              },
              {
                icon: BarChart3,
                title: 'Random Forest Model',
                desc: 'Our ensemble classifier uses 100+ decision trees with optimized hyperparameters. It handles non-linear relationships well and provides feature importance rankings, making predictions interpretable and reliable.',
              },
              {
                icon: CloudRain,
                title: 'SPI Calculation',
                desc: 'The Standardized Precipitation Index is computed by fitting a gamma distribution to historical precipitation data, then transforming to a standard normal distribution. SPI < -1.0 indicates drought conditions.',
              },
            ].map((item, i) => (
              <GlassCard key={i} delay={i * 0.1} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        <GlassCard className="p-8 text-center" delay={0.3}>
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <Github className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Open Source Project</h2>
          <p className="text-slate-400 max-w-lg mx-auto mb-6">
            This project is built with transparency and collaboration in mind. The full source code, model training pipeline,
            and dataset preparation scripts are available on GitHub.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all"
          >
            <Github className="w-5 h-5" />
            View on GitHub
            <ArrowRight className="w-4 h-4" />
          </a>
        </GlassCard>
      </div>
    </div>
  );
};
