import React from 'react';
import { MapPin, TrendingUp, DollarSign, Star } from 'lucide-react';
import { Card } from '@/components/ui';
import { Badge } from '@/components/ui';
import { formatCurrency, formatNumber, formatPercent, getTransportLabel } from '@/lib/utils';
import { TRANSPORT_COLORS, TRANSPORT_ICONS } from '@/lib/constants';
import type { Recommendation } from '@/types/api';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onViewOnMap?: (rec: Recommendation) => void;
  rank?: number;
}

export function RecommendationCard({ recommendation: rec, onViewOnMap, rank }: RecommendationCardProps) {
  const color = TRANSPORT_COLORS[rec.transport_type];
  const icon = TRANSPORT_ICONS[rec.transport_type];

  return (
    <Card padding="none" className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-start gap-0">
        <div className="w-1 self-stretch flex-shrink-0 rounded-l-xl" style={{backgroundColor: color}} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {rank && (
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-600">#{rank}</span>
              )}
              <Badge style={{ backgroundColor: `${color}20`, color }} className="border-0">
                {icon} {getTransportLabel(rec.transport_type)}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-yellow-500">
              <Star size={12} fill="currentColor" />
              <span className="text-xs font-semibold text-gray-700">{rec.score.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-2">
            <MapPin size={13} className="text-gray-400 flex-shrink-0" />
            <p className="text-sm font-medium text-gray-800 truncate">{rec.address}</p>
          </div>

          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{rec.justification}</p>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5"><DollarSign size={12} /></div>
              <p className="text-xs font-semibold text-gray-800">{formatCurrency(rec.estimated_cost)}</p>
              <p className="text-[10px] text-gray-400">Coût</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5"><TrendingUp size={12} /></div>
              <p className="text-xs font-semibold text-gray-800">{formatNumber(rec.impact.new_population_served)}</p>
              <p className="text-[10px] text-gray-400">Nouveaux hab.</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">+%</div>
              <p className="text-xs font-semibold text-green-600">{formatPercent(rec.impact.coverage_improvement)}</p>
              <p className="text-[10px] text-gray-400">Amélioration</p>
            </div>
          </div>

          {onViewOnMap && (
            <button
              onClick={() => onViewOnMap(rec)}
              className="w-full text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <MapPin size={11} /> Voir sur la carte
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
