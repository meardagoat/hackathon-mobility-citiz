'use client';
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { TRANSPORT_COLORS, TRANSPORT_LABELS } from '@/lib/constants';
import type { TransportType } from '@/types/api';

interface StationsPieChartProps {
  byType: Record<TransportType, number>;
}

export function StationsPieChart({ byType }: StationsPieChartProps) {
  const data = (Object.entries(byType) as [TransportType, number][])
    .filter(([, v]) => v > 0)
    .map(([type, count]) => ({
      name: TRANSPORT_LABELS[type],
      value: count,
      color: TRANSPORT_COLORS[type],
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stations par type de transport</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip formatter={(v: number) => [v.toLocaleString('fr-FR'), 'Stations']} contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px'}} />
            <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{fontSize: 11, color: '#6b7280'}}>{v}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
