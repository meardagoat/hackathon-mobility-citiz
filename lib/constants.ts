import type { TransportType } from '@/types/api';

export const TRANSPORT_COLORS: Record<TransportType, string> = {
  bus: '#3b82f6',
  metro: '#ef4444',
  tram: '#22c55e',
  bike: '#f59e0b',
  carsharing: '#8b5cf6',
  scooter: '#ec4899',
};

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  bus: 'Bus',
  metro: 'Métro',
  tram: 'Tramway',
  bike: 'Vélo',
  carsharing: 'Autopartage',
  scooter: 'Trottinette',
};

export const TRANSPORT_ICONS: Record<TransportType, string> = {
  bus: '🚌',
  metro: '🚇',
  tram: '🚊',
  bike: '🚲',
  carsharing: '🚗',
  scooter: '🛴',
};

export const MAP_DEFAULT_CENTER: [number, number] = [48.8566, 2.3522];
export const MAP_DEFAULT_ZOOM = 11;

export const COLORS = {
  sidebar: '#111111',
  background: '#f8f9fa',
  card: '#ffffff',
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#1f2937',
  textSecondary: '#6b7280',
} as const;

export const MOCK_REGIONS = [
  { id: 'ile-de-france', name: 'Île-de-France' },
  { id: 'auvergne-rhone-alpes', name: 'Auvergne-Rhône-Alpes' },
  { id: 'provence-alpes-cote-azur', name: 'Provence-Alpes-Côte d\'Azur' },
  { id: 'occitanie', name: 'Occitanie' },
  { id: 'nouvelle-aquitaine', name: 'Nouvelle-Aquitaine' },
];

export const DEFAULT_COST_ESTIMATES: Partial<Record<TransportType, number>> = {
  bus: 150000,
  metro: 5000000,
  tram: 2000000,
  bike: 50000,
  carsharing: 80000,
  scooter: 20000,
};
