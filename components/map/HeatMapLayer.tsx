'use client';
import React from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import { formatNumber } from '@/lib/utils';
import type { HeatmapResponse } from '@/types/api';

export function intensityColor(ratio: number): string {
  if (ratio >= 0.8) return '#c9f6ff';
  if (ratio >= 0.6) return '#3de0ff';
  if (ratio >= 0.4) return '#1fa3c9';
  if (ratio >= 0.2) return '#13698a';
  return '#0d3447';
}

export function HeatMapLayer({ data }: { data: HeatmapResponse }) {
  const max = data.value_range?.max ?? 0;
  return (
    <>
      {data.points.map(([lon, lat, value]) => (
        <CircleMarker
          key={`${lon},${lat}`}
          center={[lat, lon]}
          radius={6}
          pathOptions={{ fillColor: intensityColor(max > 0 ? value / max : 0), fillOpacity: 0.6, stroke: false }}
        >
          <Tooltip>
            <span className="text-xs">{formatNumber(value)} habitants</span>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
