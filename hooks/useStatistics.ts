'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { SummaryStatistics, PopulationStatistics } from '@/types/api';

// Données de démonstration Bordeaux Métropole (selon DATA-CONTRACT.md)
const MOCK_SUMMARY: SummaryStatistics = {
  region: 'Bordeaux Métropole',
  population: {
    total: 815200, // Population Bordeaux Métropole
    covered: 786600, // 96.5% couverts
    coverage_rate: 0.965,
  },
  stations: {
    total: 5810, // Selon DATA-CONTRACT.md
    by_type: {
      bus: 3200,
      metro: 0, // Pas de métro à Bordeaux
      tram: 120,
      bike: 1800, // Vélo partagé
      carsharing: 690, // Citiz
      scooter: 0, // Free-floating exclu
    },
  },
  accessibility: {
    well_served: 0.65,
    moderately_served: 0.28,
    poorly_served: 0.07,
  },
  avg_options_per_inhabitant: 0.042,
  avg_walking_time_minutes: 5,
};

const MOCK_POPULATION: PopulationStatistics = {
  distribution: [
    {
      coverage_range: '0-0.2',
      label: 'Très faible',
      population: 57064, // 7%
      percentage: 7,
      color: '#ef4444',
    },
    {
      coverage_range: '0.2-0.4',
      label: 'Faible',
      population: 81520, // 10%
      percentage: 10,
      color: '#f59e0b',
    },
    {
      coverage_range: '0.4-0.6',
      label: 'Moyen',
      population: 228256, // 28%
      percentage: 28,
      color: '#fbbf24',
    },
    {
      coverage_range: '0.6-0.8',
      label: 'Bon',
      population: 285320, // 35%
      percentage: 35,
      color: '#84cc16',
    },
    {
      coverage_range: '0.8-1.0',
      label: 'Excellent',
      population: 163040, // 20%
      percentage: 20,
      color: '#22c55e',
    },
  ],
  by_region: [
    { region: 'Bordeaux', avg_coverage: 0.89, population: 257068 },
    { region: 'Mérignac', avg_coverage: 0.81, population: 70919 },
    { region: 'Pessac', avg_coverage: 0.75, population: 64707 },
    { region: 'Talence', avg_coverage: 0.85, population: 43897 },
  ],
};

export function useStatistics(region?: string) {
  const [summary, setSummary] = useState<SummaryStatistics>(MOCK_SUMMARY);
  const [population, setPopulation] = useState<PopulationStatistics>(MOCK_POPULATION);
  const [loading, setLoading] = useState(false); // false pour afficher directement les mock data
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    // Essayer de charger les vraies données du backend
    setLoading(true);
    setError(null);

    Promise.all([
      api.getSummaryStatistics(region ? { region } : undefined),
      api.getPopulationStatistics(),
    ])
      .then(([s, p]) => {
        if (!cancelled) {
          // Vérifier que les données ne sont pas vides
          if (s.population.total > 0) {
            setSummary(s);
          }
          if (p.distribution.some(d => d.population > 0)) {
            setPopulation(p);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('Backend non disponible, utilisation des données de démonstration', err);
          // Garder les mock data
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [region]);

  return { summary, population, loading, error };
}
