'use client';
import React from 'react';
import { TRANSPORT_COLORS, TRANSPORT_LABELS, TRANSPORT_ICONS } from '@/lib/constants';
import type { TransportType } from '@/types/api';

const ALL_TYPES: TransportType[] = ['bus', 'metro', 'tram', 'bike', 'carsharing', 'scooter'];

interface TransportTypeFilterProps {
  selected: TransportType[];
  onChange: (types: TransportType[]) => void;
  label?: string;
}

export function TransportTypeFilter({ selected, onChange, label = 'Types de transport' }: TransportTypeFilterProps) {
  const toggle = (type: TransportType) => {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map((type) => {
          const active = selected.includes(type);
          return (
            <button
              key={type}
              onClick={() => toggle(type)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
              style={active ? { backgroundColor: TRANSPORT_COLORS[type], borderColor: TRANSPORT_COLORS[type], color: '#fff' } : { backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#374151' }}
            >
              <span>{TRANSPORT_ICONS[type]}</span>
              {TRANSPORT_LABELS[type]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
