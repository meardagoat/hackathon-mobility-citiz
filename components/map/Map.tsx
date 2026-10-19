'use client';
import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, TRANSPORT_COLORS, TRANSPORT_LABELS } from '@/lib/constants';
import { MapControls } from './MapControls';
import { StationMarkers } from './StationMarkers';
import { HeatMapLayer } from './HeatMapLayer';
import type { Station, HeatMapResponse, TransportType } from '@/types/api';

interface MapProps {
  stations?: Station[];
  heatmap?: HeatMapResponse | null;
  visibleTypes?: TransportType[];
  showHeatmap?: boolean;
  className?: string;
}

export function Map({ stations = [], heatmap, visibleTypes = [], showHeatmap = true, className = '' }: MapProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      <MapContainer
        center={MAP_DEFAULT_CENTER}
        zoom={MAP_DEFAULT_ZOOM}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapControls />
        {showHeatmap && heatmap && <HeatMapLayer data={heatmap} />}
        <StationMarkers stations={stations} visibleTypes={visibleTypes} />
      </MapContainer>

      {/* Légende */}
      <div className="absolute bottom-6 left-4 z-[1000] bg-white rounded-xl p-3 shadow-md border border-gray-100">
        <p className="text-xs font-semibold text-gray-700 mb-2">Couverture</p>
        {[
          { color: '#3b82f6', label: 'Excellente (>80%)' },
          { color: '#22c55e', label: 'Bonne (60-80%)' },
          { color: '#f59e0b', label: 'Modérée (40-60%)' },
          { color: '#ef4444', label: 'Faible (<40%)' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
