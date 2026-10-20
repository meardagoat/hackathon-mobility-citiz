import React from 'react';
import { cn } from '@/lib/utils';

// Logo Microsoft : les quatre carrés et le nom
function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 108 23" className={className} role="img" aria-label="Microsoft">
      <rect x="0" y="0" width="10.5" height="10.5" fill="#F25022" />
      <rect x="11.5" y="0" width="10.5" height="10.5" fill="#7FBA00" />
      <rect x="0" y="11.5" width="10.5" height="10.5" fill="#00A4EF" />
      <rect x="11.5" y="11.5" width="10.5" height="10.5" fill="#FFB900" />
      <text x="29" y="17" fontFamily="'Segoe UI', var(--font-fira), sans-serif" fontSize="15.5" fontWeight="600" fill="#737373">
        Microsoft
      </text>
    </svg>
  );
}

export function PartnerLogos({ taille = 'md', anime = false, className }: { taille?: 'sm' | 'md' | 'lg'; anime?: boolean; className?: string }) {
  const h = { sm: 'h-4', md: 'h-6', lg: 'h-9' }[taille];
  const sep = <span className={cn('font-light text-ink-soft', taille === 'lg' ? 'text-2xl' : 'text-sm')}>×</span>;
  const item = (delai: number, enfant: React.ReactNode) => (
    <span className={cn('flex items-center', anime && 'rise')} style={anime ? { animationDelay: `${delai}s` } : undefined}>
      {enfant}
    </span>
  );
  return (
    <div className={cn('flex items-center', taille === 'lg' ? 'gap-6 sm:gap-8' : 'gap-3', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item(0.1, <img src="/logos/citiz.svg" alt="Citiz" className={h} />)}
      {item(0.3, sep)}
      {item(0.45, <MicrosoftLogo className={h} />)}
      {item(0.65, sep)}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item(0.8, <img src="/logos/epitech.svg" alt="Epitech" className={cn(h, 'py-[3%]')} />)}
    </div>
  );
}
