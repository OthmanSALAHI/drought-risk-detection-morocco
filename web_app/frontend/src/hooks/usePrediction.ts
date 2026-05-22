import { useState, useCallback } from 'react';
import { predictDrought } from '../services/api';
import { PredictionResponse } from '../types';

interface UsePredictionReturn {
  result: PredictionResponse | null;
  loading: boolean;
  error: string | null;
  predict: (city: string, month: number, year: number) => Promise<void>;
  reset: () => void;
}

export const usePrediction = (): UsePredictionReturn => {
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predict = useCallback(async (city: string, month: number, year: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await predictDrought(city, month, year);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prediction');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, predict, reset };
};
