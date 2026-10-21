'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { carreauxAllumes, chargerCarreaux, chargerScenario, chargerStations, indexer, type Carreau, type CarreauxGeoJSON } from '@/lib/explorer';
import type { Perimeter, Recommendation, RecommendationResponse, StationType, StationsResponse, SummaryResponse } from '@/types/api';
import { BudgetDock } from '@/components/explorer/BudgetDock';
import { RecoList } from '@/components/explorer/RecoList';
import { LayerPanel } from '@/components/explorer/LayerPanel';
import { Onboarding } from '@/components/explorer/Onboarding';
import type { Mode } from '@/components/explorer/CityMap';

const CityMap = dynamic(() => import('@/components/explorer/CityMap'), { ssr: false });

const PAS_ANIMATION_MS = 110;
const BUDGETS = [100_000, 250_000, 500_000, 1_000_000];

// L'accueil ne se joue qu'une fois par visite : revenir sur Explorer depuis une autre page ne le rejoue pas.
let accueilVu = false;

export default function ExplorerPage() {
  const [intro, setIntro] = useState(!accueilVu);
  const [resume, setResume] = useState<SummaryResponse | null>(null);
  const [carreaux, setCarreaux] = useState<{ liste: Carreau[]; geojson: CarreauxGeoJSON } | null>(null);
  const [stations, setStations] = useState<StationsResponse | null>(null);
  // Erreurs séparées : un scénario en échec ne doit pas masquer des données de base valides, et inversement
  const [erreurBase, setErreurBase] = useState<string | null>(null);
  const [erreurScenario, setErreurScenario] = useState<string | null>(null);
  const [essai, setEssai] = useState(0);

  const [mode, setMode] = useState<Mode>('citiz');
  const [types, setTypes] = useState<StationType[]>(['citiz', 'tram', 'bike']);
  const [budget, setBudget] = useState(1_000_000);
  const [perimetre, setPerimetre] = useState<Perimeter>('citiz');
  const [resultat, setResultat] = useState<RecommendationResponse | null>(null);
  const [chargement, setChargement] = useState(false);
  const [visibles, setVisibles] = useState(0);
  const [survol, setSurvol] = useState<number | null>(null);
  const [focus, setFocus] = useState<Recommendation | null>(null);
  const cache = useRef(new Map<string, RecommendationResponse>());
  const [scenarioIntro, setScenarioIntro] = useState<RecommendationResponse | null>(null);
  const terminerIntro = useCallback(() => {
    accueilVu = true;
    setIntro(false);
  }, []);

  // Scénario arrivé par lien (« Voir sur la carte » depuis le Classement)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const b = Number(q.get('budget'));
    const p = q.get('perimetre');
    if (BUDGETS.includes(b)) setBudget(b);
    if (p === 'citiz' || p === 'tous') {
      setPerimetre(p);
      setMode(p === 'tous' ? 'acces' : 'citiz');
    }
  }, []);

  // Données de base (et scénario de référence 1 M€ Citiz présenté par l'accueil). Relancées par « Réessayer ».
  useEffect(() => {
    setErreurBase(null);
    const echec = (e: Error) => setErreurBase(e.message);
    api.summary().then(setResume).catch(echec);
    chargerCarreaux()
      .then(({ carreaux: liste, geojson }) => setCarreaux({ liste, geojson }))
      .catch(echec);
    chargerStations().then(setStations).catch(echec);
    chargerScenario(1_000_000, 'citiz').then(setScenarioIntro).catch(echec);
  }, [essai]);

  // Recommandations du scénario (précalculées par le notebook 05, servies par l'API)
  useEffect(() => {
    const cle = `${budget}|${perimetre}`;
    let annule = false;
    const appliquer = (r: RecommendationResponse) => {
      if (annule) return;
      setErreurScenario(null);
      setResultat(r);
      setVisibles(0);
      setChargement(false);
    };
    const enCache = cache.current.get(cle);
    if (enCache) {
      appliquer(enCache);
      return;
    }
    // Le plan précédent ne doit pas rester affiché sous un autre budget pendant le chargement ou après un échec
    setErreurScenario(null);
    setResultat(null);
    setVisibles(0);
    setChargement(true);
    chargerScenario(budget, perimetre)
      .then((r) => {
        cache.current.set(cle, r);
        appliquer(r);
      })
      .catch((e: Error) => {
        if (!annule) {
          setErreurScenario(e.message);
          setChargement(false);
        }
      });
    return () => {
      annule = true;
    };
  }, [budget, perimetre, essai]);

  // Les balises s'allument une à une, dans l'ordre du classement
  const recos = useMemo(() => resultat?.recommendations ?? [], [resultat]);
  useEffect(() => {
    if (intro || visibles >= recos.length) return;
    const id = setTimeout(() => setVisibles((v) => v + 1), visibles === 0 ? 500 : PAS_ANIMATION_MS);
    return () => clearTimeout(id);
  }, [intro, visibles, recos.length]);

  useEffect(() => {
    if (intro) return;
    const touche = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        setFocus(null);
        setBudget(BUDGETS[Number(e.key) - 1]);
      }
      if (e.key === 'c') {
        setPerimetre('citiz');
        setMode('citiz');
      }
      if (e.key === 't') {
        setPerimetre('tous');
        setMode('acces');
      }
      if (e.key === 'r') setVisibles(0);
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [intro]);

  const voisins = useMemo(() => (carreaux ? indexer(carreaux.liste) : null), [carreaux]);
  const allumesParReco = useMemo(
    () => (carreaux && voisins ? recos.map((r) => carreauxAllumes(r, carreaux.liste, voisins)) : []),
    [recos, carreaux, voisins],
  );

  const affichees = recos.slice(0, visibles);
  const allumes = useMemo(() => Array.from(new Set(allumesParReco.slice(0, visibles).flat())), [allumesParReco, visibles]);
  const habitants = affichees.reduce((s, r) => s + r.population_gained, 0);
  const depense = affichees.length ? affichees[affichees.length - 1].cumulative_cost : 0;
  const voitures = affichees.reduce((s, r) => s + (r.cars_avoided ?? 0), 0);
  const gainCitiz = affichees.filter((r) => r.equipment_type === 'citiz_station').reduce((s, r) => s + r.population_gained, 0);
  const citizAvant = resume?.citiz.population_within_5min_share ?? null;
  const citizApres =
    resume && resume.citiz.population_within_5min !== null ? (resume.citiz.population_within_5min + gainCitiz) / resume.population_total : null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-paper">
      <CityMap
        carreaux={carreaux?.geojson ?? null}
        stations={stations}
        mode={mode}
        typesVisibles={types}
        recos={affichees}
        allumes={allumes}
        focus={focus}
        survol={survol}
        orbite={intro}
      />

      {intro ? (
        <Onboarding
          donnees={{ resume, carreaux: carreaux?.liste.length ?? null, stations: stations?.features.length ?? null, scenario: scenarioIntro }}
          onTerminer={terminerIntro}
        />
      ) : (
        <>
          <div className="absolute left-4 top-24 z-[900] hidden sm:left-5 md:block">
            <LayerPanel mode={mode} onMode={setMode} types={types} onTypes={setTypes} />
          </div>

          <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 top-24 z-[900] hidden w-72 lg:block">
            <RecoList recos={affichees} total={recos.length} onSurvol={setSurvol} onChoix={setFocus} choisie={focus?.rank ?? null} />
          </div>

          <div className="absolute bottom-4 left-1/2 z-[950] -translate-x-1/2 lg:left-[calc(50%-9rem)]">
            <BudgetDock
              budget={budget}
              onBudget={(b) => {
                setFocus(null);
                setBudget(b);
              }}
              perimetre={perimetre}
              onPerimetre={(p) => {
                setFocus(null);
                setPerimetre(p);
                setMode(p === 'tous' ? 'acces' : 'citiz');
              }}
              chargement={chargement || !carreaux}
              equipements={affichees.length}
              habitants={habitants}
              depense={depense}
              voitures={voitures}
              citizAvant={citizAvant}
              citizApres={citizApres}
            />
          </div>
        </>
      )}

      {/* Au-dessus de l'accueil (z-1500) : un échec de chargement doit rester visible, avec une sortie */}
      {(erreurBase || erreurScenario) && (
        <div role="alert" className="glass absolute left-1/2 top-24 z-[1600] flex w-[min(92vw,560px)] -translate-x-1/2 flex-wrap items-center gap-3 rounded-2xl border-coral/40 px-4 py-3 text-sm">
          <span className="min-w-0 flex-1 text-[#b3261e]">
            {erreurBase ? `Données indisponibles : ${erreurBase}` : `Scénario indisponible : ${erreurScenario}`}
          </span>
          <button onClick={() => setEssai((n) => n + 1)} className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-paper transition hover:bg-ink/80">
            Réessayer
          </button>
          {intro && (
            <button onClick={terminerIntro} className="rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:border-ink/40">
              Passer l’accueil
            </button>
          )}
        </div>
      )}
    </div>
  );
}
