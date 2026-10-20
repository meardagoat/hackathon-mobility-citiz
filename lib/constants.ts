import type { Area, CoverageLevel, EquipmentType, Perimeter, StationType } from '@/types/api';

export const DEFAULT_AREA: Area = 'bordeaux_metropole';

export const STATION_TYPES: StationType[] = [
  'bus', 'tram', 'metro', 'train', 'ferry', 'bike', 'scooter', 'carsharing', 'citiz', 'other',
];

export const STATION_COLORS: Record<StationType, string> = {
  bus: '#5b8cff',
  tram: '#3de0ff',
  metro: '#ef4444',
  train: '#0f766e',
  ferry: '#7ef0d0',
  bike: '#ffb547',
  scooter: '#ec4899',
  carsharing: '#a855f7',
  citiz: '#b28cff',
  other: '#6b7280',
};

export const STATION_LABELS: Record<StationType, string> = {
  bus: 'Bus',
  tram: 'Tramway',
  metro: 'Métro',
  train: 'Train',
  ferry: 'Bateau',
  bike: 'Vélo en station',
  scooter: 'Trottinette',
  carsharing: 'Autopartage (hors Citiz)',
  citiz: 'Citiz',
  other: 'Autre',
};

export const STATION_ICONS: Record<StationType, string> = {
  bus: '🚌',
  tram: '🚊',
  metro: '🚇',
  train: '🚆',
  ferry: '⛴️',
  bike: '🚲',
  scooter: '🛴',
  carsharing: '🚙',
  citiz: '🚗',
  other: '📍',
};

export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  citiz_station: 'Station Citiz',
  bus_stop: 'Arrêt de bus',
  bike_station: 'Station vélo',
};

export const EQUIPMENT_COLORS: Record<EquipmentType, string> = {
  citiz_station: STATION_COLORS.citiz,
  bus_stop: STATION_COLORS.bus,
  bike_station: STATION_COLORS.bike,
};

export const COVERAGE_LEVEL_LABELS: Record<CoverageLevel, string> = {
  none: 'Aucune option',
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
};

export const COVERAGE_LEVEL_COLORS: Record<CoverageLevel, string> = {
  none: '#ff5c7a',
  low: '#f59e0b',
  medium: '#1478a0',
  high: '#3de0ff',
};

export const BUDGET_SCENARIOS = [100_000, 250_000, 500_000, 1_000_000] as const;

export const PERIMETERS: Record<Perimeter, { label: string; equipment_types: EquipmentType[] }> = {
  tous: { label: 'Tous les équipements (Citiz, bus, vélo)', equipment_types: ['citiz_station', 'bus_stop', 'bike_station'] },
  citiz: { label: 'Citiz uniquement', equipment_types: ['citiz_station'] },
};

export const MAX_RECOMMENDATIONS = 100;

export const MAP_DEFAULT_CENTER: [number, number] = [44.8378, -0.5792];
export const MAP_DEFAULT_ZOOM = 12;
