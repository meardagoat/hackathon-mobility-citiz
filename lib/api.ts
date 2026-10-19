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
   */
  async getCoverage(params?: CoverageParams): Promise<CoverageResponse> {
    const response = await apiClient.get<ApiResponse<CoverageResponse>>(
      '/mobility/coverage',
      { params }
    );
    return response.data.data;
  },

  /**
   * Obtenir les données de heat map
   */
  async getHeatMap(params?: HeatMapParams): Promise<HeatMapResponse> {
    const response = await apiClient.get<ApiResponse<HeatMapResponse>>(
      '/mobility/heatmap',
      { params }
    );
    return response.data.data;
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
   */
  async getStations(params?: StationsParams): Promise<StationsResponse> {
    const response = await apiClient.get<ApiResponse<StationsResponse>>(
      '/stations',
      { params }
    );
    return response.data.data;
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
   */
  async getSummaryStatistics(params?: SummaryParams): Promise<SummaryStatistics> {
    const response = await apiClient.get<ApiResponse<SummaryStatistics>>(
      '/statistics/summary',
      { params }
    );
    return response.data.data;
  },

  /**
   * Obtenir les statistiques de population
   */
  async getPopulationStatistics(): Promise<PopulationStatistics> {
    const response = await apiClient.get<ApiResponse<PopulationStatistics>>(
      '/statistics/population'
    );
    return response.data.data;
  },

  // --------------------------------------------------------------------------
  // RECOMMANDATIONS
  // --------------------------------------------------------------------------

  /**
   * Obtenir les recommandations d'emplacements
   */
  async getRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationsResponse> {
    const response = await apiClient.post<ApiResponse<RecommendationsResponse>>(
      '/recommendations',
      request
    );
    return response.data.data;
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
