'use client';
import React from 'react';
import { ZoomIn, ZoomOut, Locate } from 'lucide-react';
import { useMap } from 'react-leaflet';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '@/lib/constants';

export function MapControls() {
  const map = useMap();

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1">
      <button
        onClick={() => map.zoomIn()}
        className="p-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
        title="Zoom +"
      >
        <ZoomIn size={16} />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="p-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
        title="Zoom -"
      >
        <ZoomOut size={16} />
      </button>
      <button
        onClick={() => map.setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM)}
        className="p-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
        title="Réinitialiser"
      >
        <Locate size={16} />
      </button>
    </div>
  );
}
