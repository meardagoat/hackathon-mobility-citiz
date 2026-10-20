import React from 'react';
import { MapPin } from 'lucide-react';
import { Badge, Card } from '@/components/ui';
import { EQUIPMENT_COLORS, EQUIPMENT_LABELS } from '@/lib/constants';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import type { Recommendation } from '@/types/api';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onViewOnMap?: (rec: Recommendation) => void;
}

export function RecommendationCard({ recommendation: rec, onViewOnMap }: RecommendationCardProps) {
  const color = EQUIPMENT_COLORS[rec.equipment_type];

  return (
    <Card padding="none" className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-start">
        <div className="w-1 self-stretch flex-shrink-0 rounded-l-xl" style={{ backgroundColor: color }} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-600">#{rec.rank}</span>
              <Badge style={{ backgroundColor: `${color}20`, color }} className="border-0">
                {EQUIPMENT_LABELS[rec.equipment_type]}
              </Badge>
            </div>
            {rec.score !== null && (
              <span className="text-xs text-gray-500" title="Valeur ajoutée relative au meilleur candidat (0 à 100)">
                Score {rec.score.toFixed(1)} / 100
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mb-3">
            <MapPin size={13} className="text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-800">Commune INSEE {rec.commune_code}</p>
          </div>

          <dl className="grid grid-cols-3 gap-3 mb-3 text-center">
            <div>
              <dd className="text-xs font-semibold text-gray-800">{formatCurrency(rec.cost)}</dd>
              <dt className="text-[10px] text-gray-400">Coût sur 3 ans</dt>
            </div>
            <div>
              <dd className="text-xs font-semibold text-gray-800">{formatNumber(rec.population_gained)}</dd>
              <dt className="text-[10px] text-gray-400">Nouveaux habitants</dt>
            </div>
            <div>
              <dd className="text-xs font-semibold text-gray-800">{formatCurrency(rec.cumulative_cost)}</dd>
              <dt className="text-[10px] text-gray-400">Cumul</dt>
            </div>
          </dl>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 mb-3">
            {rec.adequation !== null && <span>Adéquation du modèle : {formatPercent(rec.adequation)}</span>}
            {rec.cars_avoided !== null && rec.cars_avoided > 0 && <span>Voitures évitées : {formatNumber(rec.cars_avoided)}</span>}
            {rec.estimated_value !== null && <span>Valeur estimée : {formatNumber(rec.estimated_value)}</span>}
          </div>

          {onViewOnMap && (
            <button
              type="button"
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
