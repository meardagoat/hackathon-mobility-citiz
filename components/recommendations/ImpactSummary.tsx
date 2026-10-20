import React from 'react';
import { Card } from '@/components/ui';
import { EQUIPMENT_LABELS } from '@/lib/constants';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { EquipmentType, RecommendationResponse } from '@/types/api';

export function ImpactSummary({ result }: { result: RecommendationResponse }) {
  const usageRate = result.budget > 0 ? result.total_cost / result.budget : 0;
  const byType = Object.entries(result.population_gained_by_type ?? {}) as [EquipmentType, number][];

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-blue-600 font-medium">Coût total sur 3 ans</p>
          <p className="text-lg font-bold text-blue-800">{formatCurrency(result.total_cost)}</p>
          <div className="mt-1 h-1.5 bg-blue-200 rounded-full">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(usageRate, 1) * 100}%` }} />
          </div>
          <p className="text-[10px] text-blue-500 mt-0.5">
            Budget {formatCurrency(result.budget)}, reste {formatCurrency(result.remaining_budget)}
          </p>
        </div>
        <div>
          <p className="text-xs text-blue-600 font-medium">Habitants nouvellement desservis</p>
          {result.total_population_gained !== null ? (
            <p className="text-lg font-bold text-blue-800">{formatNumber(result.total_population_gained)}</p>
          ) : (
            <p className="text-sm font-semibold text-blue-800">Pas de total tous types</p>
          )}
          {byType.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {byType.map(([type, population]) => (
                <li key={type} className="text-xs text-blue-700">
                  {EQUIPMENT_LABELS[type]} : {formatNumber(population)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {result.total_population_gained === null && byType.length > 0 && (
        <p className="mt-3 text-[11px] text-blue-600">
          Un habitant couvert par deux types d’équipement est compté dans chacun : les sous-totaux ne s’additionnent pas.
        </p>
      )}
      <p className="mt-2 text-[11px] text-blue-500">Carreaux masqués (secret statistique INSEE) exclus des populations.</p>
    </Card>
  );
}
