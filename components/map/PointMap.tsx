'use client';
import React from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import { Map } from './Map';

interface PointMapProps {
  lat: number;
  lon: number;
  label: string;
  color: string;
}

export function PointMap({ lat, lon, label, color }: PointMapProps) {
  return (
    <Map center={[lat, lon]} zoom={15} showHeatmap={false}>
      <CircleMarker center={[lat, lon]} radius={10} pathOptions={{ color: '#06080d', weight: 2, fillColor: color, fillOpacity: 0.9 }}>
        <Tooltip permanent>{label}</Tooltip>
      </CircleMarker>
    </Map>
  );
}
