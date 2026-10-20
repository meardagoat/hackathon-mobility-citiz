'use client';
import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { CircleMarker, Tooltip } from 'react-leaflet';
import type { HeatMapResponse } from '@/types/api';

function intensityToColor(intensity: number): string {
  if (intensity >= 0.8) return '#3b82f6';
  if (intensity >= 0.6) return '#22c55e';
  if (intensity >= 0.4) return '#f59e0b';
  if (intensity >= 0.2) return '#f97316';
  return '#ef4444';
}

interface HeatMapLayerProps {
  data: HeatMapResponse;
}

export function HeatMapLayer({ data }: HeatMapLayerProps) {
  // Vérifier que data et features existent
  if (!data || !data.features || !Array.isArray(data.features)) {
    return null;
  }

  return (
    <>
      {data.features.map((feature, i) => (
        <CircleMarker
          key={i}
          center={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
          radius={Math.max(8, feature.properties.intensity * 20)}
          pathOptions={{
            fillColor: intensityToColor(feature.properties.intensity),
            fillOpacity: 0.4,
            stroke: false,
          }}
        >
          <Tooltip>
            <div className="text-xs">
              <p>Intensité : {(feature.properties.intensity * 100).toFixed(0)}%</p>
              <p>Population : {feature.properties.population.toLocaleString('fr-FR')}</p>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
