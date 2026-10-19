// Types et interfaces pour l'API Hackathon Mobilité

// ============================================================================
// TYPES DE BASE
// ============================================================================

export type TransportType = 'bus' | 'metro' | 'tram' | 'bike' | 'carsharing' | 'scooter';

export type CoverageRange = '0-0.2' | '0.2-0.4' | '0.4-0.6' | '0.6-0.8' | '0.8-1.0';

export type Resolution = '200m' | 'iris' | 'commune';

export type Metric = 'coverage_score' | 'options_per_inhabitant' | 'population';

// ============================================================================
// GÉOMÉTRIE
// ============================================================================

export interface Point {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Polygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export type Geometry = Point | Polygon;

// ============================================================================
// RÉPONSES API
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// ============================================================================
// MOBILITÉ & COUVERTURE

export interface Zone {
  id: string;
  type: string;
  geometry: Polygon;
  properties: {
    population: number;
    coverage_score: number;
    transport_options: number;
    options_per_inhabitant: number;
    transport_types: Record<TransportType, number>;
    walking_time_avg: number;
  };
}

export interface CoverageResponse {
  zones: Zone[];
  metadata: {
    total_zones: number;
    region: string;
    timestamp: string;
  };
}

export interface HeatMapFeature {
  type: 'Feature';
  geometry: Point;
  properties: {
    intensity: number;
    population: number;
    transport_options: number;
  };
}

export interface HeatMapResponse {
  type: 'FeatureCollection';
  features: HeatMapFeature[];
  legend: {
    min: number;
    max: number;
    colors: string[];
    labels: string[];
  };
}

export interface MobilityType {
  id: TransportType;
  name: string;
  icon: string;
  color: string;
  total_stations: number;
}

export interface MobilityTypesResponse {
  types: MobilityType[];
}

// ============================================================================
// STATIONS
// ============================================================================

export interface Station {
  id: string;
  name: string;
  type: TransportType;
  operator: string;
  location: Point;
  population_served: number;
  walking_radius_m: number;
  lines?: string[];
  status: 'active' | 'inactive' | 'maintenance';
  capacity?: number;
  vehicles_available?: number;
}

export interface StationDetail extends Station {
  address: string;
  nearby_amenities: {
    shops: number;
    offices: number;
    housing_units: number;
  };
  coverage_area: Polygon;
  accessibility?: {
    wheelchair: boolean;
    elevator: boolean;
    audio_guidance: boolean;
  };
}

export interface StationsResponse {
  stations: Station[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// ============================================================================
// STATISTIQUES
// ============================================================================

export interface SummaryStatistics {
  region: string;
  population: {
    total: number;
    covered: number;
    coverage_rate: number;
  };
  stations: {
    total: number;
    by_type: Record<TransportType, number>;
  };
  accessibility: {
    well_served: number;
    moderately_served: number;
    poorly_served: number;
  };
  avg_options_per_inhabitant: number;
  avg_walking_time_minutes: number;
}

export interface PopulationDistribution {
  coverage_range: CoverageRange;
  label: string;
  population: number;
  percentage: number;
  color: string;
}

export interface RegionStats {
  region: string;
  avg_coverage: number;
  population: number;
}

export interface PopulationStatistics {
  distribution: PopulationDistribution[];
  by_region: RegionStats[];
}

// ============================================================================
// RECOMMANDATIONS
// ============================================================================

export interface RecommendationRequest {
  region: string;
  budget: number;
  transport_types: TransportType[];
  constraints: {
    min_population?: number;
    max_distance_existing?: number;
    prioritize?: 'underserved_areas' | 'high_density' | 'cost_efficiency';
  };
  cost_estimates: Partial<Record<TransportType, number>>;
}

export interface RecommendationImpact {
  new_population_served: number;
  coverage_improvement: number;
  existing_coverage: number;
  projected_coverage: number;
  overlap_with_existing?: number;
}

export interface Recommendation {
  id: string;
  rank: number;
  location: Point;
  address: string;
  transport_type: TransportType;
  estimated_cost: number;
  impact: RecommendationImpact;
  justification: string;
  score: number;
  nearby_facilities: {
    metro_stations?: number;
    bus_stops?: number;
    offices?: number;
    residential_density: 'low' | 'medium' | 'high';
  };
}

export interface RecommendationSummary {
  total_recommendations: number;
  total_cost: number;
  total_new_population: number;
  avg_coverage_improvement: number;
  budget_used: number;
  budget_remaining: number;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  summary: RecommendationSummary;
  optimization_method: string;
  computation_time_ms: number;
}

export interface SimulationRequest {
  location: Point;
  transport_type: TransportType;
  walking_radius_m: number;
}

export interface SimulationResponse {
  location: Point;
  transport_type: TransportType;
  impact: RecommendationImpact;
  coverage_area: Polygon;
  demographics: {
    total_population: number;
    already_served: number;
    newly_served: number;
    avg_income: number;
    car_ownership_rate: number;
  };
  score: number;
  warnings: string[];
}

export interface RecommendationDetail extends Recommendation {
  detailed_analysis: {
    population_breakdown: {
      '0-18': number;
      '18-35': number;
      '35-65': number;
      '65+': number;
    };
    employment: {
      employed: number;
      unemployed: number;
      students: number;
    };
    transport_habits: {
      public_transport: number;
      car: number;
      bike: number;
    };
  };
  created_at: string;
}

// ============================================================================
// RÉGIONS
// ============================================================================

export interface Region {
  id: string;
  name: string;
  type: 'region' | 'city' | 'department';
  population: number;
  area_km2: number;
  stations_count: number;
  coverage_rate: number;
  parent_region?: string;
  bounds: {
    min_lng: number;
    min_lat: number;
    max_lng: number;
    max_lat: number;
  };
}

export interface RegionsResponse {
  regions: Region[];
}

// ============================================================================
// MÉTADONNÉES
// ============================================================================

export interface DataSource {
  name: string;
  type: string;
  url: string;
  last_sync?: string;
  year?: number;
}

export interface MetadataResponse {
  api_version: string;
  last_data_update: string;
  data_sources: DataSource[];
  coverage: {
    regions: number;
    cities: number;
    stations: number;
    population_covered: number;
  };
  model_info: {
    version: string;
    algorithm: string;
    trained_on: string;
    accuracy: number;
  };
}

// ============================================================================
// PARAMÈTRES DE REQUÊTE
// ============================================================================

export interface CoverageParams {
  region?: string;
  min_coverage?: number;
  transport_types?: string;
  resolution?: Resolution;
}

export interface HeatMapParams {
  region?: string;
  bounds?: string;
  metric?: Metric;
}

export interface StationsParams {
  type?: TransportType;
  region?: string;
  bounds?: string;
  min_population?: number;
  limit?: number;
  offset?: number;
}

export interface SummaryParams {
  region?: string;
}

// ============================================================================
// HELPERS TYPES
// ============================================================================

export type BoundsString = `${number},${number},${number},${number}`;

export interface LatLngBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface MapCenter {
  lat: number;
  lng: number;
  zoom: number;
}
