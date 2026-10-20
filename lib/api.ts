import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ApiResponse,
  ApiError,
  CoverageResponse,
  CoverageParams,
  HeatMapResponse,
  HeatMapParams,
  MobilityTypesResponse,
  StationsResponse,
  StationsParams,
  StationDetail,
  SummaryStatistics,
  SummaryParams,
  PopulationStatistics,
  RecommendationsResponse,
  RecommendationRequest,
  SimulationRequest,
  SimulationResponse,
  RecommendationDetail,
  RegionsResponse,
  MetadataResponse,
} from '@/types/api';
import { dataTransformers } from './dataTransformers';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const API_TIMEOUT = 30000; // 30 secondes

// ============================================================================
// INSTANCE AXIOS
// ============================================================================

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// INTERCEPTEURS
// ============================================================================

// Request interceptor (pour ajouter des tokens, logs, etc.)
apiClient.interceptors.request.use(
  (config) => {
    // Ajouter un token si nécessaire
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor (pour gérer les erreurs globalement)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiError>) => {
    if (error.response) {
      // Erreur du serveur
      console.error('[API] Response error:', error.response.status, error.response.data);
      
      // Gérer les erreurs spécifiques
      if (error.response.status === 401) {
        // Rediriger vers login si nécessaire
        console.error('Non autorisé');
      } else if (error.response.status === 429) {
        console.error('Trop de requêtes, veuillez réessayer plus tard');
      }
    } else if (error.request) {
      // Pas de réponse du serveur
      console.error('[API] No response from server');
    } else {
      // Erreur de configuration
      console.error('[API] Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// ============================================================================
// SERVICE API
// ============================================================================

export const api = {
  // --------------------------------------------------------------------------
  // MOBILITÉ & COUVERTURE
  // --------------------------------------------------------------------------
  
  /**
   * Obtenir la couverture de mobilité par zones
   * Transforme les données backend (carreaux) en format frontend (zones)
   */
  async getCoverage(params?: CoverageParams): Promise<CoverageResponse> {
    const response = await apiClient.get<any>(
      '/mobility/coverage',
      { params }
    );
    
    // Le backend renvoie un GeoJSON FeatureCollection
    // Extraire les features (carreaux)
    const features = response.data.features || [];
    const carreaux = features.map((f: any) => ({
      ...f.properties,
      lat: f.geometry?.coordinates?.[1],
      lon: f.geometry?.coordinates?.[0],
    }));
    
    const zones = dataTransformers.zones(carreaux);
    
    return {
      zones,
      metadata: {
        total_zones: zones.length,
        region: params?.region || 'Bordeaux Métropole',
        timestamp: new Date().toISOString(),
      },
    };
  },

  /**
   * Obtenir les données de heat map
   * Transforme les points backend en GeoJSON FeatureCollection
   */
  async getHeatMap(params?: HeatMapParams): Promise<HeatMapResponse> {
    const response = await apiClient.get<any>(
      '/mobility/heatmap',
      { params: { area: params?.region || 'bordeaux_metropole', ...params } }
    );
    
    // Le backend renvoie { points: [[lon, lat, value], ...] }
    const points = response.data.points || [];
    const valueRange = response.data.value_range || { min: 0, max: 1 };
    
    // Transformer en GeoJSON FeatureCollection
    const features = points.map((point: any[]) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point[0], point[1]], // [lon, lat]
      },
      properties: {
        intensity: valueRange.max > 0 ? point[2] / valueRange.max : 0, // Normaliser 0-1
        population: point[2],
        transport_options: 0, // Pas dans les données backend
      },
    }));
    
    return {
      type: 'FeatureCollection',
      features,
      legend: {
        min: 0,
        max: 1,
        colors: ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#3b82f6'],
        labels: ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'],
      },
    };
  },

  /**
   * Obtenir les types de mobilité disponibles
   */
  async getMobilityTypes(): Promise<MobilityTypesResponse> {
    const response = await apiClient.get<ApiResponse<MobilityTypesResponse>>(
      '/mobility/types'
    );
    return response.data.data;
  },

  // --------------------------------------------------------------------------
  // STATIONS
  // --------------------------------------------------------------------------

  /**
   * Lister les stations avec filtres
   * Transforme offre_existante en stations frontend
   */
  async getStations(params?: StationsParams): Promise<StationsResponse> {
    const response = await apiClient.get<any>(
      '/stations',
      { params }
    );
    
    // Le backend renvoie un GeoJSON FeatureCollection
    const features = response.data.features || [];
    const rawStations = features.map((f: any) => ({
      ...f.properties,
      lat: f.geometry?.coordinates?.[1],
      lon: f.geometry?.coordinates?.[0],
    }));
    
    const stations = dataTransformers.stations(rawStations);
    
    return {
      stations,
      pagination: {
        total: stations.length,
        limit: params?.limit || 100,
        offset: params?.offset || 0,
        has_more: false,
      },
    };
  },

  /**
   * Obtenir le détail d'une station
   */
  async getStationDetail(stationId: string): Promise<StationDetail> {
    const response = await apiClient.get<ApiResponse<StationDetail>>(
      `/stations/${stationId}`
    );
    return response.data.data;
  },

  // --------------------------------------------------------------------------
  // STATISTIQUES
  // --------------------------------------------------------------------------

  /**
   * Obtenir les statistiques globales
   * Calcule depuis les carreaux et stations
   */
  async getSummaryStatistics(params?: SummaryParams): Promise<SummaryStatistics> {
    try {
      const response = await apiClient.get<any>(
        '/statistics/summary',
        { params }
      );
      
      // Si le backend renvoie déjà les stats au bon format, les utiliser
      if (response.data.data?.population) {
        return response.data.data;
      }
      
      // Sinon, calculer depuis carreaux et stations
      const [carreaux, stations] = await Promise.all([
        this.getCoverage(params).then(r => r.zones.map((z: any) => z)),
        this.getStations(params).then(r => r.stations),
      ]);
      
      return dataTransformers.summaryStatistics(carreaux as any, stations as any);
    } catch (error) {
      console.error('[API] Error fetching summary statistics:', error);
      // Retourner des données par défaut en cas d'erreur
      return {
        region: params?.region || 'Bordeaux Métropole',
        population: { total: 0, covered: 0, coverage_rate: 0 },
        stations: { total: 0, by_type: { bus: 0, metro: 0, tram: 0, bike: 0, carsharing: 0, scooter: 0 } },
        accessibility: { well_served: 0, moderately_served: 0, poorly_served: 0 },
        avg_options_per_inhabitant: 0,
        avg_walking_time_minutes: 5,
      };
    }
  },

  /**
   * Obtenir les statistiques de population
   * Transforme depuis les carreaux avec niveau_acces
   */
  async getPopulationStatistics(): Promise<PopulationStatistics> {
    try {
      const response = await apiClient.get<any>('/statistics/population');
      
      // Si le backend renvoie déjà au bon format
      if (response.data.data?.distribution) {
        return response.data.data;
      }
      
      // Sinon, calculer depuis les carreaux
      const coverage = await this.getCoverage();
      const carreaux = coverage.zones as any;
      
      return {
        distribution: dataTransformers.populationDistribution(carreaux),
        by_region: [],
      };
    } catch (error) {
      console.error('[API] Error fetching population statistics:', error);
      // Retourner des données par défaut
      return {
        distribution: [
          { coverage_range: '0-0.2', label: 'Très faible', population: 0, percentage: 0, color: '#ef4444' },
          { coverage_range: '0.2-0.4', label: 'Faible', population: 0, percentage: 0, color: '#f59e0b' },
          { coverage_range: '0.4-0.6', label: 'Moyen', population: 0, percentage: 0, color: '#fbbf24' },
          { coverage_range: '0.6-0.8', label: 'Bon', population: 0, percentage: 0, color: '#84cc16' },
          { coverage_range: '0.8-1.0', label: 'Excellent', population: 0, percentage: 0, color: '#22c55e' },
        ],
        by_region: [],
      };
    }
  },

  // --------------------------------------------------------------------------
  // RECOMMANDATIONS
  // --------------------------------------------------------------------------

  /**
   * Obtenir les recommandations d'emplacements
   * Transforme les recommandations backend en format frontend
   */
  async getRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationsResponse> {
    const response = await apiClient.post<any>(
      '/recommendations',
      request
    );
    
    // Le backend renvoie un objet avec recommendations array
    const rawRecommendations = response.data.recommendations || [];
    
    return dataTransformers.recommendations(rawRecommendations);
  },

  /**
   * Simuler l'impact d'un emplacement
   */
  async simulateLocation(request: SimulationRequest): Promise<SimulationResponse> {
    const response = await apiClient.post<ApiResponse<SimulationResponse>>(
      '/recommendations/simulate',
      request
    );
    return response.data.data;
  },

  /**
   * Obtenir le détail d'une recommandation
   */
  async getRecommendationDetail(recommendationId: string): Promise<RecommendationDetail> {
    const response = await apiClient.get<ApiResponse<RecommendationDetail>>(
      `/recommendations/${recommendationId}`
    );
    return response.data.data;
  },

  // --------------------------------------------------------------------------
  // RÉGIONS
  // --------------------------------------------------------------------------

  /**
   * Lister les régions disponibles
   */
  async getRegions(): Promise<RegionsResponse> {
    const response = await apiClient.get<ApiResponse<RegionsResponse>>('/regions');
    return response.data.data;
  },

  // --------------------------------------------------------------------------
  // MÉTADONNÉES
  // --------------------------------------------------------------------------

  /**
   * Obtenir les métadonnées de l'API
   */
  async getMetadata(): Promise<MetadataResponse> {
    const response = await apiClient.get<ApiResponse<MetadataResponse>>('/metadata');
    return response.data.data;
  },
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Construire une chaîne de bounds pour les paramètres
 */
export function buildBoundsString(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number
): string {
  return `${minLng},${minLat},${maxLng},${maxLat}`;
}

/**
 * Parser une chaîne de bounds
 */
export function parseBoundsString(bounds: string) {
  const [minLng, minLat, maxLng, maxLat] = bounds.split(',').map(Number);
  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Formater les types de transport pour les paramètres
 */
export function formatTransportTypes(types: string[]): string {
  return types.join(',');
}

// ============================================================================
// EXPORT
// ============================================================================

export default api;
