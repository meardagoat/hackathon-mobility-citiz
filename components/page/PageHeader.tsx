import React from 'react';
import type { Meta } from '@/types/api';
import { formatDate } from '@/lib/utils';

export function PageHeader({ etiquette, titre, sousTitre, meta, droite }: {
  etiquette: string;
  titre: React.ReactNode;
  sousTitre?: React.ReactNode;
  meta?: Meta | null;
  droite?: React.ReactNode;
}) {
  return (
    <header className="rise mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <div className="label-mono mb-4 flex items-center gap-3 !text-teal-ink">
          <span className="h-[2px] w-8 rounded bg-teal" />
          {etiquette}
        </div>
        <h1 className="text-[clamp(2rem,3.6vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.02em]">{titre}</h1>
        {sousTitre && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-dim">{sousTitre}</p>}
        {meta && (
          <p className="label-mono mt-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
            {meta.data_mode === 'real' ? `Données réelles · collecte du ${formatDate(meta.data_collected_at)}` : 'Données factices (mode mock de l’API)'}
          </p>
        )}
      </div>
      {droite}
    </header>
  );
}

export function Panneau({ titre, sousTitre, children, className = '', delai = 0 }: {
  titre?: React.ReactNode;
  sousTitre?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delai?: number;
}) {
  return (
    <section className={`rise rounded-[28px] border border-ink/[0.07] bg-paper p-6 shadow-soft sm:p-7 ${className}`} style={{ animationDelay: `${delai}s` }}>
      {titre && (
        <div className="mb-5">
          <h2 className="text-lg font-bold tracking-tight">{titre}</h2>
          {sousTitre && <p className="mt-1 text-sm text-ink-dim">{sousTitre}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Chargement({ texte = 'Chargement des données…' }: { texte?: string }) {
  return (
    <div className="flex items-center gap-3 py-16 text-sm text-ink-dim">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-60" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-teal" />
      </span>
      {texte}
    </div>
  );
}

export function Erreur({ message }: { message: string }) {
  return <div className="rounded-2xl border border-coral/30 bg-coral/[0.06] px-4 py-3 text-sm text-coral">{message}</div>;
}
