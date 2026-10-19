'use client';
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { TRANSPORT_COLORS, TRANSPORT_ICONS } from '@/lib/constants';
import { StationPopup } from './StationPopup';
import type { Station, TransportType } from '@/types/api';

function createStationIcon(type: TransportType) {
  const color = TRANSPORT_COLORS[type];
  const icon = TRANSPORT_ICONS[type];
  return divIcon({
    html: `<div style="width:32px;height:32px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px">${icon}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: '',
  });
}

interface StationMarkersProps {
  stations: Station[];
  visibleTypes: TransportType[];
}

export function StationMarkers({ stations, visibleTypes }: StationMarkersProps) {
  const filtered = visibleTypes.length > 0 ? stations.filter((s) => visibleTypes.includes(s.type)) : stations;

  return (
    <>
      {filtered.map((station) => (
        <Marker
          key={station.id}
          position={[station.location.coordinates[1], station.location.coordinates[0]]}
          icon={createStationIcon(station.type)}
        >
          <Popup>
            <StationPopup station={station} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}
