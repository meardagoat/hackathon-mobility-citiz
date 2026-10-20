'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { chargerScenario, COULEUR_EQUIPEMENT, LIBELLE_EQUIPEMENT } from '@/lib/explorer';
import { communeName } from '@/lib/communes';
import { cn, formatNumber } from '@/lib/utils';
import type { Perimeter, RecommendationResponse } from '@/types/api';
import { AnimatedNumber } from '@/components/explorer/AnimatedNumber';
import { Chargement, Erreur, PageHeader, Panneau } from '@/components/page/PageHeader';

const BUDGETS = [100_000, 250_000, 500_000, 1_000_000];
const PERIMETRES: { cle: Perimeter; label: string }[] = [
  { cle: 'citiz', label: 'Citiz seul' },
  { cle: 'tous', label: 'Citiz + bus + vélo' },
];
const libelleBudget = (b: number) => (b >= 1_000_000 ? '1 M€' : `${b / 1000} k€`);
const keuros = (n: number) => `${Math.round(n / 1000).toLocaleString('fr-FR')} k€`;

// L'API ne donne pas de total quand plusieurs types sont mélangés (un habitant peut gagner un bus ET une Citiz) :
// on additionne alors les gains par type, présentés comme des gains cumulés.
function gain(s: RecommendationResponse | undefined): number {
  if (!s) return 0;
  if (s.total_population_gained !== null) return s.total_population_gained;
  return Object.values(s.population_gained_by_type ?? {}).reduce((a, b) => a + (b ?? 0), 0);
}

export default function ClassementPage() {
  const [scenarios, setScenarios] = useState<Record<string, RecommendationResponse>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [budget, setBudget] = useState(1_000_000);
  const [perimetre, setPerimetre] = useState<Perimeter>('citiz');

  // Les 8 scénarios précalculés, pour comparer les budgets entre eux
  useEffect(() => {
    PERIMETRES.forEach(({ cle }) =>
      BUDGETS.forEach((b) =>
        chargerScenario(b, cle)
          .then((r) => setScenarios((s) => ({ ...s, [`${b}|${cle}`]: r })))
          .catch((e: Error) => setErreur(e.message)),
      ),
    );
  }, []);

  const courant = scenarios[`${budget}|${perimetre}`];
  const maxGain = Math.max(1, ...Object.values(scenarios).map(gain));
  const maxLigne = useMemo(() => Math.max(1, ...(courant?.recommendations ?? []).map((r) => r.population_gained)), [courant]);
  const voitures = courant?.recommendations.reduce((s, r) => s + (r.cars_avoided ?? 0), 0) ?? 0;
  const parKEuro = courant && courant.total_cost > 0 ? gain(courant) / (courant.total_cost / 1000) : null;
  const cumule = courant ? courant.total_population_gained === null : false;
  const parType = courant?.population_gained_by_type ?? {};

  return (
    <div>
      <PageHeader
        etiquette="Classement sous budget"
        titre={<>Où investir <span className="text-teal">en premier</span>&nbsp;?</>}
        sousTitre="Chaque emplacement est classé par habitants nouvellement desservis par euro investi, sans compter deux fois les mêmes habitants. Les classements sont précalculés pour quatre budgets (coût sur 3 ans)."
        meta={courant?.meta}
      />
      {erreur && <div className="mb-6"><Erreur message={`Scénarios indisponibles : ${erreur}`} /></div>}

      {/* Comparatif des scénarios */}
      <Panneau delai={0.05} titre="Ce que rapporte chaque budget" sousTitre="Habitants nouvellement à 5 min d’un équipement, selon le budget et le périmètre (pour « Citiz + bus + vélo », gains additionnés par type). Cliquez sur une barre pour afficher le classement correspondant." className="mb-6">
        <div className="mb-4 flex flex-wrap gap-4 text-xs text-ink-dim">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-leaf" />Citiz seul</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal" />Citiz + bus + vélo</span>
        </div>
        <div className="grid grid-cols-4 gap-4 sm:gap-8">
          {BUDGETS.map((b) => (
            <div key={b} className="flex flex-col">
              <div className="flex h-44 items-end justify-center gap-2 border-b border-ink/10">
                {PERIMETRES.map(({ cle }) => {
                  const s = scenarios[`${b}|${cle}`];
                  const g = gain(s);
                  const actif = b === budget && cle === perimetre;
                  return (
                    <button
                      key={cle}
                      onClick={() => {
                        setBudget(b);
                        setPerimetre(cle);
                      }}
                      title={`${libelleBudget(b)} · ${cle === 'citiz' ? 'Citiz seul' : 'Citiz + bus + vélo (gains cumulés par type)'} : +${formatNumber(g)} habitants`}
                      className={cn('group relative w-full max-w-[56px] rounded-t-xl transition-all duration-700', cle === 'citiz' ? 'bg-leaf' : 'bg-teal', actif ? 'opacity-100 ring-4 ring-ink/10' : 'opacity-60 hover:opacity-90')}
                      style={{ height: s ? `${Math.max(4, (g / maxGain) * 100)}%` : '4%' }}
                    >
                      <span className={cn('absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold tabular-nums', actif ? 'text-ink' : 'text-ink-soft')}>
                        {s ? `+${Math.round(g / 1000)} k` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className={cn('mt-2 text-center text-sm font-bold', b === budget ? 'text-ink' : 'text-ink-soft')}>{libelleBudget(b)}</div>
            </div>
          ))}
        </div>
      </Panneau>

      {/* Sélection */}
      <div className="rise mb-6 flex flex-wrap items-center gap-3" style={{ animationDelay: '0.1s' }}>
        <div className="flex rounded-full bg-ink/[0.04] p-1">
          {BUDGETS.map((b) => (
            <button key={b} onClick={() => setBudget(b)} className={cn('rounded-full px-4 py-2 text-sm font-semibold transition', b === budget ? 'bg-teal text-ink shadow-soft' : 'text-ink-dim hover:text-ink')}>
              {libelleBudget(b)}
            </button>
          ))}
        </div>
        <div className="flex rounded-full bg-ink/[0.04] p-1">
          {PERIMETRES.map(({ cle, label }) => (
            <button key={cle} onClick={() => setPerimetre(cle)} className={cn('rounded-full px-4 py-2 text-sm font-semibold transition', cle === perimetre ? 'bg-teal text-ink shadow-soft' : 'text-ink-dim hover:text-ink')}>
              {label}
            </button>
          ))}
        </div>
        <Link href={`/?budget=${budget}&perimetre=${perimetre}`} className="ml-auto flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-teal-ink transition hover:bg-teal-tint/60">
          Voir sur la carte <ArrowUpRight size={15} />
        </Link>
      </div>

      {/* Résumé du scénario */}
      <div className="rise mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-[28px] border border-ink/[0.07] bg-ink/[0.07] shadow-soft lg:grid-cols-5" style={{ animationDelay: '0.12s' }}>
        <Cle label="Équipements" valeur={courant ? <AnimatedNumber value={courant.recommendations.length} format={(n) => String(Math.round(n))} /> : '…'} />
        <Cle
          accent
          label={cumule ? 'Gains cumulés' : 'Habitants gagnés'}
          valeur={courant ? <AnimatedNumber value={gain(courant)} format={(n) => `+${formatNumber(Math.round(n))}`} /> : '…'}
          detail={cumule ? `Citiz +${formatNumber(parType.citiz_station ?? 0)} · bus +${formatNumber(parType.bus_stop ?? 0)}${parType.bike_station ? ` · vélo +${formatNumber(parType.bike_station)}` : ''}` : undefined}
        />
        <Cle label="Investi sur 3 ans" valeur={courant ? <AnimatedNumber value={courant.total_cost} format={keuros} /> : '…'} detail={courant ? `reste ${keuros(courant.remaining_budget)}` : ''} />
        <Cle label={cumule ? 'Gains par k€' : 'Habitants par k€'} valeur={parKEuro !== null ? <AnimatedNumber value={parKEuro} format={(n) => n.toFixed(0)} /> : '…'} />
        <Cle label="Voitures en moins" valeur={courant ? <AnimatedNumber value={voitures} format={(n) => String(Math.round(n))} /> : '…'} detail="8 par station Citiz" />
      </div>

      {/* Classement détaillé */}
      <Panneau delai={0.15} titre="Le classement" sousTitre="Dans l’ordre où investir. L’adéquation est la ressemblance du lieu avec les emplacements des stations existantes (modèle prédictif) : elle pondère la valeur, la population reste le critère principal.">
        {!courant ? (
          <Chargement texte="Chargement du scénario…" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="label-mono text-left">
                  <th className="pb-3 pr-3 font-normal">Rang</th>
                  <th className="pb-3 pr-3 font-normal">Commune</th>
                  <th className="pb-3 pr-3 font-normal">Équipement</th>
                  <th className="w-[30%] pb-3 pr-3 font-normal">Habitants gagnés</th>
                  <th className="pb-3 pr-3 text-right font-normal">Coût</th>
                  <th className="pb-3 pr-3 text-right font-normal">Cumul</th>
                  <th className="pb-3 text-right font-normal">Adéquation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.06]">
                {courant.recommendations.map((r) => (
                  <tr key={`${r.location_id}-${r.rank}`} className="transition-colors hover:bg-teal-tint/30">
                    <td className="py-2.5 pr-3 font-mono text-xs text-ink-soft">{String(r.rank).padStart(2, '0')}</td>
                    <td className="py-2.5 pr-3 font-semibold">{communeName(r.commune_code)}</td>
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: `${COULEUR_EQUIPEMENT[r.equipment_type]}1f`, color: r.equipment_type === 'bike_station' ? '#b26b00' : COULEUR_EQUIPEMENT[r.equipment_type] }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: COULEUR_EQUIPEMENT[r.equipment_type] }} />
                        {LIBELLE_EQUIPEMENT[r.equipment_type]}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-3">
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.05]">
                          <span className="block h-full rounded-full" style={{ width: `${(r.population_gained / maxLigne) * 100}%`, background: COULEUR_EQUIPEMENT[r.equipment_type] }} />
                        </span>
                        <span className="w-14 text-right font-bold tabular-nums text-leaf">+{formatNumber(r.population_gained)}</span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{keuros(r.cost)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-ink-dim">{keuros(r.cumulative_cost)}</td>
                    <td className="py-2.5 text-right tabular-nums text-ink-dim">{r.adequation === null ? '—' : r.adequation < 0.0005 ? '< 0,1 %' : `${(r.adequation * 100).toFixed(r.adequation < 0.1 ? 1 : 0).replace('.', ',')} %`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panneau>
    </div>
  );
}

function Cle({ label, valeur, detail, accent }: { label: string; valeur: React.ReactNode; detail?: string; accent?: boolean }) {
  return (
    <div className={cn('bg-paper p-6', accent && 'bg-leaf/[0.07]')}>
      <div className="label-mono mb-2">{label}</div>
      <div className={cn('text-3xl font-extrabold tracking-tight tabular-nums', accent && 'text-leaf')}>{valeur}</div>
      {detail && <div className="mt-1 text-xs text-ink-dim">{detail}</div>}
    </div>
  );
}
