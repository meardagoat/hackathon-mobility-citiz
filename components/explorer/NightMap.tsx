'use client';
import React, { useEffect, useRef } from 'react';
import maplibregl, { type ExpressionSpecification, type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import type { Recommendation, StationType, StationsResponse } from '@/types/api';
import { COULEUR_EQUIPEMENT, COULEUR_STATION, LIBELLE_EQUIPEMENT, type CarreauxGeoJSON } from '@/lib/explorer';
import { communeName } from '@/lib/communes';
import { formatCurrency, formatNumber } from '@/lib/utils';

export type Mode = 'acces' | 'citiz';

const STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const VUE_INITIALE = { center: [-0.585, 44.845] as [number, number], zoom: 11.15, pitch: 58, bearing: -17 };

const HAUTEUR: ExpressionSpecification = [
  '+', 12, ['*', ['sqrt', ['coalesce', ['get', 'pop'], 36]], 13],
];

function couleur(mode: Mode): ExpressionSpecification {
  const base: ExpressionSpecification =
    mode === 'citiz'
      ? ['case', ['>', ['get', 'citiz'], 0], '#8f63ff', ['==', ['get', 'opts'], 0], '#7a1f35', '#1a2130']
      : ['case', ['==', ['get', 'opts'], 0], '#a3243f',
          ['interpolate', ['linear'], ['get', 'opts'], 1, '#0f3b52', 4, '#1478a0', 10, '#2ec5ec', 25, '#c9f6ff']];
  return ['case', ['boolean', ['feature-state', 'allume'], false], '#d4ff3a', base];
}

// Petite colonne carrée (environ 36 m de côté) pour le faisceau lumineux d'une recommandation
function colonne(r: Recommendation) {
  const dLat = 18 / 110_540;
  const dLon = 18 / (111_320 * Math.cos((r.lat * Math.PI) / 180));
  return {
    type: 'Feature' as const,
    properties: { rang: r.rank, type: r.equipment_type, couleur: COULEUR_EQUIPEMENT[r.equipment_type] },
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
      properties: {
        rang: r.rank,
        type: r.equipment_type,
        couleur: COULEUR_EQUIPEMENT[r.equipment_type],
        commune: r.commune_code,
        pop: r.population_gained,
        cout: r.cost,
      },
      geometry: { type: 'Point' as const, coordinates: [r.lon, r.lat] },
    })),
  };
}

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

export default function NightMap({ carreaux, stations, mode, typesVisibles, recos, allumes, focus, survol, orbite }: Props) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<MapLibreMap | null>(null);
  const pret = useRef(false);
  const allumesAvant = useRef<Set<number>>(new Set());
  const survolAvant = useRef<number | null>(null);
  const etat = useRef({ carreaux, stations, mode, typesVisibles, recos, allumes });
  etat.current = { carreaux, stations, mode, typesVisibles, recos, allumes };

  // Création de la carte et des couches
  useEffect(() => {
    if (!conteneur.current) return;
    const map = new maplibregl.Map({
      container: conteneur.current,
      style: STYLE,
      ...VUE_INITIALE,
      antialias: true,
      attributionControl: { compact: true },
    });
    carte.current = map;

    map.on('load', () => {
      // Fond encore plus sombre, libellés discrets
      for (const layer of map.getStyle().layers ?? []) {
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', '#05070b');
        if (layer.type === 'symbol') map.setPaintProperty(layer.id, 'text-opacity', 0.55);
      }

      map.addSource('carreaux', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'carreaux-3d',
        type: 'fill-extrusion',
        source: 'carreaux',
        paint: {
          'fill-extrusion-color': couleur('acces'),
          'fill-extrusion-height': HAUTEUR,
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.9,
        },
      });

      map.addSource('stations', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      const couleurStation: ExpressionSpecification = [
        'match', ['get', 'type'],
        ...Object.entries(COULEUR_STATION).flat(),
        '#8a94a6',
      ] as unknown as ExpressionSpecification;
      map.addLayer({
        id: 'stations-halo',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-color': couleurStation,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 15, 14],
          'circle-blur': 1,
          'circle-opacity': 0.35,
        },
      });
      map.addLayer({
        id: 'stations',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-color': couleurStation,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 1.4, 15, 4.5],
          'circle-opacity': 0.95,
        },
      });

      map.addSource('faisceaux', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'faisceaux',
        type: 'fill-extrusion',
        source: 'faisceaux',
        paint: {
          'fill-extrusion-color': ['get', 'couleur'],
          'fill-extrusion-height': 1400,
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.85,
        },
      });

      map.addSource('recos', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'recos-onde',
        type: 'circle',
        source: 'recos',
        paint: {
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-color': ['get', 'couleur'],
          'circle-stroke-width': 1.5,
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
          'circle-radius': ['case', ['boolean', ['feature-state', 'survol'], false], 11, 6.5],
          'circle-stroke-color': '#05070b',
          'circle-stroke-width': 2,
          'circle-pitch-alignment': 'map',
        },
      });

      // Infobulles
      const bulle = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: '260px' });
      map.on('mousemove', 'carreaux-3d', (e) => {
        const p = e.features?.[0]?.properties as { pop: number | null; opts: number; citiz: number; commune: string } | undefined;
        if (!p) return;
        map.getCanvas().style.cursor = 'crosshair';
        const pop = p.pop === null || p.pop === undefined || (p.pop as unknown) === 'null'
          ? '<span style="color:#8a94a6">population masquée (secret statistique)</span>'
          : `<b>${formatNumber(Number(p.pop))}</b> habitants`;
        const acces = Number(p.opts) === 0
          ? '<span style="color:#ff5c7a">aucune mobilité à 5 min à pied</span>'
          : `<b>${p.opts}</b> arrêts ou stations à 5 min${Number(p.citiz) > 0 ? ' · dont Citiz' : ''}`;
        bulle
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font:12px/1.5 var(--font-inter)"><div class="label-mono" style="margin-bottom:4px">${communeName(p.commune)}</div>${pop}<br/>${acces}</div>`)
          .addTo(map);
      });
      map.on('mouseleave', 'carreaux-3d', () => {
        map.getCanvas().style.cursor = '';
        bulle.remove();
      });
      map.on('mouseenter', 'recos', (e) => {
        const p = e.features?.[0]?.properties as { rang: number; type: keyof typeof LIBELLE_EQUIPEMENT; commune: string; pop: number; cout: number } | undefined;
        if (!p) return;
        bulle
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font:12px/1.5 var(--font-inter)"><div class="label-mono" style="color:#d4ff3a;margin-bottom:4px">#${p.rang} · ${LIBELLE_EQUIPEMENT[p.type]}</div><b>${communeName(p.commune)}</b><br/>+${formatNumber(Number(p.pop))} habitants · ${formatCurrency(Number(p.cout))}</div>`)
          .addTo(map);
      });

      // Onde des balises
      let t0 = performance.now();
      const animer = (t: number) => {
        if (!carte.current) return;
        const phase = ((t - t0) % 1800) / 1800;
        if (map.getLayer('recos-onde')) {
          map.setPaintProperty('recos-onde', 'circle-radius', 8 + phase * 26);
          map.setPaintProperty('recos-onde', 'circle-stroke-opacity', 0.9 * (1 - phase));
        }
        requestAnimationFrame(animer);
      };
      t0 = performance.now();
      requestAnimationFrame(animer);

      pret.current = true;
      synchroniser();
    });

    function synchroniser() {
      const { carreaux: c, stations: s, mode: m, typesVisibles: tv, recos: r, allumes: a } = etat.current;
      if (!pret.current) return;
      if (c) (map.getSource('carreaux') as GeoJSONSource).setData(c as unknown as GeoJSON.FeatureCollection);
      if (s) (map.getSource('stations') as GeoJSONSource).setData(s as unknown as GeoJSON.FeatureCollection);
      map.setPaintProperty('carreaux-3d', 'fill-extrusion-color', couleur(m));
      map.setFilter('stations', ['in', ['get', 'type'], ['literal', tv]]);
      map.setFilter('stations-halo', ['in', ['get', 'type'], ['literal', tv]]);
      majRecos(map, r, a);
    }

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
    if (!map || !pret.current) return;
    map.setFilter('stations', ['in', ['get', 'type'], ['literal', typesVisibles]]);
    map.setFilter('stations-halo', ['in', ['get', 'type'], ['literal', typesVisibles]]);
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
    if (!map) return;
    if (focus) map.flyTo({ center: [focus.lon, focus.lat], zoom: 14.4, pitch: 64, bearing: map.getBearing() + 25, duration: 2200, essential: true });
  }, [focus]);

  // Lente rotation pendant l'introduction
  useEffect(() => {
    const map = carte.current;
    if (!map) return;
    if (!orbite) {
      map.stop();
      // La ville se place dans l'espace laissé libre par les panneaux (gauche, liste à droite, dock en bas)
      const large = map.getContainer().clientWidth >= 1024;
      map.easeTo({
        ...VUE_INITIALE,
        zoom: VUE_INITIALE.zoom - 0.25,
        padding: large ? { top: 90, bottom: 300, left: 290, right: 320 } : { top: 80, bottom: 320, left: 0, right: 0 },
        duration: 1800,
      });
      return;
    }
    let actif = true;
    const tourner = () => {
      if (!actif || !carte.current) return;
      map.rotateTo(map.getBearing() + 40, { duration: 24000, easing: (t) => t });
      map.once('moveend', tourner);
    };
    if (map.loaded()) tourner();
    else map.once('load', tourner);
    return () => {
      actif = false;
    };
  }, [orbite]);

  return <div ref={conteneur} className="absolute inset-0" />;
}
