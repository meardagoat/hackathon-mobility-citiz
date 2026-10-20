'use client';
import { api } from '@/lib/api';
import { useApi } from './useApi';
import type { HeatmapParams } from '@/types/api';

export function useHeatmap(params: HeatmapParams) {
  return useApi(() => api.heatmap(params), JSON.stringify(params));
}
