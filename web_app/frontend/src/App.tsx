import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Predict } from './pages/Predict';
import { MapView } from './pages/MapView';
import { History } from './pages/History';
import { About } from './pages/About';
import { EconomicImpact } from './pages/EconomicImpact';

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

export const App: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-navy-900 text-white font-sans">
      <Navbar />
      <main className="min-h-screen">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/predict" element={<PageWrapper><Predict /></PageWrapper>} />
            <Route path="/map" element={<PageWrapper><MapView /></PageWrapper>} />
            <Route path="/history" element={<PageWrapper><History /></PageWrapper>} />
            <Route path="/impact" element={<PageWrapper><EconomicImpact /></PageWrapper>} />
            <Route path="/about" element={<PageWrapper><About /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
};

export default App;
