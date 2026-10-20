import React from 'react';
import { Card } from '@/components/ui';
import { EQUIPMENT_LABELS } from '@/lib/constants';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { EquipmentType, RecommendationResponse } from '@/types/api';

export function ImpactSummary({ result }: { result: RecommendationResponse }) {
  const usageRate = result.budget > 0 ? result.total_cost / result.budget : 0;
  const byType = Object.entries(result.population_gained_by_type ?? {}) as [EquipmentType, number][];

  return (
    <Card className="border-volt/30 bg-volt/[0.04]">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-volt font-medium">Coût total sur 3 ans</p>
          <p className="text-lg font-bold text-volt">{formatCurrency(result.total_cost)}</p>
          <div className="mt-1 h-1.5 bg-white/10 rounded-full">
            <div className="h-full bg-volt rounded-full shadow-[0_0_10px_#d4ff3a]" style={{ width: `${Math.min(usageRate, 1) * 100}%` }} />
          </div>
          <p className="text-[10px] text-volt mt-0.5">
            Budget {formatCurrency(result.budget)}, reste {formatCurrency(result.remaining_budget)}
          </p>
        </div>
        <div>
          <p className="text-xs text-volt font-medium">Habitants nouvellement desservis</p>
          {result.total_population_gained !== null ? (
            <p className="text-lg font-bold text-volt">{formatNumber(result.total_population_gained)}</p>
          ) : (
            <p className="text-sm font-semibold text-volt">Pas de total tous types</p>
          )}
          {byType.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {byType.map(([type, population]) => (
                <li key={type} className="text-xs text-volt">
                  {EQUIPMENT_LABELS[type]} : {formatNumber(population)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {result.total_population_gained === null && byType.length > 0 && (
        <p className="mt-3 text-[11px] text-volt">
          Un habitant couvert par deux types d’équipement est compté dans chacun : les sous-totaux ne s’additionnent pas.
        </p>
      )}
      <p className="mt-2 text-[11px] text-volt">Carreaux masqués (secret statistique INSEE) exclus des populations.</p>
    </Card>
  );
}
