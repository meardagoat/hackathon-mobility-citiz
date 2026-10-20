/**
 * Transformations des données backend vers format frontend
 * 
 * Le backend utilise le format de DATA-CONTRACT.md (lat/lon, noms de champs différents)
 * Le frontend utilise le format GeoJSON standard ([longitude, latitude])
 */

import type {
  Zone,
  Station,
  Recommendation,
  HeatMapFeature,
  TransportType,
  SummaryStatistics,
  PopulationDistribution,
} from '@/types/api';

// ============================================================================
// MAPPING DES TYPES DE TRANSPORT
// ============================================================================

/**
 * Mapping types backend → types frontend
 * Backend: bus, tram, metro, train, bateau, velo, citiz
 * Frontend: bus, metro, tram, bike, carsharing, scooter
 */
export const BACKEND_TYPE_MAPPING: Record<string, TransportType> = {
  bus: 'bus',
  tram: 'tram',
  metro: 'metro',
  train: 'metro', // Train mappé vers metro
  bateau: 'bus', // Bateau mappé vers bus (transport en commun)
  velo: 'bike',
  citiz: 'carsharing',
};

export function mapTransportType(backendType: string): TransportType {
  return BACKEND_TYPE_MAPPING[backendType.toLowerCase()] || 'bus';
}

// ============================================================================
// HELPERS GÉOMÉTRIE
// ============================================================================

/**
 * Génère un polygone carré de 200m autour d'un point central
 * Backend donne (lat, lon), on crée un carré pour la visualisation
 */
function generateSquarePolygon(lon: number, lat: number, sizeMeters: number = 200): number[][][] {
  // Approximation simple : 1 degré ≈ 111 km
  const halfSize = (sizeMeters / 2) / 111000;
  
  return [[
    [lon - halfSize, lat - halfSize],
    [lon + halfSize, lat - halfSize],
    [lon + halfSize, lat + halfSize],
    [lon - halfSize, lat + halfSize],
    [lon - halfSize, lat - halfSize], // Fermer le polygone
  ]];
}

// ============================================================================
// TRANSFORMATION ZONES (CARREAUX)
// ============================================================================

/**
 * Transforme un carreau backend en Zone frontend
 * 
 * Backend (DATA-CONTRACT.md carreaux) :
 * - id_carreau, code_commune, lat, lon
 * - population, nb_options, options_par_habitant
 * - nb_bus, nb_tram, nb_velo, nb_citiz
 * - niveau_acces (1-5), donnee_masquee
 */
export function transformZone(carreau: any): Zone {
  // Ne pas afficher les données des carreaux masqués (< 11 ménages)
  const isMasked = carreau.donnee_masquee === true;
  
  return {
    id: carreau.id_carreau,
    type: 'grid_200m',
    geometry: {
      type: 'Polygon',
      coordinates: generateSquarePolygon(carreau.lon, carreau.lat, 200),
    },
    properties: {
      population: isMasked ? 0 : (carreau.population || 0),
      coverage_score: isMasked ? 0 : (carreau.options_par_habitant || 0),
      transport_options: carreau.nb_options || 0,
      options_per_inhabitant: isMasked ? 0 : (carreau.options_par_habitant || 0),
      transport_types: {
        bus: carreau.nb_bus || 0,
        metro: 0, // Pas de métro à Bordeaux
        tram: carreau.nb_tram || 0,
        bike: carreau.nb_velo || 0,
        carsharing: carreau.nb_citiz || 0,
        scooter: 0, // Pas de scooter dans les données
      },
      walking_time_avg: 5, // 5 min = rayon 400m
    },
  };
}

/**
 * Transforme une liste de carreaux
 */
export function transformZones(carreaux: any[]): Zone[] {
  return carreaux.map(transformZone);
}

// ============================================================================
// TRANSFORMATION STATIONS (OFFRE_EXISTANTE)
// ============================================================================

/**
 * Transforme une station backend en Station frontend
 * 
 * Backend (DATA-CONTRACT.md offre_existante) :
 * - id_station, nom, type, operateur
 * - code_commune, lat, lon
 * - pop_desservie
 */
export function transformStation(station: any): Station {
  return {
    id: station.id_station,
    name: station.nom,
    type: mapTransportType(station.type),
    operator: station.operateur || 'Inconnu',
    location: {
      type: 'Point',
      coordinates: [station.lon, station.lat], // [longitude, latitude] pour GeoJSON
    },
    population_served: station.pop_desservie || 0,
    walking_radius_m: 400,
    lines: station.lignes || [],
    status: 'active',
    capacity: null,
    vehicles_available: null,
  };
}

/**
 * Transforme une liste de stations
 */
export function transformStations(stations: any[]): Station[] {
  return stations.map(transformStation);
}

// ============================================================================
// TRANSFORMATION HEAT MAP
// ============================================================================

/**
 * Transforme les carreaux en features pour la heat map
 */
export function transformHeatMapFeature(carreau: any): HeatMapFeature {
  const isMasked = carreau.donnee_masquee === true;
  
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [carreau.lon, carreau.lat],
    },
    properties: {
      intensity: isMasked ? 0 : (carreau.options_par_habitant || 0),
      population: isMasked ? 0 : (carreau.population || 0),
      transport_options: carreau.nb_options || 0,
    },
  };
}

/**
 * Crée une réponse HeatMap complète
 */
export function transformHeatMap(carreaux: any[]) {
  return {
    type: 'FeatureCollection' as const,
    features: carreaux.map(transformHeatMapFeature),
    legend: {
      min: 0,
      max: 1,
      colors: ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#3b82f6'],
      labels: ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'],
    },
  };
}

// ============================================================================
// TRANSFORMATION RECOMMANDATIONS
// ============================================================================

/**
 * Transforme une recommandation backend en Recommendation frontend
 * 
 * Backend (DATA-CONTRACT.md recommandations) :
 * - rang, id_candidat, type, lat, lon, code_commune
 * - cout_eur, cout_cumule_eur, pop_nouvelle
 * - score, adequation, voitures_evitees
 */
export function transformRecommendation(reco: any): Recommendation {
  return {
    id: reco.id_candidat,
    rank: reco.rang,
    location: {
      type: 'Point',
      coordinates: [reco.lon, reco.lat],
    },
    address: `${reco.code_commune || 'Bordeaux'}`, // Adresse simplifiée
    transport_type: mapTransportType(reco.type),
    estimated_cost: reco.cout_eur,
    impact: {
      new_population_served: reco.pop_nouvelle,
      coverage_improvement: (reco.pop_nouvelle / 400000) || 0.01, // Approximation
      existing_coverage: 0.5, // À calculer si disponible
      projected_coverage: 0.5 + ((reco.pop_nouvelle / 400000) || 0.01),
    },
    justification: `Score d'adéquation : ${(reco.adequation * 100).toFixed(0)}%. ${
      reco.voitures_evitees > 0 ? `Estimation : ${reco.voitures_evitees} voitures évitées.` : ''
    }`,
    score: reco.score / 100, // Backend 0-100, frontend 0-1
    nearby_facilities: {
      metro_stations: 0,
      bus_stops: 0,
      residential_density: reco.pop_nouvelle > 3000 ? 'high' : reco.pop_nouvelle > 1000 ? 'medium' : 'low',
    },
  };
}

/**
 * Transforme une liste de recommandations
 */
export function transformRecommendations(recommendations: any[]) {
  const transformed = recommendations.map(transformRecommendation);
  
  // Calculer le résumé
  const summary = {
    total_recommendations: transformed.length,
    total_cost: recommendations.reduce((sum, r) => sum + r.cout_eur, 0),
    total_new_population: recommendations.reduce((sum, r) => sum + r.pop_nouvelle, 0),
    avg_coverage_improvement: transformed.reduce((sum, r) => sum + r.impact.coverage_improvement, 0) / transformed.length,
    budget_used: recommendations[recommendations.length - 1]?.cout_cumule_eur || 0,
    budget_remaining: 0, // À calculer depuis le budget demandé
  };
  
  return {
    recommendations: transformed,
    summary,
    optimization_method: 'genetic_algorithm',
    computation_time_ms: 0,
  };
}

// ============================================================================
// TRANSFORMATION STATISTIQUES
// ============================================================================

/**
 * Calcule les statistiques globales depuis les carreaux
 */
export function transformSummaryStatistics(carreaux: any[], stations: any[]): SummaryStatistics {
  const totalPopulation = carreaux
    .filter((c) => !c.donnee_masquee)
    .reduce((sum, c) => sum + (c.population || 0), 0);
  
  const coveredPopulation = carreaux
    .filter((c) => !c.donnee_masquee && c.nb_options > 0)
    .reduce((sum, c) => sum + (c.population || 0), 0);
  
  // Compter les stations par type
  const stationsByType = stations.reduce((acc: any, s: any) => {
    const type = mapTransportType(s.type);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  return {
    region: 'Bordeaux Métropole',
    population: {
      total: totalPopulation,
      covered: coveredPopulation,
      coverage_rate: totalPopulation > 0 ? coveredPopulation / totalPopulation : 0,
    },
    stations: {
      total: stations.length,
      by_type: {
        bus: stationsByType.bus || 0,
        metro: stationsByType.metro || 0,
        tram: stationsByType.tram || 0,
        bike: stationsByType.bike || 0,
        carsharing: stationsByType.carsharing || 0,
        scooter: stationsByType.scooter || 0,
      },
    },
    accessibility: {
      well_served: 0.65, // À calculer depuis niveau_acces
      moderately_served: 0.28,
      poorly_served: 0.07,
    },
    avg_options_per_inhabitant: totalPopulation > 0
      ? carreaux.reduce((sum, c) => sum + (c.nb_options || 0), 0) / totalPopulation
      : 0,
    avg_walking_time_minutes: 5, // 400m = 5 min
  };
}

/**
 * Transforme les carreaux en distribution de population
 */
export function transformPopulationDistribution(carreaux: any[]): PopulationDistribution[] {
  // Grouper par niveau_acces (1-5)
  const groups = [
    { range: '0-0.2' as const, label: 'Très faible', niveau: 1, color: '#ef4444' },
    { range: '0.2-0.4' as const, label: 'Faible', niveau: 2, color: '#f59e0b' },
    { range: '0.4-0.6' as const, label: 'Moyen', niveau: 3, color: '#fbbf24' },
    { range: '0.6-0.8' as const, label: 'Bon', niveau: 4, color: '#84cc16' },
    { range: '0.8-1.0' as const, label: 'Excellent', niveau: 5, color: '#22c55e' },
  ];
  
  const totalPopulation = carreaux
    .filter((c) => !c.donnee_masquee)
    .reduce((sum, c) => sum + (c.population || 0), 0);
  
  return groups.map((g) => {
    const population = carreaux
      .filter((c) => !c.donnee_masquee && c.niveau_acces === g.niveau)
      .reduce((sum, c) => sum + (c.population || 0), 0);
    
    return {
      coverage_range: g.range,
      label: g.label,
      population,
      percentage: totalPopulation > 0 ? Math.round((population / totalPopulation) * 100) : 0,
      color: g.color,
    };
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const dataTransformers = {
  zone: transformZone,
  zones: transformZones,
  station: transformStation,
  stations: transformStations,
  heatMap: transformHeatMap,
  recommendation: transformRecommendation,
  recommendations: transformRecommendations,
  summaryStatistics: transformSummaryStatistics,
  populationDistribution: transformPopulationDistribution,
};
