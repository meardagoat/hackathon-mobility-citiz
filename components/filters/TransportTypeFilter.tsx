'use client';
import React from 'react';
import { STATION_COLORS, STATION_ICONS, STATION_LABELS } from '@/lib/constants';
import type { StationType } from '@/types/api';

interface TransportTypeFilterProps {
  types: StationType[];
  selected: StationType[];
  onChange: (types: StationType[]) => void;
  label?: string;
}

export function TransportTypeFilter({ types, selected, onChange, label = 'Types de transport' }: TransportTypeFilterProps) {
  const toggle = (type: StationType) => {
    onChange(selected.includes(type) ? selected.filter((t) => t !== type) : [...selected, type]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-ink">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {types.map((type) => {
          const active = selected.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggle(type)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
              style={active ? { backgroundColor: STATION_COLORS[type], borderColor: STATION_COLORS[type], color: '#06080d' } : { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)', color: '#8a94a6' }}
            >
              <span>{STATION_ICONS[type]}</span>
              {STATION_LABELS[type]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
