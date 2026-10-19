'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Layers, Eye, EyeOff } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { RegionSelector } from '@/components/filters/RegionSelector';
import { TransportTypeFilter } from '@/components/filters/TransportTypeFilter';
import { useStations } from '@/hooks/useStations';
import { useCoverage } from '@/hooks/useCoverage';
import type { TransportType } from '@/types/api';

// Import dynamique obligatoire pour Leaflet avec Next.js SSR
const MapComponent = dynamic(
  () => import('@/components/map/Map').then((m) => m.Map),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100"><Spinner label="Chargement de la carte..." /></div> }
);

export default function MapPage() {
  const [region, setRegion] = useState('');
  const [visibleTypes, setVisibleTypes] = useState<TransportType[]>(['bus', 'metro', 'tram', 'bike', 'carsharing', 'scooter']);
  const [showHeatmap, setShowHeatmap] = useState(true);

  const { stations, loading: stationsLoading } = useStations(region ? { region } : undefined);
  const { heatmap } = useCoverage(region ? { region } : undefined);

  return (
    <div className="flex h-screen">
      {/* Carte */}
      <div className="flex-1 relative">
        <MapComponent
          stations={stations}
          heatmap={heatmap}
          visibleTypes={visibleTypes}
          showHeatmap={showHeatmap}
          className="w-full h-full"
        />
      </div>

      {/* Panneau de filtres */}
      <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-900">Filtres & Couches</h2>
          </div>
        </div>

        <div className="p-5 space-y-6">
          <RegionSelector value={region} onChange={setRegion} label="Filtrer par région" />

          <TransportTypeFilter
            selected={visibleTypes}
            onChange={setVisibleTypes}
            label="Types de transport visibles"
          />

          {/* Toggle heatmap */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Couches</p>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="flex items-center gap-2 w-full p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {showHeatmap ? <Eye size={14} className="text-blue-500" /> : <EyeOff size={14} className="text-gray-400" />}
              <span className="text-sm text-gray-700">Heat map de couverture</span>
            </button>
          </div>

          {/* Stats rapides */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Statistiques</p>
            {stationsLoading ? (
              <Spinner size="sm" />
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Stations visibles</span>
                  <span className="font-semibold text-gray-900">{stations.filter(s => visibleTypes.includes(s.type)).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total stations</span>
                  <span className="font-semibold text-gray-900">{stations.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
