'use client';
import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { SummaryResponse } from '@/types/api';
import { AnimatedNumber } from './AnimatedNumber';
import { formatDate, formatNumber } from '@/lib/utils';

export function Intro({ resume, onEntrer }: { resume: SummaryResponse | null; onEntrer: () => void }) {
  const sansCitiz = resume?.citiz.population_within_5min_share != null ? (1 - resume.citiz.population_within_5min_share) * 100 : null;
  return (
    <div className="absolute inset-0 z-[1000] flex items-end bg-gradient-to-t from-night via-night/80 to-night/10 sm:items-center sm:bg-gradient-to-r sm:from-night sm:via-night/75 sm:to-night/0">
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 sm:pb-0">
        <div className="rise label-mono mb-6 flex items-center gap-3">
          <span className="h-px w-10 bg-volt" />
          Bordeaux Métropole · 28 communes · {resume ? formatNumber(resume.population_total) : '…'} habitants
        </div>
        <h1 className="rise max-w-4xl font-display text-[clamp(2.4rem,6.4vw,5.6rem)] font-semibold leading-[0.95] tracking-[-0.03em]" style={{ animationDelay: '0.1s' }}>
          <span className="text-volt text-glow">{sansCitiz === null ? '…' : <AnimatedNumber value={sansCitiz} format={(n) => `${Math.round(n)} %`} duration={1800} />}</span>{' '}
          des habitants n’ont pas de voiture partagée à 5 minutes à pied.
        </h1>
        <p className="rise mt-6 max-w-xl text-base text-ink-dim sm:text-lg" style={{ animationDelay: '0.25s' }}>
          Proxima croise la population INSEE, les transports en commun et les stations Citiz pour dire, budget en main, où ouvrir les prochaines stations.
        </p>
        <div className="rise mt-10 flex flex-wrap items-center gap-5" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={onEntrer}
            className="group flex items-center gap-3 rounded-full bg-volt py-3.5 pl-7 pr-5 font-medium text-night shadow-[0_0_40px_rgba(212,255,58,0.35)] transition-transform hover:scale-[1.03]"
          >
            Explorer la carte
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-night text-volt transition-transform group-hover:translate-x-1">
              <ArrowRight size={16} />
            </span>
          </button>
          <span className="label-mono">Données réelles · {formatDate(resume?.meta.data_collected_at)}</span>
        </div>
      </div>
    </div>
  );
}
