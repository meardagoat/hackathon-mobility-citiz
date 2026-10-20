import React from 'react';
import { Badge } from '@/components/ui';
import { formatNumber } from '@/lib/utils';
import { STATION_COLORS, STATION_ICONS, STATION_LABELS } from '@/lib/constants';
import type { StationProperties } from '@/types/api';

export function StationPopup({ station }: { station: StationProperties }) {
  const color = STATION_COLORS[station.type];
  return (
    <div className="p-1 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{STATION_ICONS[station.type]}</span>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{station.name}</p>
          <p className="text-xs text-gray-500">{station.operator}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 mb-2">
        {station.modes.map((mode) => (
          <Badge key={mode} style={{ backgroundColor: `${STATION_COLORS[mode]}20`, color: mode === station.type ? color : STATION_COLORS[mode] }} className="border-0 text-xs">
            {STATION_LABELS[mode]}
          </Badge>
        ))}
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <p>{formatNumber(station.population_served)} habitants à 400 m (carreaux non masqués)</p>
        {station.capacity !== null && <p>Capacité : {formatNumber(station.capacity)}</p>}
      </div>
    </div>
  );
}
