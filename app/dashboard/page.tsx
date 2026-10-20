'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { chargerCarreaux, COULEUR_STATION, type Carreau } from '@/lib/explorer';
import { communeName } from '@/lib/communes';
import { STATION_LABELS } from '@/lib/constants';
import { cn, formatNumber } from '@/lib/utils';
import type { StationType, SummaryResponse } from '@/types/api';
import { AnimatedNumber } from '@/components/explorer/AnimatedNumber';
import { Chargement, Erreur, PageHeader, Panneau } from '@/components/page/PageHeader';

interface Commune {
  code: string;
  nom: string;
  pop: number;
  citiz: number;
  aucune: number;
}

type Tri = 'population' | 'sansCitiz' | 'zonesBlanches';

const pct = (n: number) => `${(n * 100).toFixed(1).replace('.', ',')} %`;

function parCommune(carreaux: Carreau[]): Commune[] {
  const m = new Map<string, Commune>();
  for (const c of carreaux) {
    if (c.population === null || !c.commune) continue; // carreaux masqués exclus, comme dans l'API
    const k = m.get(c.commune) ?? { code: c.commune, nom: communeName(c.commune), pop: 0, citiz: 0, aucune: 0 };
    k.pop += c.population;
    if (c.citiz > 0) k.citiz += c.population;
    if (c.options === 0) k.aucune += c.population;
    m.set(c.commune, k);
  }
  return Array.from(m.values());
}

export default function ChiffresPage() {
  const [resume, setResume] = useState<SummaryResponse | null>(null);
  const [carreaux, setCarreaux] = useState<Carreau[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tri, setTri] = useState<Tri>('sansCitiz');

  useEffect(() => {
    api.summary().then(setResume).catch((e: Error) => setErreur(e.message));
    chargerCarreaux().then((d) => setCarreaux(d.carreaux)).catch((e: Error) => setErreur(e.message));
  }, []);

  const communes = useMemo(() => (carreaux ? parCommune(carreaux) : []), [carreaux]);
  const triees = useMemo(() => {
    const cle: Record<Tri, (c: Commune) => number> = {
      population: (c) => c.pop,
      sansCitiz: (c) => c.pop - c.citiz,
      zonesBlanches: (c) => c.aucune,
    };
    return [...communes].sort((a, b) => cle[tri](b) - cle[tri](a));
  }, [communes, tri]);
  const maxPop = Math.max(1, ...communes.map((c) => c.pop));
  const sansCitizTotal = communes.reduce((s, c) => s + c.pop - c.citiz, 0);
  const top3 = [...communes].sort((a, b) => b.pop - b.citiz - (a.pop - a.citiz)).slice(0, 3);

  const types: StationType[] = resume
    ? (Object.keys(resume.stations_by_type) as StationType[]).filter((t) => resume.stations_by_type[t] > 0).sort((a, b) => resume.stations_by_type[b] - resume.stations_by_type[a])
    : [];

  return (
    <div>
      <PageHeader
        etiquette="Diagnostic · Bordeaux Métropole"
        titre={<>Qui a une mobilité à <span className="text-teal">5 minutes</span> de chez soi&nbsp;?</>}
        sousTitre="Population INSEE au carreau de 200 m croisée avec tous les arrêts et stations à 400 m à pied. La quasi-totalité des habitants a un bus ou un tram à proximité ; l’autopartage, beaucoup moins."
        meta={resume?.meta}
      />
      {erreur && <Erreur message={`Données indisponibles : ${erreur}`} />}

      {/* Chiffres clés */}
      <div className="rise mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-[28px] border border-ink/[0.07] bg-ink/[0.07] shadow-soft lg:grid-cols-4" style={{ animationDelay: '0.05s' }}>
        <Cle label="Habitants" valeur={resume ? <AnimatedNumber value={resume.population_total} format={(n) => formatNumber(Math.round(n))} /> : '…'} detail={resume ? `${formatNumber(resume.zones_count)} carreaux, dont ${formatNumber(resume.masked_zones_count)} masqués (non comptés)` : ''} />
        <Cle label="Arrêts et stations" valeur={resume ? <AnimatedNumber value={resume.stations_count} format={(n) => formatNumber(Math.round(n))} /> : '…'} detail="réseau TBM et stations fixes vélo et Citiz" />
        <Cle label="Une mobilité à 5 min" valeur={resume?.population_with_any_option_share != null ? <AnimatedNumber value={resume.population_with_any_option_share * 100} format={(n) => pct(n / 100)} /> : '…'} detail={resume?.population_with_any_option != null ? `${formatNumber(resume.population_with_any_option)} habitants` : ''} />
        <Cle accent label="Citiz à 5 min" valeur={resume?.citiz.population_within_5min_share != null ? <AnimatedNumber value={resume.citiz.population_within_5min_share * 100} format={(n) => pct(n / 100)} /> : '…'} detail={resume ? `${resume.citiz.stations_count} stations · ${String(resume.citiz.stations_per_100k_inhabitants ?? '').replace('.', ',')} pour 100 000 hab.` : ''} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Communes */}
        <Panneau
          delai={0.1}
          titre="Commune par commune"
          sousTitre="Part des habitants qui ont une station Citiz à 5 min, seulement d’autres transports, ou rien du tout."
        >
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {([['sansCitiz', 'Habitants sans Citiz'], ['zonesBlanches', 'Zones blanches'], ['population', 'Population']] as [Tri, string][]).map(([t, label]) => (
              <button key={t} onClick={() => setTri(t)} className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition', tri === t ? 'bg-teal text-white' : 'bg-ink/[0.04] text-ink-dim hover:text-ink')}>
                {label}
              </button>
            ))}
            <div className="ml-auto flex flex-wrap items-center gap-4 text-xs text-ink-dim">
              <Legende couleur="#32b4b5">Citiz à 5 min</Legende>
              <Legende couleur="#cfe3e3">Autres transports seulement</Legende>
              <Legende couleur="#ee6352">Aucune mobilité</Legende>
            </div>
          </div>
          {!carreaux ? (
            <Chargement />
          ) : (
            <ol className="divide-y divide-ink/[0.06]">
              {triees.map((c, i) => {
                const largeur = (c.pop / maxPop) * 100;
                const autre = c.pop - c.citiz - c.aucune;
                return (
                  <li key={c.code} className="grid grid-cols-[28px_minmax(120px,190px)_1fr_86px] items-center gap-3 py-2.5">
                    <span className="font-mono text-xs text-ink-soft">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{c.nom}</span>
                      <span className="block text-xs text-ink-soft">{formatNumber(c.pop)} hab.</span>
                    </span>
                    <span className="flex h-3 overflow-hidden rounded-full bg-ink/[0.04]" style={{ width: `${Math.max(largeur, 4)}%` }} title={`${pct(c.citiz / c.pop)} avec Citiz, ${pct(autre / c.pop)} autres transports, ${pct(c.aucune / c.pop)} sans mobilité`}>
                      <span className="h-full bg-teal" style={{ width: `${(c.citiz / c.pop) * 100}%` }} />
                      <span className="h-full bg-[#cfe3e3]" style={{ width: `${(autre / c.pop) * 100}%` }} />
                      <span className="h-full bg-coral" style={{ width: `${(c.aucune / c.pop) * 100}%` }} />
                    </span>
                    <span className="text-right">
                      <span className={cn('block text-sm font-bold', c.citiz / c.pop < 0.1 ? 'text-coral' : 'text-teal-ink')}>{pct(c.citiz / c.pop)}</span>
                      <span className="block text-[11px] text-ink-soft">avec Citiz</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </Panneau>

        <div className="space-y-6">
          {/* Ce qu'il faut retenir */}
          <Panneau delai={0.15} className="bg-teal-tint/50">
            <div className="label-mono mb-3 !text-teal-ink">À retenir</div>
            {carreaux ? (
              <>
                <p className="text-2xl font-extrabold leading-tight tracking-tight">
                  {formatNumber(sansCitizTotal)} habitants n’ont pas de Citiz à 5 minutes à pied.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-dim">
                  Les plus gros manques : {top3.map((c, i) => (
                    <React.Fragment key={c.code}>
                      <b className="text-ink">{c.nom}</b> ({formatNumber(c.pop - c.citiz)}){i < top3.length - 1 ? ', ' : '.'}
                    </React.Fragment>
                  ))}
                </p>
              </>
            ) : (
              <Chargement texte="Calcul…" />
            )}
          </Panneau>

          {/* Offre existante */}
          <Panneau delai={0.2} titre="L’offre existante" sousTitre="Arrêts et stations par type (un arrêt desservi par deux modes compte deux fois).">
            {resume ? (
              <>
                <div className="mb-4 flex h-3 overflow-hidden rounded-full">
                  {types.map((t) => (
                    <span key={t} style={{ width: `${(resume.stations_by_type[t] / resume.stations_count) * 100}%`, background: COULEUR_STATION[t] ?? '#9aa5a5' }} />
                  ))}
                </div>
                <ul className="space-y-2">
                  {types.map((t) => (
                    <li key={t} className="flex items-center gap-3 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: COULEUR_STATION[t] ?? '#9aa5a5' }} />
                      <span className="flex-1">{STATION_LABELS[t]}</span>
                      <span className="font-bold tabular-nums">{formatNumber(resume.stations_by_type[t])}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <Chargement />
            )}
          </Panneau>

          {/* Méthode */}
          <Panneau delai={0.25} titre="Méthode et limites">
            <ul className="space-y-2.5 text-sm leading-relaxed text-ink-dim">
              <li><b className="text-ink">5 min à pied = 400 m</b> à vol d’oiseau depuis le centre du carreau.</li>
              <li><b className="text-ink">Population INSEE 2021</b> (Filosofi, carreaux de 200 m). Les carreaux de moins de 11 ménages sont masqués et exclus des pourcentages.</li>
              <li><b className="text-ink">Offre :</b> réseau TBM (hors lignes scolaires), Le Vélo TBM et Citiz. Trottinettes et vélos en free-floating exclus.</li>
            </ul>
          </Panneau>
        </div>
      </div>
    </div>
  );
}

function Cle({ label, valeur, detail, accent }: { label: string; valeur: React.ReactNode; detail: string; accent?: boolean }) {
  return (
    <div className={cn('bg-paper p-6', accent && 'bg-teal-tint/50')}>
      <div className="label-mono mb-2">{label}</div>
      <div className={cn('text-4xl font-extrabold tracking-tight tabular-nums', accent && 'text-teal-ink')}>{valeur}</div>
      <div className="mt-1.5 text-xs leading-relaxed text-ink-dim">{detail}</div>
    </div>
  );
}

function Legende({ couleur, children }: { couleur: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: couleur }} />
      {children}
    </span>
  );
}
