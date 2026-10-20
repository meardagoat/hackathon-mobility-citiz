// Types de l'API backend v1.1 (backend/app/schemas.py)

export type Area = 'bordeaux_metropole' | 'gironde';
export type DataMode = 'mock' | 'real';

export type StationType =
  | 'bus'
  | 'tram'
  | 'metro'
  | 'train'
  | 'ferry'
  | 'bike'
  | 'scooter'
  | 'carsharing'
  | 'citiz'
  | 'other';

export type StationSource = 'gtfs' | 'gbfs' | 'mock';
export type CoverageLevel = 'none' | 'low' | 'medium' | 'high';
export type HeatmapMetric = 'population' | 'accessibility_score' | 'underserved_population';
export type HeatmapResolution = '200m' | '1km';
export type PopulationGroupBy = 'coverage_level' | 'commune' | 'station_type';
export type EquipmentType = 'citiz_station' | 'bus_stop' | 'bike_station';
export type Perimeter = 'tous' | 'citiz';

export type Position = [number, number];

export interface Meta {
  api_version: string;
  data_mode: DataMode;
  area: Area;
  data_collected_at: string | null;
  accessibility_available: boolean;
  recommendations_available: boolean;
}

export interface CollectionMeta extends Meta {
  total_features: number;
  returned_features: number;
  truncated: boolean;
}

export interface SummaryMeta extends Meta {
  coverage_thresholds: { low_max: number; medium_max: number } | null;
}

export interface PointGeometry {
  type: 'Point';
  coordinates: Position;
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface Feature<G, P> {
  type: 'Feature';
  geometry: G;
  properties: P;
}

export interface FeatureCollection<G, P> {
  type: 'FeatureCollection';
  meta: CollectionMeta;
  features: Feature<G, P>[];
}

export interface CoverageProperties {
  zone_id: string;
  population: number | null;
  is_estimated: boolean;
  commune_codes: string[];
  options_count: number | null;
  options_by_type: Partial<Record<StationType, number>> | null;
  options_per_1000_inhabitants: number | null;
  accessibility_score: number | null;
  coverage_level: CoverageLevel | null;
}

export type CoverageResponse = FeatureCollection<PolygonGeometry, CoverageProperties>;

export interface StationProperties {
  station_id: string;
  name: string;
  type: StationType;
  modes: StationType[];
  operator: string;
  source: StationSource;
  capacity: number | null;
  population_served: number | null;
}

export type StationFeature = Feature<PointGeometry, StationProperties>;
export type StationsResponse = FeatureCollection<PointGeometry, StationProperties>;

export interface HeatmapResponse {
  meta: CollectionMeta;
  metric: HeatmapMetric;
  resolution: HeatmapResolution;
  metric_available: boolean;
  masked_zones_count: number;
  value_range: { min: number; max: number } | null;
  points: [number, number, number][];
}

export interface CitizSummary {
  stations_count: number;
  stations_per_100k_inhabitants: number | null;
  population_within_5min: number | null;
  population_within_5min_share: number | null;
}

export interface SummaryResponse {
  meta: SummaryMeta;
  population_total: number;
  zones_count: number;
  masked_zones_count: number;
  stations_count: number;
  stations_by_type: Record<StationType, number>;
  citiz: CitizSummary;
  population_by_coverage_level: Record<CoverageLevel, number> | null;
  population_with_any_option: number | null;
  population_with_any_option_share: number | null;
}

export interface PopulationGroup {
  key: string;
  population: number;
  share: number | null;
  zones_count: number;
  masked_zones_count: number;
}

export interface PopulationStatsResponse {
  meta: Meta;
  group_by: PopulationGroupBy;
  available: boolean;
  additive: boolean;
  population_total: number;
  masked_zones_count: number;
  groups: PopulationGroup[];
}

export interface RecommendationRequest {
  budget: number;
  equipment_types?: EquipmentType[];
  max_results?: number;
  area?: Area;
}

export interface Recommendation {
  rank: number;
  location_id: string;
  equipment_type: EquipmentType;
  lat: number;
  lon: number;
  commune_code: string;
  cost: number;
  cumulative_cost: number;
  population_gained: number;
  estimated_value: number | null;
  score: number | null;
  adequation: number | null;
  cars_avoided: number | null;
}

export interface RecommendationResponse {
  meta: Meta;
  budget: number;
  perimeter: Perimeter | null;
  total_cost: number;
  remaining_budget: number;
  total_population_gained: number | null;
  population_gained_by_type: Partial<Record<EquipmentType, number>> | null;
  recommendations: Recommendation[];
}

export interface AreaParams {
  area?: Area;
  bbox?: string;
}

export interface CoverageParams extends AreaParams {
  limit?: number;
  coverage_level?: CoverageLevel[];
}

export interface HeatmapParams extends AreaParams {
  metric?: HeatmapMetric;
  resolution?: HeatmapResolution;
}

export interface StationsParams extends AreaParams {
  type?: StationType[];
  limit?: number;
}

export interface PopulationParams extends AreaParams {
  group_by?: PopulationGroupBy;
}
