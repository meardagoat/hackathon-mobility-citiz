import axios, { AxiosError } from 'axios';
import type {
  CoverageParams,
  CoverageResponse,
  HeatmapParams,
  HeatmapResponse,
  PopulationParams,
  PopulationStatsResponse,
  RecommendationRequest,
  RecommendationResponse,
  StationsParams,
  StationsResponse,
  SummaryResponse,
  AreaParams,
} from '@/types/api';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  paramsSerializer: { indexes: null },
});

interface ValidationIssue {
  loc?: (string | number)[];
  msg?: string;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number | null) {
    super(message);
    this.name = 'ApiError';
  }
}

function describe(detail: unknown): string | null {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = (detail as ValidationIssue[])
      .map((issue) => {
        const field = issue.loc?.filter((part) => part !== 'body' && part !== 'query').join('.');
        return field ? `${field} : ${issue.msg}` : issue.msg;
      })
      .filter(Boolean);
    return messages.length ? messages.join(' ; ') : null;
  }
  return null;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    if (error.response) {
      const detail = describe((error.response.data as { detail?: unknown } | undefined)?.detail);
      return new ApiError(detail ?? `Erreur HTTP ${error.response.status}`, error.response.status);
    }
    return new ApiError(`API injoignable (${API_BASE_URL})`, null);
  }
  return new ApiError(error instanceof Error ? error.message : 'Erreur inconnue', null);
}

async function get<T>(path: string, params?: object): Promise<T> {
  try {
    return (await client.get<T>(path, { params })).data;
  } catch (error) {
    throw toApiError(error);
  }
}

async function post<T>(path: string, body: object): Promise<T> {
  try {
    return (await client.post<T>(path, body)).data;
  } catch (error) {
    throw toApiError(error);
  }
}

export const api = {
  coverage: (params?: CoverageParams) => get<CoverageResponse>('/mobility/coverage', params),
  heatmap: (params?: HeatmapParams) => get<HeatmapResponse>('/mobility/heatmap', params),
  stations: (params?: StationsParams) => get<StationsResponse>('/stations', params),
  summary: (params?: AreaParams) => get<SummaryResponse>('/statistics/summary', params),
  population: (params?: PopulationParams) => get<PopulationStatsResponse>('/statistics/population', params),
  recommendations: (request: RecommendationRequest) => post<RecommendationResponse>('/recommendations', request),
};
