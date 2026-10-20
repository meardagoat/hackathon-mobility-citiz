'use client';
import React, { useEffect, useRef } from 'react';
import maplibregl, { type ExpressionSpecification, type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import type { StationFeature, StationType, StationsResponse } from '@/types/api';
import { COULEUR_STATION, type CarreauxGeoJSON } from '@/lib/explorer';
import { STATION_LABELS } from '@/lib/constants';
import { formatNumber } from '@/lib/utils';

const STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const vide = { type: 'FeatureCollection' as const, features: [] };

// Bulle construite en nœuds DOM : le nom d'un arrêt vient des données et reste du texte
function contenuBulle(p: { name: string; type: StationType; population_served: number | null }): HTMLElement {
  const racine = document.createElement('div');
  racine.style.font = '13px/1.5 var(--font-fira)';
  const type = document.createElement('div');
  type.className = 'label-mono';
  type.style.color = COULEUR_STATION[p.type] ?? '#5d6767';
  type.style.marginBottom = '3px';
  type.textContent = STATION_LABELS[p.type] ?? String(p.type);
  const nom = document.createElement('b');
  nom.textContent = String(p.name);
  const pop = document.createElement('div');
  const inconnue = p.population_served === null || (p.population_served as unknown) === 'null';
  pop.textContent = inconnue ? 'population non disponible' : `${formatNumber(Number(p.population_served))} habitants à 5 min`;
  racine.append(type, nom, pop);
  return racine;
}

interface Props {
  stations: StationsResponse | null;
  carreaux: CarreauxGeoJSON | null;
  types: StationType[];
  choisie: StationFeature | null;
  onChoix: (s: StationFeature | null) => void;
}

// Carte de l'offre existante : chaque arrêt ou station est un cercle dont la taille suit le nombre d'habitants à 400 m.
export default function OffreMap({ stations, carreaux, types, choisie, onChoix }: Props) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<MapLibreMap | null>(null);
  const pret = useRef(false);
  const etat = useRef({ stations, carreaux, types, choisie });
  etat.current = { stations, carreaux, types, choisie };
  const precedente = useRef<string | null>(null);
  const onChoixRef = useRef(onChoix);
  onChoixRef.current = onChoix;

  useEffect(() => {
    if (!conteneur.current) return;
    const map = new maplibregl.Map({ container: conteneur.current, style: STYLE, center: [-0.6, 44.845], zoom: 10.9, pitch: 0, attributionControl: { compact: true } });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    carte.current = map;

    map.on('load', () => {
      for (const layer of map.getStyle().layers ?? []) {
        if (layer.id === 'water') map.setPaintProperty(layer.id, 'fill-color', '#dbf0f0');
      }
      map.addSource('carreaux', { type: 'geojson', data: vide });
      map.addLayer({
        id: 'carreaux',
        type: 'fill',
        source: 'carreaux',
        paint: {
          'fill-color': ['case', ['==', ['get', 'opts'], 0], '#ee6352', '#32b4b5'],
          'fill-opacity': ['case', ['==', ['get', 'opts'], 0], 0.35, ['interpolate', ['linear'], ['coalesce', ['get', 'pop'], 0], 0, 0.04, 800, 0.16, 2400, 0.3]],
        },
      });

      const couleur = ['match', ['get', 'type'], ...Object.entries(COULEUR_STATION).flat(), '#9aa5a5'] as unknown as ExpressionSpecification;
      map.addSource('stations', { type: 'geojson', data: vide, promoteId: 'station_id' });
      map.addLayer({
        id: 'stations',
        type: 'circle',
        source: 'stations',
        // Citiz, tram et vélo dessinés au-dessus des arrêts de bus, beaucoup plus nombreux
        layout: { 'circle-sort-key': ['match', ['get', 'type'], 'citiz', 5, 'tram', 4, 'bike', 3, 'ferry', 2, 1] },
        paint: {
          'circle-color': couleur,
          'circle-opacity': ['match', ['get', 'type'], 'bus', 0.45, 0.9],
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            10, ['+', 1.5, ['*', ['sqrt', ['coalesce', ['get', 'population_served'], 0]], 0.06]],
            15, ['+', 4, ['*', ['sqrt', ['coalesce', ['get', 'population_served'], 0]], 0.18]]],
          'circle-stroke-color': ['case', ['boolean', ['feature-state', 'choisie'], false], '#202020', '#ffffff'],
          'circle-stroke-width': ['case', ['boolean', ['feature-state', 'choisie'], false], 3, 1],
        },
      });

      const bulle = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
      map.on('mousemove', 'stations', (e) => {
        const p = e.features?.[0]?.properties as { name: string; type: StationType; operator: string; population_served: number | null } | undefined;
        if (!p) return;
        map.getCanvas().style.cursor = 'pointer';
        bulle.setLngLat(e.lngLat).setDOMContent(contenuBulle(p)).addTo(map);
      });
      map.on('mouseleave', 'stations', () => {
        map.getCanvas().style.cursor = '';
        bulle.remove();
      });
      map.on('click', 'stations', (e) => {
        const id = e.features?.[0]?.properties?.station_id;
        const s = etat.current.stations?.features.find((f) => f.properties.station_id === id) ?? null;
        onChoixRef.current(s);
      });

      pret.current = true;
      const { stations: s, carreaux: c, types: t, choisie: ch } = etat.current;
      if (s) (map.getSource('stations') as GeoJSONSource).setData(s as unknown as GeoJSON.FeatureCollection);
      if (c) (map.getSource('carreaux') as GeoJSONSource).setData(c as unknown as GeoJSON.FeatureCollection);
      map.setFilter('stations', ['in', ['get', 'type'], ['literal', t]]);
      // Une station choisie dans le Top 10 avant la fin du chargement du fond
      appliquerChoix(map, ch);
    });
    return () => {
      pret.current = false;
      carte.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = carte.current;
    if (map && pret.current && stations) (map.getSource('stations') as GeoJSONSource).setData(stations as unknown as GeoJSON.FeatureCollection);
  }, [stations]);

  useEffect(() => {
    const map = carte.current;
    if (map && pret.current && carreaux) (map.getSource('carreaux') as GeoJSONSource).setData(carreaux as unknown as GeoJSON.FeatureCollection);
  }, [carreaux]);

  useEffect(() => {
    const map = carte.current;
    if (map && pret.current) map.setFilter('stations', ['in', ['get', 'type'], ['literal', types]]);
  }, [types]);

  function appliquerChoix(map: MapLibreMap, ch: StationFeature | null) {
    if (precedente.current) map.setFeatureState({ source: 'stations', id: precedente.current }, { choisie: false });
    if (ch) {
      map.setFeatureState({ source: 'stations', id: ch.properties.station_id }, { choisie: true });
      map.flyTo({ center: ch.geometry.coordinates as [number, number], zoom: 14.2, offset: [140, 60], duration: 1600, essential: true });
    }
    precedente.current = ch?.properties.station_id ?? null;
  }

  useEffect(() => {
    const map = carte.current;
    if (map && pret.current) appliquerChoix(map, choisie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choisie]);

  return <div ref={conteneur} className="absolute inset-0" />;
}
