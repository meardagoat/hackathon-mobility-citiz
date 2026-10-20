'use client';
import React from 'react';
import { CircleMarker, Popup } from 'react-leaflet';
import { STATION_COLORS } from '@/lib/constants';
import { StationPopup } from './StationPopup';
import type { StationFeature, StationType } from '@/types/api';

interface StationMarkersProps {
  stations: StationFeature[];
  visibleTypes: StationType[];
}

export function StationMarkers({ stations, visibleTypes }: StationMarkersProps) {
  return (
    <>
      {stations
        .filter((s) => visibleTypes.includes(s.properties.type))
        .map((station) => {
          const [lon, lat] = station.geometry.coordinates;
          const color = STATION_COLORS[station.properties.type];
          return (
            <CircleMarker
              key={station.properties.station_id}
              center={[lat, lon]}
              radius={5}
              pathOptions={{ color: '#06080d', weight: 1, fillColor: color, fillOpacity: 0.9 }}
            >
              <Popup>
                <StationPopup station={station.properties} />
              </Popup>
            </CircleMarker>
          );
        })}
    </>
  );
}
