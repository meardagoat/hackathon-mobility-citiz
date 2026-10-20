'use client';
import React from 'react';
import { Users, MapPin, Footprints, Car } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { StatCard, PopulationChart, StationsPieChart } from '@/components/dashboard';
import { DataModeNotice, EmptyState, ErrorState } from '@/components/DataStatus';
import { useSummary, usePopulation } from '@/hooks/useStatistics';
import { COVERAGE_LEVEL_COLORS, COVERAGE_LEVEL_LABELS, DEFAULT_AREA } from '@/lib/constants';
import { formatNumber, formatPercent } from '@/lib/utils';
import type { CoverageLevel } from '@/types/api';

export default function DashboardPage() {
  const summary = useSummary(DEFAULT_AREA);
  const levels = usePopulation(DEFAULT_AREA, 'coverage_level');

  if (summary.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" label="Chargement des données..." />
      </div>
    );
  }

  if (summary.error || !summary.data) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Mobilité</h1>
        <ErrorState message={`Statistiques indisponibles : ${summary.error ?? 'réponse vide'}`} />
      </div>
    );
  }

  const s = summary.data;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Mobilité</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">Bordeaux Métropole</span>
          <DataModeNotice meta={s.meta} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Population"
          value={formatNumber(s.population_total)}
          subtitle={`${formatNumber(s.zones_count)} carreaux, dont ${formatNumber(s.masked_zones_count)} masqués (non comptés)`}
          icon={<Users size={20} />}
          color="#3b82f6"
        />
        <StatCard
          title="Arrêts et stations"
          value={formatNumber(s.stations_count)}
          subtitle="offre existante"
          icon={<MapPin size={20} />}
          color="#8b5cf6"
        />
        <StatCard
          title="Option à 400 m"
          value={formatPercent(s.population_with_any_option_share)}
          subtitle={`${formatNumber(s.population_with_any_option)} habitants`}
          icon={<Footprints size={20} />}
          color="#22c55e"
        />
        <StatCard
          title="Citiz à 400 m"
          value={formatPercent(s.citiz.population_within_5min_share)}
          subtitle={`${formatNumber(s.citiz.stations_count)} stations Citiz`}
          icon={<Car size={20} />}
          color="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {levels.loading ? (
          <Spinner label="Chargement de la répartition..." />
        ) : levels.error ? (
          <ErrorState message={`Répartition indisponible : ${levels.error}`} />
        ) : levels.data && levels.data.available ? (
          <PopulationChart
            title="Population par niveau de couverture"
            data={levels.data.groups.map((g) => ({
              label: COVERAGE_LEVEL_LABELS[g.key as CoverageLevel] ?? g.key,
              population: g.population,
              color: COVERAGE_LEVEL_COLORS[g.key as CoverageLevel] ?? '#6b7280',
            }))}
            footnote={
              s.meta.coverage_thresholds
                ? `Faible : 1 à ${s.meta.coverage_thresholds.low_max} options, moyenne : jusqu'à ${s.meta.coverage_thresholds.medium_max}, élevée : au-delà. Carreaux masqués exclus.`
                : undefined
            }
          />
        ) : (
          <EmptyState message="Niveaux de couverture non disponibles pour ces données." />
        )}
        <StationsPieChart byType={s.stations_by_type} />
      </div>
    </div>
  );
}
