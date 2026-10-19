'use client';
import React from 'react';
import { Users, MapPin, TrendingUp, Activity } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { StatCard, PopulationChart, StationsPieChart, CoverageMap } from '@/components/dashboard';
import { useStatistics } from '@/hooks/useStatistics';
import { formatNumber, formatPercent } from '@/lib/utils';

export default function DashboardPage() {
  const { summary, population, loading, error } = useStatistics();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" label="Chargement des données..." />
      </div>
    );
  }

  if (!summary || !population) return null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Mobilité</h1>
        <p className="text-sm text-gray-500 mt-1">
          {summary.region} — Données en temps réel
          {error && <span className="ml-2 text-yellow-600 text-xs">⚠ {error}</span>}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Population couverte"
          value={formatNumber(summary.population.covered)}
          subtitle={`sur ${formatNumber(summary.population.total)} habitants`}
          icon={<Users size={20} />}
          trend={{value: 2.4, label: 'vs mois dernier'}}
          color="#3b82f6"
        />
        <StatCard
          title="Stations actives"
          value={summary.stations.total.toLocaleString('fr-FR')}
          subtitle="tous types confondus"
          icon={<MapPin size={20} />}
          color="#8b5cf6"
        />
        <StatCard
          title="Taux de couverture"
          value={formatPercent(summary.population.coverage_rate)}
          subtitle="de la population"
          icon={<TrendingUp size={20} />}
          trend={{value: 1.1, label: 'vs trimestre'}}
          color="#22c55e"
        />
        <StatCard
          title="Options / habitant"
          value={summary.avg_options_per_inhabitant.toFixed(3)}
          subtitle={`Temps moyen : ${summary.avg_walking_time_minutes} min`}
          icon={<Activity size={20} />}
          color="#f59e0b"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <PopulationChart data={population.distribution} />
        <StationsPieChart byType={summary.stations.by_type} />
      </div>

      {/* Carte de couverture par région */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <CoverageMap byRegion={population.by_region} />
        </div>
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Accessibilité de la population</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Bien desservie', value: summary.accessibility.well_served, color: '#22c55e', icon: '✅' },
              { label: 'Modérément', value: summary.accessibility.moderately_served, color: '#f59e0b', icon: '⚠️' },
              { label: 'Mal desservie', value: summary.accessibility.poorly_served, color: '#ef4444', icon: '❌' },
            ].map((item) => (
              <div key={item.label} className="text-center p-4 rounded-xl" style={{ backgroundColor: `${item.color}10` }}>
                <p className="text-2xl mb-1">{item.icon}</p>
                <p className="text-lg font-bold" style={{color: item.color}}>{formatNumber(item.value)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
