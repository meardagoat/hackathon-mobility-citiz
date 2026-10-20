'use client';
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { STATION_COLORS, STATION_LABELS, STATION_TYPES } from '@/lib/constants';
import type { StationType } from '@/types/api';

interface StationsPieChartProps {
  byType: Partial<Record<StationType, number>>;
}

export function StationsPieChart({ byType }: StationsPieChartProps) {
  const data = STATION_TYPES
    .filter((type) => (byType[type] ?? 0) > 0)
    .map((type) => ({ name: STATION_LABELS[type], value: byType[type] ?? 0, color: STATION_COLORS[type] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Arrêts et stations par type</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-dim/70">Aucune station dans la zone.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie stroke="#06080d" strokeWidth={2} data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [v.toLocaleString('fr-FR'), 'Stations']} contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: '#0b0f17', color: '#e8edf5', fontSize: '12px' }} itemStyle={{ color: '#e8edf5' }} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: '#8a94a6' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
