import React from 'react';
import { Card } from '@/components/ui';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import type { RecommendationSummary } from '@/types/api';

interface ImpactSummaryProps {
  summary: RecommendationSummary;
}

export function ImpactSummary({ summary }: ImpactSummaryProps) {
  const usageRate = summary.budget_used / (summary.budget_used + summary.budget_remaining);

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-blue-600 font-medium">Budget utilisé</p>
          <p className="text-lg font-bold text-blue-800">{formatCurrency(summary.budget_used)}</p>
          <div className="mt-1 h-1.5 bg-blue-200 rounded-full">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${usageRate * 100}%` }} />
          </div>
          <p className="text-[10px] text-blue-500 mt-0.5">Restant : {formatCurrency(summary.budget_remaining)}</p>
        </div>
        <div>
          <p className="text-xs text-blue-600 font-medium">Population desservie</p>
          <p className="text-lg font-bold text-blue-800">{formatNumber(summary.total_new_population)}</p>
          <p className="text-xs text-blue-600 mt-1">+{formatPercent(summary.avg_coverage_improvement)} en moyenne</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-blue-100 flex items-center justify-between">
        <span className="text-xs text-blue-600">{summary.total_recommendations} recommandations générées</span>
      </div>
    </Card>
  );
}
