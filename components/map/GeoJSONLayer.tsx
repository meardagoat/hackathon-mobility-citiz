'use client';
import React from 'react';
import { GeoJSON } from 'react-leaflet';
import type L from 'leaflet';
import { COVERAGE_LEVEL_COLORS, COVERAGE_LEVEL_LABELS } from '@/lib/constants';
import { formatNumber } from '@/lib/utils';
import type { CoverageProperties, CoverageResponse } from '@/types/api';

interface GeoJSONLayerProps {
  data: CoverageResponse;
  onFeatureClick?: (zoneId: string) => void;
}

export function GeoJSONLayer({ data, onFeatureClick }: GeoJSONLayerProps) {
  const style = (feature?: GeoJSON.Feature): L.PathOptions => {
    const level = (feature?.properties as CoverageProperties | undefined)?.coverage_level;
    return {
      fillColor: level ? COVERAGE_LEVEL_COLORS[level] : '#2a3346',
      weight: 1,
      opacity: 0.6,
      color: '#06080d',
      fillOpacity: 0.4,
    };
  };

  const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    const props = feature.properties as CoverageProperties;
    const population = props.is_estimated ? 'masquée (secret statistique)' : formatNumber(props.population);
    const level = props.coverage_level ? COVERAGE_LEVEL_LABELS[props.coverage_level] : 'non disponible';
    layer.bindPopup(
      `<div class="p-2">
        <p class="font-semibold text-sm mb-1">Carreau ${props.zone_id}</p>
        <p class="text-xs">Population : ${population}</p>
        <p class="text-xs">Options à 400 m : ${formatNumber(props.options_count)}</p>
        <p class="text-xs">Niveau de couverture : ${level}</p>
      </div>`
    );
    if (onFeatureClick) layer.on({ click: () => onFeatureClick(props.zone_id) });
  };

  return <GeoJSON data={data as unknown as GeoJSON.FeatureCollection} style={style} onEachFeature={onEachFeature} />;
}
