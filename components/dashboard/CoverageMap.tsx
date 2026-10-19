'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { RegionStats } from '@/types/api';

interface CoverageMapProps {
  byRegion: RegionStats[];
}

export function CoverageMap({ byRegion }: CoverageMapProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Couverture par région</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {byRegion.map((r) => (
            <div key={r.region}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700 font-medium">{r.region}</span>
                <span className="text-sm font-semibold text-gray-900">{(r.avg_coverage * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${r.avg_coverage * 100}%`,
                    backgroundColor: r.avg_coverage >= 0.8 ? '#22c55e' : r.avg_coverage >= 0.6 ? '#3b82f6' : r.avg_coverage >= 0.4 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
