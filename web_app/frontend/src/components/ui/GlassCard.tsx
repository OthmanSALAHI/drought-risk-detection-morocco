import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl ${className}`}
    >
      {/* gradient overlay — clipped independently so dropdowns can escape */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
      </div>
      {/* children rendered without z-index isolation so inner dropdowns can stack freely */}
      <div className="relative">{children}</div>
    </motion.div>
  );
};
