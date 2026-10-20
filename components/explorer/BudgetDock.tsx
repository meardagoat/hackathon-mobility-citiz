'use client';
import React from 'react';
import { cn } from '@/lib/utils';
import type { Perimeter } from '@/types/api';
import { AnimatedNumber } from './AnimatedNumber';

export const BUDGETS = [100_000, 250_000, 500_000, 1_000_000] as const;

const fmtEntier = (n: number) => Math.round(n).toLocaleString('fr-FR');
const fmtEuros = (n: number) => `${Math.round(n / 1000).toLocaleString('fr-FR')} k€`;
const fmtPct = (n: number) => `${n.toFixed(1).replace('.', ',')} %`;
const libelleBudget = (b: number) => (b >= 1_000_000 ? '1 M€' : `${b / 1000} k€`);

interface Props {
  budget: number;
  onBudget: (b: number) => void;
  perimetre: Perimeter;
  onPerimetre: (p: Perimeter) => void;
  chargement: boolean;
  equipements: number;
  habitants: number;
  depense: number;
  voitures: number;
  citizAvant: number | null;
  citizApres: number | null;
}

export function BudgetDock(p: Props) {
  const index = BUDGETS.indexOf(p.budget as (typeof BUDGETS)[number]);
  return (
    <div className="glass rise w-[min(860px,calc(100vw-2rem))] rounded-3xl p-5 shadow-[0_30px_80px_rgba(0,0,0,0.55)]" style={{ animationDelay: '0.25s' }}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        {/* Budget */}
        <div className="flex-1">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="label-mono">Budget sur 3 ans</span>
            <span className="font-display text-2xl font-semibold text-volt text-glow">{libelleBudget(p.budget)}</span>
          </div>
          <div className="relative h-10">
            <div className="absolute inset-x-2 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/10" />
            <div
              className="absolute left-2 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-volt shadow-[0_0_14px_#d4ff3a] transition-all duration-500"
              style={{ width: `calc(${(index / (BUDGETS.length - 1)) * 100}% - ${(index / (BUDGETS.length - 1)) * 16}px)` }}
            />
            <input
              type="range"
              min={0}
              max={BUDGETS.length - 1}
              step={1}
              value={index}
              onChange={(e) => p.onBudget(BUDGETS[Number(e.target.value)])}
              aria-label="Budget"
              className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
            />
            <div className="pointer-events-none absolute inset-x-2 top-1/2 flex -translate-y-1/2 justify-between">
              {BUDGETS.map((b, i) => (
                <span
                  key={b}
                  className={cn(
                    'h-4 w-4 rounded-full border-2 transition-all duration-300',
                    i <= index ? 'border-volt bg-volt shadow-[0_0_12px_#d4ff3a]' : 'border-white/25 bg-night',
                    i === index && 'scale-125',
                  )}
                />
              ))}
            </div>
          </div>
          <div className="mt-1 flex justify-between px-0.5">
            {BUDGETS.map((b) => (
              <button key={b} onClick={() => p.onBudget(b)} className={cn('label-mono transition-colors hover:text-ink', b === p.budget && '!text-volt')}>
                {libelleBudget(b)}
              </button>
            ))}
          </div>
        </div>

        {/* Périmètre */}
        <div className="flex shrink-0 flex-col gap-2">
          <span className="label-mono">Équipements</span>
          <div className="flex rounded-2xl bg-white/5 p-1">
            {(['citiz', 'tous'] as Perimeter[]).map((per) => (
              <button
                key={per}
                onClick={() => p.onPerimetre(per)}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-medium transition-all',
                  p.perimetre === per ? 'bg-white text-night' : 'text-ink-dim hover:text-ink',
                )}
              >
                {per === 'citiz' ? 'Citiz seul' : 'Citiz + bus + vélo'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Compteurs */}
      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/5 sm:grid-cols-4">
        <Compteur label="Équipements" valeur={<AnimatedNumber value={p.equipements} format={fmtEntier} duration={400} />} />
        <Compteur label="Habitants gagnés" accent valeur={<AnimatedNumber value={p.habitants} format={(n) => `+${fmtEntier(n)}`} />} />
        <Compteur label="Investi" valeur={<AnimatedNumber value={p.depense} format={fmtEuros} />} />
        <Compteur label="Voitures en moins" valeur={<AnimatedNumber value={p.voitures} format={fmtEntier} />} />
      </div>

      {/* Avant / après */}
      {p.citizAvant !== null && p.citizApres !== null && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="label-mono">Habitants à 5 min d’une station Citiz</span>
            <span className="font-mono text-xs text-ink-dim">
              {fmtPct(p.citizAvant * 100)} <span className="mx-1 text-ink-dim/60">→</span>
              <span className="text-volt">
                <AnimatedNumber value={p.citizApres * 100} format={fmtPct} />
              </span>
            </span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-white/5">
            <div className="absolute inset-y-0 left-0 rounded-full bg-citiz" style={{ width: `${p.citizAvant * 100}%` }} />
            <div
              className="absolute inset-y-0 rounded-full bg-volt shadow-[0_0_12px_#d4ff3a] transition-all duration-700"
              style={{ left: `${p.citizAvant * 100}%`, width: `${Math.max(0, p.citizApres - p.citizAvant) * 100}%` }}
            />
          </div>
        </div>
      )}
      {p.chargement && <div className="mt-3 h-px w-full animate-pulse bg-volt/60" />}
    </div>
  );
}

function Compteur({ label, valeur, accent }: { label: string; valeur: React.ReactNode; accent?: boolean }) {
  return (
    <div className="bg-night/60 px-4 py-3">
      <div className="label-mono mb-1">{label}</div>
      <div className={cn('font-display text-2xl font-semibold', accent ? 'text-volt text-glow' : 'text-ink')}>{valeur}</div>
    </div>
  );
}
