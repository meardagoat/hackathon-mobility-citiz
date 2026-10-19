'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Station, StationsParams } from '@/types/api';

export function useStations(params?: StationsParams) {
  const [stations, setStations] = useState<Station[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.getStations(params)
      .then((res) => {
        if (!cancelled) {
          setStations(res.stations);
          setTotal(res.pagination.total);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Impossible de charger les stations.');
          // Minimal mock fallback
          setStations([
            { id: 's1', name: 'Gare du Nord', type: 'metro', operator: 'RATP', location: { type: 'Point', coordinates: [2.3553, 48.8809] }, population_served: 42000, walking_radius_m: 400, status: 'active' },
            { id: 's2', name: 'Châtelet', type: 'metro', operator: 'RATP', location: { type: 'Point', coordinates: [2.3477, 48.8584] }, population_served: 67000, walking_radius_m: 400, status: 'active' },
            { id: 's3', name: 'Nation', type: 'metro', operator: 'RATP', location: { type: 'Point', coordinates: [2.3956, 48.8483] }, population_served: 31000, walking_radius_m: 400, status: 'active' },
            { id: 's4', name: 'Vélib Station 12e', type: 'bike', operator: 'Velib', location: { type: 'Point', coordinates: [2.3870, 48.8499] }, population_served: 5200, walking_radius_m: 300, status: 'active' },
            { id: 's5', name: 'Autolib Bastille', type: 'carsharing', operator: 'Autolib', location: { type: 'Point', coordinates: [2.3693, 48.8534] }, population_served: 7800, walking_radius_m: 350, status: 'inactive' },
          ]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [key]);

  return { stations, total, loading, error };
}
