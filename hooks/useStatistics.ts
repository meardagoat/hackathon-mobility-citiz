'use client';
import { api } from '@/lib/api';
import { useApi } from './useApi';
import type { Area, PopulationGroupBy } from '@/types/api';

export function useSummary(area: Area) {
  return useApi(() => api.summary({ area }), area);
}

export function usePopulation(area: Area, groupBy: PopulationGroupBy) {
  return useApi(() => api.population({ area, group_by: groupBy }), `${area}|${groupBy}`);
}
