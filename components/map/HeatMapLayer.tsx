'use client';
import React from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import { formatNumber } from '@/lib/utils';
import type { HeatmapResponse } from '@/types/api';

export function intensityColor(ratio: number): string {
  if (ratio >= 0.8) return '#1e3a8a';
  if (ratio >= 0.6) return '#2563eb';
  if (ratio >= 0.4) return '#60a5fa';
  if (ratio >= 0.2) return '#93c5fd';
  return '#dbeafe';
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
