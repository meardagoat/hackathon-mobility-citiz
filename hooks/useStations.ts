'use client';
import { api } from '@/lib/api';
import { useApi } from './useApi';
import type { StationsParams } from '@/types/api';

export function useStations(params: StationsParams) {
  return useApi(() => api.stations(params), JSON.stringify(params));
}
