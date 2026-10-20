'use client';
import React from 'react';
import { cn } from '@/lib/utils';
import type { StationType } from '@/types/api';
import { COULEUR_STATION } from '@/lib/explorer';
import type { Mode } from './CityMap';

const TYPES: { type: StationType; label: string }[] = [
  { type: 'citiz', label: 'Citiz' },
  { type: 'tram', label: 'Tram' },
  { type: 'bike', label: 'Vélo' },
  { type: 'bus', label: 'Bus' },
  { type: 'ferry', label: 'Bateau' },
];

interface Props {
  mode: Mode;
  onMode: (m: Mode) => void;
  types: StationType[];
  onTypes: (t: StationType[]) => void;
}

export function LayerPanel({ mode, onMode, types, onTypes }: Props) {
  const basculer = (t: StationType) => onTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t]);
  return (
    <div className="glass rise w-64 rounded-3xl p-4" style={{ animationDelay: '0.15s' }}>
      <div className="label-mono mb-2">Lecture de la carte</div>
      <div className="mb-4 flex rounded-2xl bg-ink/[0.04] p-1">
        {([['acces', 'Toute mobilité'], ['citiz', 'Citiz']] as [Mode, string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => onMode(m)}
            className={cn('flex-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-all', mode === m ? 'bg-teal text-white shadow-soft' : 'text-ink-dim hover:text-ink')}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="space-y-2 text-xs text-ink-dim">
        {mode === 'acces' ? (
          <>
            <Pastille couleur="linear-gradient(90deg,#d5eeee,#32b4b5,#11686c)">Desservi : plus c’est foncé, plus il y a d’options à 5 min</Pastille>
            <Pastille couleur="#ee6352">Zone blanche : aucune option à 5 min</Pastille>
          </>
        ) : (
          <>
            <Pastille couleur="#32b4b5">Une station Citiz à 5 min</Pastille>
            <Pastille couleur="#dde4e4">Pas de Citiz, mais d’autres transports</Pastille>
            <Pastille couleur="#ee6352">Aucune mobilité à 5 min</Pastille>
          </>
        )}
        <Pastille couleur="#2fac66">Nouvellement desservi par le scénario</Pastille>
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft [@media(max-height:820px)]:hidden">Hauteur des carreaux de 200 m : nombre d’habitants (INSEE 2021). 5 min à pied = 400 m.</p>

      <div className="label-mono mb-2 mt-4 [@media(max-height:820px)]:mt-3">Offre existante</div>
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map(({ type, label }) => {
          const actif = types.includes(type);
          const couleur = COULEUR_STATION[type] ?? '#5d6767';
          return (
            <button
              key={type}
              onClick={() => basculer(type)}
              className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all', actif ? 'border-ink/20 text-ink' : 'border-ink/[0.04] text-ink-soft')}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: actif ? couleur : 'transparent', boxShadow: actif ? `0 0 8px ${couleur}` : undefined, border: `1px solid ${couleur}` }} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Pastille({ couleur, children, lueur }: { couleur: string; children: React.ReactNode; lueur?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 h-3 w-5 shrink-0 rounded-[4px]" style={{ background: couleur, boxShadow: lueur ? '0 0 0 3px rgba(47,172,102,0.2)' : undefined }} />
      <span>{children}</span>
    </li>
  );
}
