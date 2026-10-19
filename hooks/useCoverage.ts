'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { HeatMapResponse, HeatMapParams } from '@/types/api';

export function useCoverage(params?: HeatMapParams) {
  const [heatmap, setHeatmap] = useState<HeatMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.getHeatMap(params)
      .then((res) => { if (!cancelled) setHeatmap(res); })
      .catch(() => {
        if (!cancelled) {
          setError('Impossible de charger la heat map.');
          // Mock heatmap
          setHeatmap({
            type: 'FeatureCollection',
            features: [
              { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3522, 48.8566] }, properties: { intensity: 0.9, population: 45000, transport_options: 15 } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3700, 48.8700] }, properties: { intensity: 0.3, population: 12000, transport_options: 4 } },
              { type: 'Feature', geometry: { type: 'Point', coordinates: [2.3200, 48.8400] }, properties: { intensity: 0.6, population: 28000, transport_options: 9 } },
            ],
            legend: { min: 0, max: 1, colors: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'], labels: ['Faible', 'Modéré', 'Bon', 'Excellent'] },
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [key]);

  return { heatmap, loading, error };
}
