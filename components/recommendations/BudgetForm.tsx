'use client';
import React, { useState } from 'react';
import { Button, Select } from '@/components/ui';
import { BUDGET_SCENARIOS, DEFAULT_AREA, MAX_RECOMMENDATIONS, PERIMETERS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import type { Perimeter, RecommendationRequest } from '@/types/api';

interface BudgetFormProps {
  onSubmit: (request: RecommendationRequest) => void;
  loading?: boolean;
}

export function BudgetForm({ onSubmit, loading = false }: BudgetFormProps) {
  const [budget, setBudget] = useState<number>(BUDGET_SCENARIOS[0]);
  const [perimeter, setPerimeter] = useState<Perimeter>('tous');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      budget,
      equipment_types: PERIMETERS[perimeter].equipment_types,
      max_results: MAX_RECOMMENDATIONS,
      area: DEFAULT_AREA,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Select
        label="Budget (coût sur 3 ans)"
        value={String(budget)}
        onChange={(e) => setBudget(Number(e.target.value))}
        options={BUDGET_SCENARIOS.map((b) => ({ value: String(b), label: formatCurrency(b) }))}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-gray-700 mb-1">Équipements</legend>
        {(Object.keys(PERIMETERS) as Perimeter[]).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="perimeter"
              value={key}
              checked={perimeter === key}
              onChange={() => setPerimeter(key)}
              className="accent-blue-500"
            />
            {PERIMETERS[key].label}
          </label>
        ))}
      </fieldset>

      <p className="text-xs text-gray-500">
        Zone : Bordeaux Métropole. Les classements sont précalculés par l’équipe data pour ces budgets et ces périmètres.
      </p>

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Afficher les recommandations
      </Button>
    </form>
  );
}
