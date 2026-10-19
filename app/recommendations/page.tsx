'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Lightbulb, MapPin } from 'lucide-react';
import { Spinner, Modal } from '@/components/ui';
import { BudgetForm, RecommendationsList, ImpactSummary } from '@/components/recommendations';
import { api } from '@/lib/api';
import type { RecommendationRequest, RecommendationsResponse, Recommendation } from '@/types/api';

const MapComponent = dynamic(
  () => import('@/components/map/Map').then((m) => m.Map),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100"><Spinner /></div> }
);

export default function RecommendationsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapRec, setMapRec] = useState<Recommendation | null>(null);

  const handleSubmit = async (request: RecommendationRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRecommendations(request);
      setResult(res);
    } catch {
      setError('Impossible de contacter l\'API. Affichage de données fictives.');
      // Mock fallback
      setResult({
        recommendations: [
          {
            id: 'r1', rank: 1,
            location: { type: 'Point', coordinates: [2.3700, 48.8700] },
            address: '15 Rue de la République, Saint-Denis',
            transport_type: 'bus',
            estimated_cost: 150000,
            impact: { new_population_served: 8500, coverage_improvement: 0.12, existing_coverage: 0.45, projected_coverage: 0.57 },
            justification: 'Zone densément peuplée avec faible couverture actuelle. Fort potentiel d\'amélioration.',
            score: 0.87,
            nearby_facilities: { bus_stops: 2, offices: 15, residential_density: 'high' },
          },
          {
            id: 'r2', rank: 2,
            location: { type: 'Point', coordinates: [2.3500, 48.8400] },
            address: '42 Avenue Victor Hugo, Vincennes',
            transport_type: 'bike',
            estimated_cost: 50000,
            impact: { new_population_served: 3200, coverage_improvement: 0.08, existing_coverage: 0.62, projected_coverage: 0.70 },
            justification: 'Corridor commercial avec forte demande de mobilité douce. Coût-efficacité élevé.',
            score: 0.74,
            nearby_facilities: { bus_stops: 4, offices: 28, residential_density: 'medium' },
          },
          {
            id: 'r3', rank: 3,
            location: { type: 'Point', coordinates: [2.3800, 48.8600] },
            address: '8 Place de la Nation, Paris 12e',
            transport_type: 'carsharing',
            estimated_cost: 80000,
            impact: { new_population_served: 5100, coverage_improvement: 0.06, existing_coverage: 0.78, projected_coverage: 0.84 },
            justification: 'Noeud multimodal existant. Complémentarité forte avec métro et bus.',
            score: 0.68,
            nearby_facilities: { metro_stations: 1, bus_stops: 8, offices: 42, residential_density: 'high' },
          },
        ],
        summary: { total_recommendations: 3, total_cost: 280000, total_new_population: 16800, avg_coverage_improvement: 0.087, budget_used: 280000, budget_remaining: 4720000 },
        optimization_method: 'greedy_coverage',
        computation_time_ms: 342,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Colonne gauche — Formulaire */}
      <div className="w-96 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Lightbulb size={18} className="text-blue-500" />
            <h1 className="text-base font-semibold text-gray-900">Recommandations IA</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">Optimisez la couverture de mobilité dans votre budget</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
              ⚠️ {error}
            </div>
          )}
          <BudgetForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>

      {/* Colonne droite — Résultats */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" label="Calcul des recommandations en cours..." />
          </div>
        ) : result ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <ImpactSummary summary={result.summary} />
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                {result.recommendations.length} recommandations
              </h2>
              <span className="text-xs text-gray-400">
                Méthode : {result.optimization_method} — {result.computation_time_ms}ms
              </span>
            </div>
            <RecommendationsList
              recommendations={result.recommendations}
              onViewOnMap={(rec) => setMapRec(rec)}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Lightbulb size={48} className="mb-4 text-gray-200" />
            <p className="text-base font-medium text-gray-500">Prêt à calculer</p>
            <p className="text-sm mt-1">Configurez les paramètres et lancez le calcul</p>
          </div>
        )}
      </div>

      {/* Modal carte pour une recommandation */}
      <Modal open={!!mapRec} onClose={() => setMapRec(null)} title="Localisation de la recommandation" size="lg">
        {mapRec && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={14} className="text-gray-400" />
              <p className="text-sm text-gray-600">{mapRec.address}</p>
            </div>
            <div className="h-64 rounded-xl overflow-hidden">
              <MapComponent
                stations={[{
                  id: mapRec.id,
                  name: mapRec.address,
                  type: mapRec.transport_type,
                  operator: 'Recommandation',
                  location: mapRec.location,
                  population_served: mapRec.impact.new_population_served,
                  walking_radius_m: 400,
                  status: 'active',
                }]}
                visibleTypes={[mapRec.transport_type]}
                showHeatmap={false}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
