'use client';
import React, { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { RegionSelector } from '@/components/filters/RegionSelector';
import { TransportTypeFilter } from '@/components/filters/TransportTypeFilter';
import { BudgetSlider } from '@/components/filters/BudgetSlider';
import { DEFAULT_COST_ESTIMATES, TRANSPORT_LABELS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import type { RecommendationRequest, TransportType } from '@/types/api';

interface BudgetFormProps {
  onSubmit: (request: RecommendationRequest) => void;
  loading?: boolean;
}

export function BudgetForm({ onSubmit, loading = false }: BudgetFormProps) {
  const [region, setRegion] = useState('ile-de-france');
  const [budget, setBudget] = useState(5000000);
  const [transportTypes, setTransportTypes] = useState<TransportType[]>(['bus', 'bike', 'carsharing']);
  const [minPopulation, setMinPopulation] = useState(1000);
  const [priority, setPriority] = useState<'underserved_areas' | 'high_density' | 'cost_efficiency'>('underserved_areas');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      region,
      budget, // Déjà correct, correspond au champ 'budget' attendu par le backend
      transport_types: transportTypes,
      constraints: { min_population: minPopulation, prioritize: priority },
      cost_estimates: DEFAULT_COST_ESTIMATES,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <RegionSelector value={region} onChange={setRegion} />
      <BudgetSlider value={budget} onChange={setBudget} />
      <TransportTypeFilter selected={transportTypes} onChange={setTransportTypes} />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Population min."
          type="number"
          value={minPopulation}
          onChange={(e) => setMinPopulation(Number(e.target.value))}
          min={0}
        />
        <Select
          label="Priorité"
          value={priority}
          onChange={(e) => setPriority(e.target.value as typeof priority)}
          options={[
            { value: 'underserved_areas', label: 'Zones sous-desservies' },
            { value: 'high_density', label: 'Haute densité' },
            { value: 'cost_efficiency', label: 'Coût-efficacité' },
          ]}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Coûts estimés par type</p>
        <div className="space-y-1.5">
          {transportTypes.map((type) => (
            <div key={type} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">{TRANSPORT_LABELS[type]}</span>
              <span className="text-sm font-semibold text-gray-800">{formatCurrency(DEFAULT_COST_ESTIMATES[type] ?? 0)}</span>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Calculer les recommandations
      </Button>
    </form>
  );
}
