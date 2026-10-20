'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Lightbulb, MapPin } from 'lucide-react';
import { Spinner, Modal } from '@/components/ui';
import { BudgetForm, RecommendationsList, ImpactSummary } from '@/components/recommendations';
import { DataModeNotice, ErrorState } from '@/components/DataStatus';
import { api } from '@/lib/api';
import { EQUIPMENT_COLORS, EQUIPMENT_LABELS, PERIMETERS } from '@/lib/constants';
import type { Recommendation, RecommendationRequest, RecommendationResponse } from '@/types/api';

const PointMap = dynamic(
  () => import('@/components/map/PointMap').then((m) => m.PointMap),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-ink/[0.04]"><Spinner /></div> }
);

export default function RecommendationsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapRec, setMapRec] = useState<Recommendation | null>(null);

  const handleSubmit = async (request: RecommendationRequest) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.recommendations(request));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-96 flex-shrink-0 bg-paper border-r border-ink/10 flex flex-col">
        <div className="px-6 py-5 border-b border-ink/10">
          <div className="flex items-center gap-2">
            <Lightbulb size={18} className="text-teal-ink" />
            <h1 className="text-base font-semibold text-ink">Recommandations</h1>
          </div>
          <p className="text-xs text-ink-dim mt-1">Emplacements prioritaires sous contrainte de budget</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <ErrorState message={`Recommandations indisponibles : ${error}`} />}
          <BudgetForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" label="Chargement des recommandations..." />
          </div>
        ) : result ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">
                {result.recommendations.length} recommandation{result.recommendations.length > 1 ? 's' : ''}
                {result.perimeter && ` — ${PERIMETERS[result.perimeter].label}`}
              </h2>
              <DataModeNotice meta={result.meta} />
            </div>
            {result.recommendations.length > 0 && <ImpactSummary result={result} />}
            <RecommendationsList recommendations={result.recommendations} onViewOnMap={setMapRec} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-ink-soft">
            <Lightbulb size={48} className="mb-4 text-gray-200" />
            <p className="text-base font-medium text-ink-dim">Choisissez un budget et un périmètre</p>
          </div>
        )}
      </div>

      <Modal open={!!mapRec} onClose={() => setMapRec(null)} title="Localisation de la recommandation" size="lg">
        {mapRec && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={14} className="text-ink-soft" />
              <p className="text-sm text-ink-dim">
                #{mapRec.rank} {EQUIPMENT_LABELS[mapRec.equipment_type]}, commune INSEE {mapRec.commune_code}
              </p>
            </div>
            <div className="h-64 rounded-xl overflow-hidden">
              <PointMap
                lat={mapRec.lat}
                lon={mapRec.lon}
                label={`#${mapRec.rank} ${EQUIPMENT_LABELS[mapRec.equipment_type]}`}
                color={EQUIPMENT_COLORS[mapRec.equipment_type]}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
