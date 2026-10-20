'use client';
import React from 'react';
import type { Recommendation } from '@/types/api';
import { communeName } from '@/lib/communes';
import { COULEUR_EQUIPEMENT, LIBELLE_EQUIPEMENT } from '@/lib/explorer';
import { cn, formatNumber } from '@/lib/utils';

interface Props {
  recos: Recommendation[];
  total: number;
  onSurvol: (rang: number | null) => void;
  onChoix: (r: Recommendation) => void;
  choisie: number | null;
}

export function RecoList({ recos, total, onSurvol, onChoix, choisie }: Props) {
  return (
    <div className="glass rise flex max-h-full flex-col rounded-3xl" style={{ animationDelay: '0.35s' }}>
      <div className="border-b border-ink/[0.04] px-5 pb-3 pt-4">
        <div className="label-mono">Où investir, dans l’ordre</div>
        <div className="mt-1 font-display text-lg font-semibold">
          {total} emplacement{total > 1 ? 's' : ''}
        </div>
      </div>
      <ol className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {recos.map((r) => (
          <li key={`${r.location_id}-${r.rank}`} className="rise" style={{ animationDuration: '0.5s' }}>
            <button
              onMouseEnter={() => onSurvol(r.rank)}
              onMouseLeave={() => onSurvol(null)}
              onClick={() => onChoix(r)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-ink/[0.04]',
                choisie === r.rank && 'bg-ink/[0.05]',
              )}
            >
              <span className="w-7 shrink-0 font-mono text-xs text-ink-dim group-hover:text-teal-ink">{String(r.rank).padStart(2, '0')}</span>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COULEUR_EQUIPEMENT[r.equipment_type], boxShadow: `0 0 10px ${COULEUR_EQUIPEMENT[r.equipment_type]}` }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{communeName(r.commune_code)}</span>
                <span className="block text-[11px] text-ink-dim">{LIBELLE_EQUIPEMENT[r.equipment_type]}</span>
              </span>
              <span className="text-right">
                <span className="block font-display text-sm font-semibold text-teal-ink">+{formatNumber(r.population_gained)}</span>
                <span className="block text-[11px] text-ink-dim">{Math.round(r.cost / 1000)} k€</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
