'use client';
import React, { useEffect, useRef } from 'react';
import maplibregl, { type ExpressionSpecification, type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import type { Recommendation, StationType, StationsResponse } from '@/types/api';
import { COULEUR_EQUIPEMENT, COULEUR_STATION, LIBELLE_EQUIPEMENT, type CarreauxGeoJSON } from '@/lib/explorer';
import { communeName } from '@/lib/communes';
import { formatCurrency, formatNumber } from '@/lib/utils';

export type Mode = 'acces' | 'citiz';

// Fond clair CARTO Positron (vectoriel, sans clé) : la ville en blanc, nos données en couleurs Citiz.
const STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const VUE = { center: [-0.585, 44.845] as [number, number], zoom: 11.15, pitch: 58, bearing: -17 };
const VUE_SURVOL = { center: [-0.585, 44.85] as [number, number], zoom: 10.75, pitch: 55, bearing: -30 };

const HAUTEUR: ExpressionSpecification = ['+', 12, ['*', ['sqrt', ['coalesce', ['get', 'pop'], 36]], 13]];

function couleur(mode: Mode): ExpressionSpecification {
  const base: ExpressionSpecification =
    mode === 'citiz'
      ? ['case', ['>', ['get', 'citiz'], 0], '#32b4b5', ['==', ['get', 'opts'], 0], '#ee6352', '#dde4e4']
      : ['case', ['==', ['get', 'opts'], 0], '#ee6352',
          ['interpolate', ['linear'], ['get', 'opts'], 1, '#d5eeee', 4, '#9ddedf', 10, '#32b4b5', 25, '#11686c']];
  return ['case', ['boolean', ['feature-state', 'allume'], false], '#2fac66', base];
}

function colonne(r: Recommendation) {
  const dLat = 16 / 110_540;
  const dLon = 16 / (111_320 * Math.cos((r.lat * Math.PI) / 180));
  return {
    type: 'Feature' as const,
    properties: { couleur: COULEUR_EQUIPEMENT[r.equipment_type] },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [r.lon - dLon, r.lat - dLat], [r.lon + dLon, r.lat - dLat], [r.lon + dLon, r.lat + dLat],
        [r.lon - dLon, r.lat + dLat], [r.lon - dLon, r.lat - dLat],
      ]],
    },
  };
}

function pointsRecos(recos: Recommendation[]) {
  return {
    type: 'FeatureCollection' as const,
    features: recos.map((r) => ({
      type: 'Feature' as const,
      id: r.rank,
      properties: { rang: r.rank, type: r.equipment_type, couleur: COULEUR_EQUIPEMENT[r.equipment_type], commune: r.commune_code, pop: r.population_gained, cout: r.cost },
      geometry: { type: 'Point' as const, coordinates: [r.lon, r.lat] },
    })),
  };
}

const vide = { type: 'FeatureCollection' as const, features: [] };

interface Props {
  carreaux: CarreauxGeoJSON | null;
  stations: StationsResponse | null;
  mode: Mode;
  typesVisibles: StationType[];
  recos: Recommendation[];
  allumes: number[];
  focus: Recommendation | null;
  survol: number | null;
  orbite: boolean;
}

export default function CityMap({ carreaux, stations, mode, typesVisibles, recos, allumes, focus, survol, orbite }: Props) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<MapLibreMap | null>(null);
  const pret = useRef(false);
  const allumesAvant = useRef<Set<number>>(new Set());
  const survolAvant = useRef<number | null>(null);
  const etat = useRef({ carreaux, stations, mode, typesVisibles, recos, allumes });
  etat.current = { carreaux, stations, mode, typesVisibles, recos, allumes };

  useEffect(() => {
    if (!conteneur.current) return;
    const map = new maplibregl.Map({ container: conteneur.current, style: STYLE, ...VUE, antialias: true, attributionControl: { compact: true } });
    carte.current = map;

    map.on('load', () => {
      // Libellés du fond plus discrets, eau dans un turquoise très pâle
      for (const layer of map.getStyle().layers ?? []) {
        if (layer.type === 'symbol') map.setPaintProperty(layer.id, 'text-opacity', 0.7);
        if (layer.id === 'water') map.setPaintProperty(layer.id, 'fill-color', '#dbf0f0');
      }

      map.addSource('carreaux', { type: 'geojson', data: vide });
      map.addLayer({
        id: 'carreaux-3d',
        type: 'fill-extrusion',
        source: 'carreaux',
        paint: { 'fill-extrusion-color': couleur('citiz'), 'fill-extrusion-height': HAUTEUR, 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.92 },
      });

      map.addSource('stations', { type: 'geojson', data: vide });
      const couleurStation = ['match', ['get', 'type'], ...Object.entries(COULEUR_STATION).flat(), '#9aa5a5'] as unknown as ExpressionSpecification;
      map.addLayer({
        id: 'stations',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-color': couleurStation,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 1.8, 15, 5],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 10, 0.4, 15, 1.5],
        },
      });

      map.addSource('faisceaux', { type: 'geojson', data: vide });
      map.addLayer({
        id: 'faisceaux',
        type: 'fill-extrusion',
        source: 'faisceaux',
        paint: { 'fill-extrusion-color': ['get', 'couleur'], 'fill-extrusion-height': 1100, 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.9 },
      });

      map.addSource('recos', { type: 'geojson', data: vide });
      map.addLayer({
        id: 'recos-onde',
        type: 'circle',
        source: 'recos',
        paint: {
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-color': ['get', 'couleur'],
          'circle-stroke-width': 2,
          'circle-radius': 10,
          'circle-stroke-opacity': 0.8,
          'circle-pitch-alignment': 'map',
        },
      });
      map.addLayer({
        id: 'recos',
        type: 'circle',
        source: 'recos',
        paint: {
          'circle-color': ['get', 'couleur'],
          'circle-radius': ['case', ['boolean', ['feature-state', 'survol'], false], 11, 7],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.5,
          'circle-pitch-alignment': 'map',
        },
      });

      const bulle = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: '260px' });
      map.on('mousemove', 'carreaux-3d', (e) => {
        const p = e.features?.[0]?.properties as { pop: number | null; opts: number; citiz: number; commune: string } | undefined;
        if (!p) return;
        map.getCanvas().style.cursor = 'crosshair';
        const masque = p.pop === null || p.pop === undefined || (p.pop as unknown) === 'null';
        const pop = masque ? '<span style="color:#5d6767">population masquée (secret statistique)</span>' : `<b>${formatNumber(Number(p.pop))}</b> habitants`;
        const acces = Number(p.opts) === 0
          ? '<span style="color:#ee6352;font-weight:600">aucune mobilité à 5 min à pied</span>'
          : `<b>${p.opts}</b> arrêts ou stations à 5 min${Number(p.citiz) > 0 ? ' · <span style="color:#20a4b0;font-weight:600">dont Citiz</span>' : ''}`;
        bulle.setLngLat(e.lngLat)
          .setHTML(`<div style="font:13px/1.5 var(--font-fira)"><div class="label-mono" style="margin-bottom:4px">${communeName(p.commune)}</div>${pop}<br/>${acces}</div>`)
          .addTo(map);
      });
      map.on('mouseleave', 'carreaux-3d', () => {
        map.getCanvas().style.cursor = '';
        bulle.remove();
      });
      map.on('mouseenter', 'recos', (e) => {
        const p = e.features?.[0]?.properties as { rang: number; type: keyof typeof LIBELLE_EQUIPEMENT; commune: string; pop: number; cout: number } | undefined;
        if (!p) return;
        bulle.setLngLat(e.lngLat)
          .setHTML(`<div style="font:13px/1.5 var(--font-fira)"><div class="label-mono" style="color:#2fac66;margin-bottom:4px">N°${p.rang} · ${LIBELLE_EQUIPEMENT[p.type]}</div><b>${communeName(p.commune)}</b><br/>+${formatNumber(Number(p.pop))} habitants · ${formatCurrency(Number(p.cout))}</div>`)
          .addTo(map);
      });

      const t0 = performance.now();
      const animer = (t: number) => {
        if (!carte.current) return;
        const phase = ((t - t0) % 1800) / 1800;
        if (map.getLayer('recos-onde')) {
          map.setPaintProperty('recos-onde', 'circle-radius', 8 + phase * 24);
          map.setPaintProperty('recos-onde', 'circle-stroke-opacity', 0.85 * (1 - phase));
        }
        requestAnimationFrame(animer);
      };
      requestAnimationFrame(animer);

      pret.current = true;
      const { carreaux: c, stations: s, mode: m, typesVisibles: tv, recos: r, allumes: a } = etat.current;
      if (c) (map.getSource('carreaux') as GeoJSONSource).setData(c as unknown as GeoJSON.FeatureCollection);
      if (s) (map.getSource('stations') as GeoJSONSource).setData(s as unknown as GeoJSON.FeatureCollection);
      map.setPaintProperty('carreaux-3d', 'fill-extrusion-color', couleur(m));
      map.setFilter('stations', ['in', ['get', 'type'], ['literal', tv]]);
      majRecos(map, r, a);
    });

    return () => {
      pret.current = false;
      carte.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function majRecos(map: MapLibreMap, r: Recommendation[], a: number[]) {
    (map.getSource('recos') as GeoJSONSource).setData(pointsRecos(r) as unknown as GeoJSON.FeatureCollection);
    (map.getSource('faisceaux') as GeoJSONSource).setData({ type: 'FeatureCollection', features: r.map(colonne) } as unknown as GeoJSON.FeatureCollection);
    const nouveaux = new Set(a);
    allumesAvant.current.forEach((i) => { if (!nouveaux.has(i)) map.setFeatureState({ source: 'carreaux', id: i }, { allume: false }); });
    nouveaux.forEach((i) => { if (!allumesAvant.current.has(i)) map.setFeatureState({ source: 'carreaux', id: i }, { allume: true }); });
    allumesAvant.current = nouveaux;
  }

  useEffect(() => {
    const map = carte.current;
    if (map && pret.current && carreaux) {
      (map.getSource('carreaux') as GeoJSONSource).setData(carreaux as unknown as GeoJSON.FeatureCollection);
      allumesAvant.current = new Set();
    }
  }, [carreaux]);

  useEffect(() => {
    const map = carte.current;
    if (map && pret.current && stations) (map.getSource('stations') as GeoJSONSource).setData(stations as unknown as GeoJSON.FeatureCollection);
  }, [stations]);

  useEffect(() => {
    const map = carte.current;
    if (map && pret.current) map.setPaintProperty('carreaux-3d', 'fill-extrusion-color', couleur(mode));
  }, [mode]);

  useEffect(() => {
    const map = carte.current;
    if (map && pret.current) map.setFilter('stations', ['in', ['get', 'type'], ['literal', typesVisibles]]);
  }, [typesVisibles]);

  useEffect(() => {
    const map = carte.current;
    if (map && pret.current) majRecos(map, recos, allumes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recos, allumes]);

  useEffect(() => {
    const map = carte.current;
    if (!map || !pret.current) return;
    if (survolAvant.current !== null) map.setFeatureState({ source: 'recos', id: survolAvant.current }, { survol: false });
    if (survol !== null) map.setFeatureState({ source: 'recos', id: survol }, { survol: true });
    survolAvant.current = survol;
  }, [survol]);

  useEffect(() => {
    const map = carte.current;
    if (map && focus) map.flyTo({ center: [focus.lon, focus.lat], zoom: 14.4, pitch: 64, bearing: map.getBearing() + 25, duration: 2200, essential: true });
  }, [focus]);

  // Pendant l'accueil : vue d'ensemble qui tourne lentement. À l'entrée : plongée sur la ville.
  useEffect(() => {
    const map = carte.current;
    if (!map) return;
    if (!orbite) {
      map.stop();
      const large = map.getContainer().clientWidth >= 1024;
      map.flyTo({
        ...VUE,
        zoom: VUE.zoom - 0.25,
        padding: large ? { top: 90, bottom: 300, left: 290, right: 320 } : { top: 80, bottom: 320, left: 0, right: 0 },
        duration: 3200,
        curve: 1.6,
        essential: true,
      });
      return;
    }
    let actif = true;
    const tourner = () => {
      if (!actif || !carte.current) return;
      map.rotateTo(map.getBearing() + 40, { duration: 26000, easing: (t) => t });
      map.once('moveend', tourner);
    };
    const demarrer = () => {
      map.jumpTo({ ...VUE_SURVOL, padding: { top: 0, bottom: 0, left: Math.round(map.getContainer().clientWidth * 0.45), right: 0 } });
      tourner();
    };
    if (map.loaded()) demarrer();
    else map.once('load', demarrer);
    return () => {
      actif = false;
    };
  }, [orbite]);

  return <div ref={conteneur} className="absolute inset-0" />;
}
