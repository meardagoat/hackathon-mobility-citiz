'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { PopulationDistribution } from '@/types/api';
import { formatNumber } from '@/lib/utils';

interface PopulationChartProps {
  data: PopulationDistribution[];
}

export function PopulationChart({ data }: PopulationChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition de la population par couverture</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{top: 4, right: 8, left: 8, bottom: 4}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{fontSize: 11, fill: '#6b7280'}} />
            <YAxis tickFormatter={formatNumber} tick={{fontSize: 11, fill: '#6b7280'}} />
            <Tooltip
              formatter={(v: number) => [formatNumber(v), 'Population']}
              contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px'}}
            />
            <Bar dataKey="population" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
