'use client';
import React from 'react';
import { GeoJSON } from 'react-leaflet';
import type { CoverageResponse } from '@/types/api';
import L from 'leaflet';

interface GeoJSONLayerProps {
  data: CoverageResponse;
  onFeatureClick?: (zoneId: string) => void;
}

/**
 * Composant pour afficher des données GeoJSON sur la carte
 * Compatible avec le format GeoJSON standard de l'API
 * 
 * Utilise le composant natif <GeoJSON> de react-leaflet
 */
export function GeoJSONLayer({ data, onFeatureClick }: GeoJSONLayerProps) {
  
  // Convertir les zones en FeatureCollection GeoJSON standard
  const geoJsonData: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: data.zones.map(zone => ({
      type: 'Feature',
      id: zone.id,
      geometry: zone.geometry,
      properties: zone.properties,
    })),
  };

  // Style basé sur le score de couverture
  const style = (feature?: GeoJSON.Feature): L.PathOptions => {
    if (!feature || !feature.properties) {
      return { fillColor: '#cccccc', weight: 1, opacity: 0.5, fillOpacity: 0.3 };
    }

    const score = feature.properties.coverage_score || 0;
    
    // Couleurs basées sur le score (0-1)
    let fillColor: string;
    if (score >= 0.8) fillColor = '#3b82f6'; // Excellent - Bleu
    else if (score >= 0.6) fillColor = '#22c55e'; // Bon - Vert
    else if (score >= 0.4) fillColor = '#f59e0b'; // Moyen - Orange
    else if (score >= 0.2) fillColor = '#f97316'; // Faible - Orange foncé
    else fillColor = '#ef4444'; // Très faible - Rouge

    return {
      fillColor,
      weight: 1,
      opacity: 0.6,
      color: '#ffffff',
      fillOpacity: 0.4,
    };
  };

  // Interaction au survol
  const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    if (!feature.properties) return;

    const props = feature.properties;
    
    // Popup avec informations
    const popupContent = `
      <div class="p-2">
        <p class="font-semibold text-sm mb-1">Zone ${feature.id}</p>
        <p class="text-xs">Population: ${props.population?.toLocaleString('fr-FR')}</p>
        <p class="text-xs">Couverture: ${((props.coverage_score || 0) * 100).toFixed(0)}%</p>
        <p class="text-xs">Options: ${props.transport_options}</p>
        <p class="text-xs">Temps marche moyen: ${props.walking_time_avg?.toFixed(1)} min</p>
      </div>
    `;
    
    layer.bindPopup(popupContent);

    // Hover effect
    layer.on({
      mouseover: (e) => {
        const target = e.target;
        target.setStyle({
          weight: 2,
          opacity: 1,
          fillOpacity: 0.6,
        });
      },
      mouseout: (e) => {
        const target = e.target;
        target.setStyle({
          weight: 1,
          opacity: 0.6,
          fillOpacity: 0.4,
        });
      },
      click: () => {
        if (onFeatureClick && feature.id) {
          onFeatureClick(feature.id as string);
        }
      },
    });
  };

  return (
    <GeoJSON
      data={geoJsonData}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

