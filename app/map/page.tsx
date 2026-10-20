'use client';
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Layers, Eye, EyeOff } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { TransportTypeFilter } from '@/components/filters/TransportTypeFilter';
import { DataModeNotice, ErrorState } from '@/components/DataStatus';
import { useStations } from '@/hooks/useStations';
import { useHeatmap } from '@/hooks/useCoverage';
import { DEFAULT_AREA, STATION_TYPES } from '@/lib/constants';
import { formatNumber } from '@/lib/utils';
import type { StationType } from '@/types/api';

const MapComponent = dynamic(
  () => import('@/components/map/Map').then((m) => m.Map),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100"><Spinner label="Chargement de la carte..." /></div> }
);

export default function MapPage() {
  const stations = useStations({ area: DEFAULT_AREA });
  const heatmap = useHeatmap({ area: DEFAULT_AREA, metric: 'population', resolution: '200m' });
  const [showHeatmap, setShowHeatmap] = useState(true);

  const features = useMemo(() => stations.data?.features ?? [], [stations.data]);
  const presentTypes = useMemo(
    () => STATION_TYPES.filter((type) => features.some((f) => f.properties.type === type)),
    [features]
  );
  const [visibleTypes, setVisibleTypes] = useState<StationType[]>([]);
  useEffect(() => setVisibleTypes(presentTypes), [presentTypes]);

  const meta = stations.data?.meta ?? heatmap.data?.meta;

  return (
    <div className="flex h-screen">
      <div className="flex-1 relative">
        <MapComponent
          stations={features}
          heatmap={heatmap.data}
          visibleTypes={visibleTypes}
          showHeatmap={showHeatmap}
          className="w-full h-full"
        />
      </div>

      <div className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-900">Filtres et couches</h2>
          </div>
          {meta && <div className="mt-2"><DataModeNotice meta={meta} /></div>}
        </div>

        <div className="p-5 space-y-6">
          {stations.error && <ErrorState message={`Stations indisponibles : ${stations.error}`} />}
          {heatmap.error && <ErrorState message={`Carte de population indisponible : ${heatmap.error}`} />}

          {presentTypes.length > 0 && (
            <TransportTypeFilter
              types={presentTypes}
              selected={visibleTypes}
              onChange={setVisibleTypes}
              label="Types visibles"
            />
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Couches</p>
            <button
              type="button"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="flex items-center gap-2 w-full p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {showHeatmap ? <Eye size={14} className="text-blue-500" /> : <EyeOff size={14} className="text-gray-400" />}
              <span className="text-sm text-gray-700">Population par carreau</span>
            </button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Statistiques</p>
            {stations.loading ? (
              <Spinner size="sm" />
            ) : stations.data ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Stations visibles</span>
                  <span className="font-semibold text-gray-900">
                    {formatNumber(features.filter((s) => visibleTypes.includes(s.properties.type)).length)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total stations</span>
                  <span className="font-semibold text-gray-900">{formatNumber(stations.data.meta.total_features)}</span>
                </div>
                {stations.data.meta.truncated && (
                  <p className="text-xs text-amber-600">
                    Liste tronquée : {formatNumber(stations.data.meta.returned_features)} stations affichées.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
