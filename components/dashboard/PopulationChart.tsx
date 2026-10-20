'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { formatNumber } from '@/lib/utils';

export interface PopulationBar {
  label: string;
  population: number;
  color: string;
}

interface PopulationChartProps {
  title: string;
  data: PopulationBar[];
  footnote?: string;
}

export function PopulationChart({ title, data, footnote }: PopulationChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a94a6' }} />
            <YAxis tickFormatter={(v: number) => v.toLocaleString('fr-FR')} tick={{ fontSize: 11, fill: '#8a94a6' }} />
            <Tooltip
              formatter={(v: number) => [formatNumber(v), 'Habitants']}
              contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: '#0b0f17', color: '#e8edf5', fontSize: '12px' }} itemStyle={{ color: '#e8edf5' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="population" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {footnote && <p className="mt-2 text-xs text-ink-dim/70">{footnote}</p>}
      </CardContent>
    </Card>
  );
}
