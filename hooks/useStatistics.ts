'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { SummaryStatistics, PopulationStatistics } from '@/types/api';

export function useStatistics(region?: string) {
  const [summary, setSummary] = useState<SummaryStatistics | null>(null);
  const [population, setPopulation] = useState<PopulationStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getSummaryStatistics(region ? { region } : undefined),
      api.getPopulationStatistics(),
    ])
      .then(([s, p]) => {
        if (!cancelled) {
          setSummary(s);
          setPopulation(p);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Impossible de charger les statistiques. Données fictives affichées.');
          // Mock data fallback
          setSummary({
            region: 'Île-de-France',
            population: { total: 12174880, covered: 9500000, coverage_rate: 0.78 },
            stations: { total: 4820, by_type: { bus: 2100, metro: 380, tram: 290, bike: 1200, carsharing: 650, scooter: 200 } },
            accessibility: { well_served: 6200000, moderately_served: 2400000, poorly_served: 3574880 },
            avg_options_per_inhabitant: 0.038,
            avg_walking_time_minutes: 7.4,
          });
          setPopulation({
            distribution: [
              { coverage_range: '0-0.2', label: 'Très faible', population: 1200000, percentage: 9.9, color: '#ef4444' },
              { coverage_range: '0.2-0.4', label: 'Faible', population: 2374880, percentage: 19.5, color: '#f59e0b' },
              { coverage_range: '0.4-0.6', label: 'Modérée', population: 2200000, percentage: 18.1, color: '#eab308' },
              { coverage_range: '0.6-0.8', label: 'Bonne', population: 3200000, percentage: 26.3, color: '#22c55e' },
              { coverage_range: '0.8-1.0', label: 'Excellente', population: 3200000, percentage: 26.3, color: '#3b82f6' },
            ],
            by_region: [
              { region: 'Paris', avg_coverage: 0.92, population: 2161000 },
              { region: 'Hauts-de-Seine', avg_coverage: 0.81, population: 1609306 },
              { region: 'Val-de-Marne', avg_coverage: 0.71, population: 1387926 },
              { region: 'Seine-Saint-Denis', avg_coverage: 0.68, population: 1623111 },
            ],
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [region]);

  return { summary, population, loading, error };
}
