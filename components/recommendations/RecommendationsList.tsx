import React from 'react';
import { RecommendationCard } from './RecommendationCard';
import type { Recommendation } from '@/types/api';

interface RecommendationsListProps {
  recommendations: Recommendation[];
  onViewOnMap?: (rec: Recommendation) => void;
}

export function RecommendationsList({ recommendations, onViewOnMap }: RecommendationsListProps) {
  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm">Aucune recommandation</p>
        <p className="text-xs mt-1">Configurez les paramètres et lancez le calcul</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((rec, i) => (
        <RecommendationCard key={rec.id} recommendation={rec} rank={i + 1} onViewOnMap={onViewOnMap} />
      ))}
    </div>
  );
}
