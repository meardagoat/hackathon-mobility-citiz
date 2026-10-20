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
      <p className="py-12 text-center text-sm text-ink-soft">
        Aucune recommandation pour ce budget et ce périmètre.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.location_id} recommendation={rec} onViewOnMap={onViewOnMap} />
      ))}
    </div>
  );
}
