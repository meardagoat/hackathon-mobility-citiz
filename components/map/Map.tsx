'use client';
import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '@/lib/constants';
import { MapControls } from './MapControls';
import { StationMarkers } from './StationMarkers';
import { HeatMapLayer, intensityColor } from './HeatMapLayer';
import type { HeatmapResponse, StationFeature, StationType } from '@/types/api';

interface MapProps {
  stations?: StationFeature[];
  heatmap?: HeatmapResponse | null;
  visibleTypes?: StationType[];
  showHeatmap?: boolean;
  center?: [number, number];
  zoom?: number;
  className?: string;
  children?: React.ReactNode;
}

export function Map({
  stations = [],
  heatmap,
  visibleTypes = [],
  showHeatmap = true,
  center = MAP_DEFAULT_CENTER,
  zoom = MAP_DEFAULT_ZOOM,
  className = '',
  children,
}: MapProps) {
  const showLegend = showHeatmap && heatmap && heatmap.value_range;
  return (
    <div className={`relative w-full h-full ${className}`}>
      <MapContainer center={center} zoom={zoom} className="w-full h-full" zoomControl={false} preferCanvas>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapControls />
        {showHeatmap && heatmap && <HeatMapLayer data={heatmap} />}
        <StationMarkers stations={stations} visibleTypes={visibleTypes} />
        {children}
      </MapContainer>

      {showLegend && (
        <div className="absolute bottom-6 left-4 z-[1000] bg-white rounded-xl p-3 shadow-md border border-gray-100">
          <p className="text-xs font-semibold text-gray-700 mb-2">Habitants par carreau de 200 m</p>
          {[0.8, 0.6, 0.4, 0.2, 0].map((ratio) => (
            <div key={ratio} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: intensityColor(ratio) }} />
              <span className="text-[10px] text-gray-600">
                {ratio === 0 ? `moins de ${Math.round(0.2 * (heatmap.value_range?.max ?? 0))}` : `${Math.round(ratio * (heatmap.value_range?.max ?? 0))} et plus`}
              </span>
            </div>
          ))}
          {heatmap.masked_zones_count > 0 && (
            <p className="mt-1 text-[10px] text-gray-400">{heatmap.masked_zones_count} carreaux masqués non affichés</p>
          )}
        </div>
      )}
    </div>
  );
}
