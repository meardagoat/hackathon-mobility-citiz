'use client';
import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, Check, Database, Cpu, Target } from 'lucide-react';
import type { RecommendationResponse, SummaryResponse } from '@/types/api';
import { cn, formatNumber } from '@/lib/utils';
import { AnimatedNumber } from './AnimatedNumber';
import { PartnerLogos } from './PartnerLogos';

export interface Chargement {
  resume: SummaryResponse | null;
  carreaux: number | null;
  stations: number | null;
  scenario: RecommendationResponse | null;
}

// Tracé au trait façon illustrations Citiz : une boucle qui traverse l'écran
const BOUCLE =
  'M-40 640 C 220 640, 330 540, 560 560 S 820 690, 930 610 S 900 500, 800 520 S 720 620, 880 650 S 1220 590, 1340 520 S 1520 470, 1700 500';

function Trace({ voiture = true }: { voiture?: boolean }) {
  return (
    <svg viewBox="0 0 1600 700" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <path d={BOUCLE} fill="none" stroke="#dbf4f4" strokeWidth="26" strokeLinecap="round" />
      <path d={BOUCLE} fill="none" stroke="#32b4b5" strokeWidth="5" strokeLinecap="round" className="draw" style={{ ['--len' as string]: 2600 }} />
      {voiture && (
        <g style={{ offsetPath: `path('${BOUCLE}')`, animation: 'drive 6s 1.2s cubic-bezier(0.5,0,0.3,1) infinite both' } as React.CSSProperties}>
          <circle r="13" fill="#ffffff" stroke="#202020" strokeWidth="3" />
          <circle r="5" fill="#32b4b5" />
        </g>
      )}
    </svg>
  );
}

function Ligne({ fait, children }: { fait: boolean; children: React.ReactNode }) {
  return (
    <li className={cn('flex items-center gap-3 text-sm transition-colors', fait ? 'text-ink' : 'text-ink-soft')}>
      <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border transition-all', fait ? 'border-teal bg-teal text-ink' : 'border-ink/15')}>
        {fait ? <Check size={12} strokeWidth={3} /> : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal" />}
      </span>
      {children}
    </li>
  );
}

function BoutonPilule({ onClick, children, discret }: { onClick: () => void; children: React.ReactNode; discret?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-full py-2.5 pl-6 pr-2.5 text-[15px] font-semibold transition-all active:scale-[0.98]',
        discret ? 'text-ink-dim hover:text-ink' : 'bg-teal text-ink shadow-lift hover:bg-teal-deep',
      )}
    >
      {children}
      {!discret && (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-teal-ink transition-transform group-hover:translate-x-0.5">
          <ArrowRight size={17} />
        </span>
      )}
    </button>
  );
}

export function Onboarding({ donnees, onTerminer }: { donnees: Chargement; onTerminer: () => void }) {
  const [etape, setEtape] = useState(0); // 0 : chargement, 1 à 3 : présentation
  const [delaiMini, setDelaiMini] = useState(false);
  // 0 carreau ou 0 station est une réponse valide : seul null veut dire « pas encore chargé »
  const pret = donnees.resume !== null && donnees.carreaux !== null && donnees.stations !== null && donnees.scenario !== null;
  const etapes = [1, 2, 3];

  useEffect(() => {
    const id = setTimeout(() => setDelaiMini(true), 2800);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (etape === 0 && pret && delaiMini) {
      const id = setTimeout(() => setEtape(1), 500);
      return () => clearTimeout(id);
    }
  }, [etape, pret, delaiMini]);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onTerminer(); // Échap passe l'accueil à tout moment, chargement compris
      if (etape === 0) return;
      // Entrée et Espace gardent leur effet natif sur un bouton, un lien ou un champ ciblé
      const cible = e.target instanceof Element ? e.target : null;
      if ((e.key === 'Enter' || e.key === ' ') && cible?.closest('button, a, input, textarea, select, [role="button"]')) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (etape < 3) setEtape(etape + 1);
        else onTerminer();
      }
      if (e.key === 'ArrowLeft' && etape > 1) setEtape(etape - 1);
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [etape, onTerminer]);

  const r = donnees.resume;
  const s = donnees.scenario;
  const partCitiz = r?.citiz.population_within_5min_share ?? null;
  const progression = [r, donnees.carreaux, donnees.stations, s].filter((x) => x !== null).length / 4;

  // Écran de chargement
  if (etape === 0) {
    return (
      <div className="absolute inset-0 z-[1500] overflow-hidden bg-paper">
        <div className="absolute inset-x-0 top-0 h-1 bg-teal-tint">
          <div className="h-full bg-teal transition-all duration-700" style={{ width: `${Math.max(progression, 0.06) * 100}%` }} />
        </div>
        <Trace />
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="rise label-mono mb-8">Hackathon Mobilité · 2026 · Bordeaux</div>
          <PartnerLogos taille="lg" anime />
          <h1 className="rise mt-12 text-[clamp(2.2rem,5vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.02em]" style={{ animationDelay: '1s' }}>
            proxima<span className="text-teal">.</span>
          </h1>
          <p className="rise mt-3 max-w-md text-lg text-ink-dim" style={{ animationDelay: '1.15s' }}>
            Où ouvrir les prochaines stations d’autopartage, budget en main.
          </p>
        </div>
        <ul className="rise absolute bottom-8 left-8 hidden space-y-2.5 rounded-3xl bg-paper/80 p-5 backdrop-blur sm:block" style={{ animationDelay: '1.3s' }}>
          <Ligne fait={donnees.carreaux !== null}>Population INSEE · {donnees.carreaux !== null ? `${formatNumber(donnees.carreaux)} carreaux de 200 m` : 'chargement…'}</Ligne>
          <Ligne fait={donnees.stations !== null}>Arrêts et stations · {donnees.stations !== null ? formatNumber(donnees.stations) : 'chargement…'}</Ligne>
          <Ligne fait={r !== null}>Couverture actuelle · {r ? `${formatNumber(r.population_total)} habitants` : 'chargement…'}</Ligne>
          <Ligne fait={s !== null}>Scénarios d’investissement · {s ? 'prêts' : 'chargement…'}</Ligne>
        </ul>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[1500]">
      {/* Panneau blanc à gauche, la ville tourne à droite */}
      <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/95 to-paper/0 lg:via-paper/90" style={{ backgroundSize: '100% 100%' }} />
      <div className="relative flex h-full flex-col px-6 pb-8 pt-28 sm:px-12 lg:w-[58%] lg:pl-16">
        <PartnerLogos taille="sm" className="fade mb-auto" />

        <div key={etape} className="my-auto max-w-2xl">
          <div className="rise label-mono mb-5 flex items-center gap-3 !text-teal-ink">
            <span className="h-[2px] w-8 rounded bg-teal" />
            {['', '01 · Le constat', '02 · La méthode', '03 · L’objectif'][etape]}
          </div>

          {etape === 1 && (
            <>
              <h2 className="rise text-[clamp(2rem,4.4vw,3.7rem)] font-extrabold leading-[1.04] tracking-[-0.02em]" style={{ animationDelay: '0.08s' }}>
                <span className="text-teal">{partCitiz === null ? '…' : <AnimatedNumber value={(1 - partCitiz) * 100} format={(n) => `${Math.round(n)} %`} duration={1600} />}</span> des habitants de Bordeaux Métropole n’ont pas de voiture partagée à 5 minutes à pied.
              </h2>
              <div className="rise mt-10 grid max-w-xl grid-cols-3 gap-6 border-t border-ink/10 pt-6" style={{ animationDelay: '0.25s' }}>
                <Chiffre valeur={r ? formatNumber(r.population_total) : '…'} label="habitants" />
                <Chiffre valeur={r ? formatNumber(r.citiz.stations_count) : '…'} label="stations Citiz" />
                <Chiffre valeur={partCitiz !== null ? `${(partCitiz * 100).toFixed(1).replace('.', ',')} %` : '…'} label="à 5 min d’une station" />
              </div>
            </>
          )}

          {etape === 2 && (
            <>
              <h2 className="rise text-[clamp(2rem,4vw,3.3rem)] font-extrabold leading-[1.05] tracking-[-0.02em]" style={{ animationDelay: '0.08s' }}>
                Trois sources ouvertes, une plateforme, un classement.
              </h2>
              <ol className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  { icone: Database, titre: 'Données ouvertes', texte: 'Population INSEE au carreau de 200 m, transports en commun (GTFS), stations Citiz et vélos (GBFS).' },
                  { icone: Cpu, titre: 'Microsoft Fabric', texte: 'Lakehouse et notebooks : collecte, accès à 400 m à pied, modèle prédictif évalué en validation spatiale.' },
                  { icone: Target, titre: 'Optimisation', texte: 'Classement sous budget : le plus d’habitants gagnés par euro, sans compter deux fois les mêmes.' },
                ].map(({ icone: Icone, titre, texte }, i) => (
                  <li key={titre} className="rise rounded-3xl border border-ink/10 bg-paper p-5 shadow-soft" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
                    <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-teal-tint text-teal-ink">
                      <Icone size={18} />
                    </span>
                    <div className="font-bold">{titre}</div>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">{texte}</p>
                  </li>
                ))}
              </ol>
            </>
          )}

          {etape === 3 && (
            <>
              <h2 className="rise text-[clamp(2rem,4.2vw,3.5rem)] font-extrabold leading-[1.05] tracking-[-0.02em]" style={{ animationDelay: '0.08s' }}>
                Avec 1 M€, <span className="text-leaf">{s ? s.recommendations.length : '…'} stations Citiz</span> rapprochent{' '}
                <span className="text-leaf">{s && s.total_population_gained !== null ? <AnimatedNumber value={s.total_population_gained} format={(n) => formatNumber(Math.round(n))} duration={1600} /> : '…'}</span>{' '}
                habitants d’une voiture partagée.
              </h2>
              <p className="rise mt-6 max-w-lg text-lg text-ink-dim" style={{ animationDelay: '0.25s' }}>
                Choisissez un budget : l’outil dit où ouvrir chaque station, dans l’ordre, et combien d’habitants elle rapproche.
              </p>
            </>
          )}
        </div>

        <div className="fade mt-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            {etapes.map((n) => (
              <button
                key={n}
                onClick={() => setEtape(n)}
                aria-label={`Étape ${n}`}
                className={cn('h-2 rounded-full transition-all duration-500', n === etape ? 'w-8 bg-teal' : 'w-2 bg-ink/15 hover:bg-ink/30')}
              />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {etape > 1 && (
              <button onClick={() => setEtape(etape - 1)} aria-label="Retour" className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 text-ink-dim transition hover:border-ink/30 hover:text-ink">
                <ArrowLeft size={17} />
              </button>
            )}
            {etape < 3 && <BoutonPilule discret onClick={onTerminer}>Passer</BoutonPilule>}
            <BoutonPilule onClick={() => (etape < 3 ? setEtape(etape + 1) : onTerminer())}>{etape < 3 ? 'Suivant' : 'Explorer Bordeaux'}</BoutonPilule>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chiffre({ valeur, label }: { valeur: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-extrabold tracking-tight">{valeur}</div>
      <div className="mt-0.5 text-sm text-ink-dim">{label}</div>
    </div>
  );
}
