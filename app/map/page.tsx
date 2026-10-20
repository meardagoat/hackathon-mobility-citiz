'use client';
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { chargerCarreaux, chargerStations, COULEUR_STATION, type CarreauxGeoJSON } from '@/lib/explorer';
import { STATION_LABELS } from '@/lib/constants';
import { cn, formatNumber } from '@/lib/utils';
import type { StationFeature, StationType, StationsResponse } from '@/types/api';
import { Erreur } from '@/components/page/PageHeader';

const OffreMap = dynamic(() => import('@/components/offre/OffreMap'), { ssr: false });

const ORDRE: StationType[] = ['citiz', 'tram', 'bike', 'bus', 'ferry'];

export default function OffrePage() {
  const [stations, setStations] = useState<StationsResponse | null>(null);
  const [carreaux, setCarreaux] = useState<CarreauxGeoJSON | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [types, setTypes] = useState<StationType[]>(['citiz', 'tram', 'bike', 'bus', 'ferry']);
  const [choisie, setChoisie] = useState<StationFeature | null>(null);

  useEffect(() => {
    chargerStations().then(setStations).catch((e: Error) => setErreur(e.message));
    chargerCarreaux().then((d) => setCarreaux(d.geojson)).catch((e: Error) => setErreur(e.message));
  }, []);

  const comptes = useMemo(() => {
    const c: Partial<Record<StationType, number>> = {};
    stations?.features.forEach((f) => { c[f.properties.type] = (c[f.properties.type] ?? 0) + 1; });
    return c;
  }, [stations]);

  const top = useMemo(
    () =>
      (stations?.features ?? [])
        .filter((f) => types.includes(f.properties.type) && f.properties.population_served !== null)
        .sort((a, b) => (b.properties.population_served ?? 0) - (a.properties.population_served ?? 0))
        .slice(0, 10),
    [stations, types],
  );

  const basculer = (t: StationType) => {
    setChoisie(null);
    setTypes((tv) => (tv.includes(t) ? tv.filter((x) => x !== t) : [...tv, t]));
  };

  return (
    <div className="grid gap-6 lg:h-[calc(100vh-9rem)] lg:grid-cols-[380px_1fr]">
      <aside className="rise flex min-h-0 flex-col">
        <div className="label-mono mb-4 flex items-center gap-3 !text-teal-ink">
          <span className="h-[2px] w-8 rounded bg-teal" />
          Offre existante
        </div>
        <h1 className="text-[clamp(1.9rem,3vw,2.6rem)] font-extrabold leading-[1.05] tracking-[-0.02em]">Ce qui existe déjà</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-dim">
          {stations ? formatNumber(stations.features.length) : '…'} arrêts et stations. Plus le cercle est grand, plus il y a d’habitants à 5 minutes à pied. En rouge sur la carte : les zones sans aucune mobilité.
        </p>
        {erreur && <div className="mt-4"><Erreur message={`Données indisponibles : ${erreur}`} /></div>}

        <div className="mt-6 flex flex-wrap gap-2">
          {ORDRE.filter((t) => comptes[t]).map((t) => {
            const actif = types.includes(t);
            const couleur = COULEUR_STATION[t] ?? '#9aa5a5';
            return (
              <button
                key={t}
                onClick={() => basculer(t)}
                className={cn('flex items-center gap-2 rounded-full border py-1.5 pl-2.5 pr-3.5 text-sm font-semibold transition', actif ? 'border-transparent text-white shadow-soft' : 'border-ink/10 bg-paper text-ink-soft hover:text-ink')}
                style={actif ? { background: couleur } : undefined}
              >
                <span className={cn('h-2 w-2 rounded-full', actif ? 'bg-white' : '')} style={!actif ? { background: couleur } : undefined} />
                {STATION_LABELS[t]}
                <span className={cn('tabular-nums', actif ? 'text-white/80' : 'text-ink-soft')}>{formatNumber(comptes[t] ?? 0)}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex min-h-0 flex-1 flex-col rounded-[28px] border border-ink/[0.07] bg-paper shadow-soft">
          <div className="border-b border-ink/[0.06] px-5 pb-3 pt-4">
            <div className="label-mono">Les plus utiles</div>
            <div className="mt-0.5 font-bold">Top 10 par habitants à 5 min</div>
          </div>
          <ol className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2">
            {top.map((f, i) => (
              <li key={f.properties.station_id}>
                <button
                  onClick={() => setChoisie(f)}
                  className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-ink/[0.04]', choisie?.properties.station_id === f.properties.station_id && 'bg-teal-tint/60')}
                >
                  <span className="w-6 font-mono text-xs text-ink-soft">{String(i + 1).padStart(2, '0')}</span>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COULEUR_STATION[f.properties.type] ?? '#9aa5a5' }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{f.properties.name}</span>
                    <span className="block text-xs text-ink-soft">{STATION_LABELS[f.properties.type]}</span>
                  </span>
                  <span className="text-sm font-bold tabular-nums text-teal-ink">{formatNumber(f.properties.population_served)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      <div className="rise relative min-h-[520px] overflow-hidden rounded-[28px] border border-ink/[0.07] shadow-soft" style={{ animationDelay: '0.1s' }}>
        <OffreMap stations={stations} carreaux={carreaux} types={types} choisie={choisie} onChoix={setChoisie} />
        {choisie && (
          <div className="glass absolute left-4 top-4 z-10 w-72 rounded-3xl p-5">
            <button onClick={() => setChoisie(null)} aria-label="Fermer" className="absolute right-3 top-3 rounded-full p-1.5 text-ink-soft transition hover:bg-ink/[0.05] hover:text-ink">
              <X size={15} />
            </button>
            <div className="label-mono mb-1" style={{ color: COULEUR_STATION[choisie.properties.type] }}>{STATION_LABELS[choisie.properties.type]}</div>
            <div className="pr-6 text-lg font-bold leading-tight">{choisie.properties.name}</div>
            <div className="mt-1 text-sm text-ink-dim">{choisie.properties.operator}</div>
            <div className="mt-4 border-t border-ink/[0.07] pt-3">
              <div className="text-3xl font-extrabold tracking-tight text-teal-ink">{formatNumber(choisie.properties.population_served)}</div>
              <div className="text-xs text-ink-dim">habitants à 5 min à pied (carreaux non masqués)</div>
            </div>
          </div>
        )}
        <div className="glass absolute bottom-4 left-4 z-10 flex items-center gap-4 rounded-full px-4 py-2 text-xs text-ink-dim">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-teal/40" />Habitants (carreau 200 m)</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-coral/50" />Aucune mobilité à 5 min</span>
        </div>
      </div>
    </div>
  );
}
