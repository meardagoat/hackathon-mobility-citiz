'use client';
import React from 'react';
import { Select } from '@/components/ui';
import { MOCK_REGIONS } from '@/lib/constants';

interface RegionSelectorProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

export function RegionSelector({ value, onChange, label = 'Région' }: RegionSelectorProps) {
  return (
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={MOCK_REGIONS.map((r) => ({ value: r.id, label: r.name }))}
      placeholder="Toutes les régions"
    />
  );
}
