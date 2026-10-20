'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { carreauxAllumes, chargerCarreaux, chargerStations, indexer, type Carreau, type CarreauxGeoJSON } from '@/lib/explorer';
import { PERIMETERS } from '@/lib/constants';
import type { Perimeter, Recommendation, RecommendationResponse, StationType, StationsResponse, SummaryResponse } from '@/types/api';
import { BudgetDock } from '@/components/explorer/BudgetDock';
import { RecoList } from '@/components/explorer/RecoList';
import { LayerPanel } from '@/components/explorer/LayerPanel';
import { Onboarding } from '@/components/explorer/Onboarding';
import type { Mode } from '@/components/explorer/CityMap';

const CityMap = dynamic(() => import('@/components/explorer/CityMap'), { ssr: false });

const PAS_ANIMATION_MS = 110;

export default function ExplorerPage() {
  const [intro, setIntro] = useState(true);
  const [resume, setResume] = useState<SummaryResponse | null>(null);
  const [carreaux, setCarreaux] = useState<{ liste: Carreau[]; geojson: CarreauxGeoJSON } | null>(null);
  const [stations, setStations] = useState<StationsResponse | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

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
  const terminerIntro = useCallback(() => setIntro(false), []);

  // Données de base
  useEffect(() => {
    api.summary().then(setResume).catch((e: Error) => setErreur(e.message));
    chargerCarreaux()
      .then(({ carreaux: liste, geojson }) => setCarreaux({ liste, geojson }))
      .catch((e: Error) => setErreur(e.message));
    chargerStations().then(setStations).catch((e: Error) => setErreur(e.message));
  }, []);

  // Recommandations du scénario (précalculées par le notebook 05, servies par l'API)
  useEffect(() => {
    const cle = `${budget}|${perimetre}`;
    let annule = false;
    const appliquer = (r: RecommendationResponse) => {
      if (annule) return;
      setResultat(r);
      setVisibles(0);
      setChargement(false);
    };
    const enCache = cache.current.get(cle);
    if (enCache) {
      appliquer(enCache);
      return;
    }
    setChargement(true);
    api
      .recommendations({ budget, equipment_types: PERIMETERS[perimetre].equipment_types, max_results: 100 })
      .then((r) => {
        cache.current.set(cle, r);
        if (cle === '1000000|citiz') setScenarioIntro(r);
        appliquer(r);
      })
      .catch((e: Error) => {
        if (!annule) {
          setErreur(e.message);
          setChargement(false);
        }
      });
    return () => {
      annule = true;
    };
  }, [budget, perimetre]);

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
      const budgets = [100_000, 250_000, 500_000, 1_000_000];
      if (['1', '2', '3', '4'].includes(e.key)) {
        setFocus(null);
        setBudget(budgets[Number(e.key) - 1]);
      }
      if (e.key === 'c') setPerimetre('citiz');
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
                if (p === 'tous') setMode('acces');
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

      {erreur && (
        <div className="glass absolute left-1/2 top-24 z-[1200] -translate-x-1/2 rounded-2xl border-coral/40 px-4 py-3 text-sm text-coral">
          Données indisponibles : {erreur}
        </div>
      )}
    </div>
  );
}
