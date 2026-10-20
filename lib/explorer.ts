// Données de la page Explorer : carreaux complets (l'API plafonne à 5 000 par requête),
// stations, et calcul des carreaux nouvellement desservis par les recommandations.
import { api } from '@/lib/api';
import type { CoverageResponse, EquipmentType, Recommendation, StationType, StationsResponse } from '@/types/api';

export const RAYON_M = 400;

// Bandes de longitude couvrant Bordeaux Métropole : chacune reste sous la limite de l'API.
const BANDES: [number, number][] = [
  [-0.95, -0.64],
  [-0.64, -0.58],
  [-0.58, -0.52],
  [-0.52, -0.2],
];

export interface Carreau {
  id: string;
  lon: number;
  lat: number;
  population: number | null; // null : carreau masqué (secret statistique)
  options: number;
  citiz: number;
  bus: number;
  bike: number;
  commune: string | null;
}

export interface CarreauxGeoJSON {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    id: number;
    geometry: { type: 'Polygon'; coordinates: [number, number][][] };
    properties: { id: string; pop: number | null; opts: number; citiz: number; commune: string | null };
  }[];
}

export async function chargerCarreaux(): Promise<{ carreaux: Carreau[]; geojson: CarreauxGeoJSON }> {
  const reponses: CoverageResponse[] = await Promise.all(
    BANDES.map(([ouest, est]) => api.coverage({ bbox: `${ouest},44.6,${est},45.1`, limit: 5000 })),
  );
  const vus = new Set<string>();
  const carreaux: Carreau[] = [];
  const geojson: CarreauxGeoJSON = { type: 'FeatureCollection', features: [] };
  for (const reponse of reponses) {
    for (const f of reponse.features) {
      const p = f.properties;
      if (vus.has(p.zone_id)) continue;
      vus.add(p.zone_id);
      const anneau = f.geometry.coordinates[0];
      const sommets = anneau.slice(0, -1);
      const lon = sommets.reduce((s, c) => s + c[0], 0) / sommets.length;
      const lat = sommets.reduce((s, c) => s + c[1], 0) / sommets.length;
      const parType = p.options_by_type ?? {};
      const carreau: Carreau = {
        id: p.zone_id,
        lon,
        lat,
        population: p.population,
        options: p.options_count ?? 0,
        citiz: parType.citiz ?? 0,
        bus: parType.bus ?? 0,
        bike: parType.bike ?? 0,
        commune: p.commune_codes[0] ?? null,
      };
      geojson.features.push({
        type: 'Feature',
        id: carreaux.length, // identifiant numérique pour les feature-state MapLibre
        geometry: { type: 'Polygon', coordinates: f.geometry.coordinates as [number, number][][] },
        properties: { id: carreau.id, pop: carreau.population, opts: carreau.options, citiz: carreau.citiz, commune: carreau.commune },
      });
      carreaux.push(carreau);
    }
  }
  return { carreaux, geojson };
}

export async function chargerStations(): Promise<StationsResponse> {
  return api.stations({ limit: 20000 });
}

// Distance approchée en mètres (suffisante à l'échelle d'une métropole)
function distanceM(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const kx = 111_320 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  const dx = (lon2 - lon1) * kx;
  const dy = (lat2 - lat1) * 110_540;
  return Math.hypot(dx, dy);
}

const DEJA_DESSERVI: Record<EquipmentType, (c: Carreau) => boolean> = {
  citiz_station: (c) => c.citiz > 0,
  bus_stop: (c) => c.bus > 0,
  bike_station: (c) => c.bike > 0,
};

// Index des carreaux en cases d'environ 1 km pour ne tester que les voisins.
export function indexer(carreaux: Carreau[]) {
  const pas = 0.012;
  const cases = new Map<string, number[]>();
  carreaux.forEach((c, i) => {
    const cle = `${Math.floor(c.lon / pas)}:${Math.floor(c.lat / pas)}`;
    const liste = cases.get(cle);
    if (liste) liste.push(i);
    else cases.set(cle, [i]);
  });
  return (lon: number, lat: number): number[] => {
    const x = Math.floor(lon / pas);
    const y = Math.floor(lat / pas);
    const resultat: number[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) resultat.push(...(cases.get(`${x + dx}:${y + dy}`) ?? []));
    return resultat;
  };
}

// Carreaux qu'une recommandation dessert pour la première fois (pour ce type d'équipement).
export function carreauxAllumes(reco: Recommendation, carreaux: Carreau[], voisins: (lon: number, lat: number) => number[]): number[] {
  const dejaDesservi = DEJA_DESSERVI[reco.equipment_type];
  return voisins(reco.lon, reco.lat).filter((i) => {
    const c = carreaux[i];
    return !dejaDesservi(c) && distanceM(reco.lon, reco.lat, c.lon, c.lat) <= RAYON_M;
  });
}

export const COULEUR_STATION: Partial<Record<StationType, string>> = {
  citiz: '#32b4b5',
  tram: '#5560c9',
  bike: '#f2a33a',
  bus: '#9aa5a5',
  ferry: '#2b8cbe',
};

// Ce que le scénario ajoute : vert Citiz pour l'autopartage
export const COULEUR_EQUIPEMENT: Record<EquipmentType, string> = {
  citiz_station: '#2fac66',
  bus_stop: '#5d6767',
  bike_station: '#f2a33a',
};

export const LIBELLE_EQUIPEMENT: Record<EquipmentType, string> = {
  citiz_station: 'Station Citiz',
  bus_stop: 'Arrêt de bus',
  bike_station: 'Station vélo',
};
