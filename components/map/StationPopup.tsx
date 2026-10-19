import React from 'react';
import { Badge } from '@/components/ui';
import { formatNumber, getTransportLabel } from '@/lib/utils';
import { TRANSPORT_COLORS, TRANSPORT_ICONS } from '@/lib/constants';
import type { Station } from '@/types/api';

interface StationPopupProps {
  station: Station;
}

export function StationPopup({ station }: StationPopupProps) {
  const color = TRANSPORT_COLORS[station.type];
  const statusColors: Record<Station['status'], string> = {
    active: 'success',
    inactive: 'danger',
    maintenance: 'warning',
  };
  const statusLabels: Record<Station['status'], string> = {
    active: 'Actif',
    inactive: 'Inactif',
    maintenance: 'Maintenance',
  };

  return (
    <div className="p-1 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{TRANSPORT_ICONS[station.type]}</span>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{station.name}</p>
          <p className="text-xs text-gray-500">{station.operator}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Badge style={{ backgroundColor: `${color}20`, color }} className="border-0 text-xs">
          {getTransportLabel(station.type)}
        </Badge>
        <Badge variant={statusColors[station.status] as 'success' | 'danger' | 'warning'}>
          {statusLabels[station.status]}
        </Badge>
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <p>👥 {formatNumber(station.population_served)} hab. desservis</p>
        <p>📍 Rayon : {station.walking_radius_m}m</p>
        {station.lines && station.lines.length > 0 && (
          <p>🚏 Lignes : {station.lines.join(', ')}</p>
        )}
      </div>
    </div>
  );
}
