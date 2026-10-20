'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Explorer' },
  { href: '/dashboard', label: 'Chiffres' },
  { href: '/map', label: 'Offre' },
  { href: '/recommendations', label: 'Classement' },
];

type ApiStatus = 'checking' | 'up' | 'down';

function useApiStatus(): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>('checking');
  useEffect(() => {
    let cancelled = false;
    fetch(`${new URL(API_BASE_URL).origin}/health`)
      .then((response) => !cancelled && setStatus(response.ok ? 'up' : 'down'))
      .catch(() => !cancelled && setStatus('down'));
    return () => {
      cancelled = true;
    };
  }, []);
  return status;
}

const STATUS: Record<ApiStatus, { dot: string; label: string }> = {
  checking: { dot: 'bg-ink-dim', label: 'Connexion…' },
  up: { dot: 'bg-volt shadow-[0_0_10px_#d4ff3a]', label: 'Données en direct' },
  down: { dot: 'bg-ember', label: 'API injoignable' },
};

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('group flex items-center gap-3', className)}>
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-volt/40" />
        <span className="absolute inset-[7px] rounded-full bg-volt shadow-[0_0_18px_#d4ff3a]" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-[15px] font-semibold tracking-tight text-ink">Proxima</span>
        <span className="block label-mono !text-[9px]">Hackathon Mobilité · 2026</span>
      </span>
    </Link>
  );
}

function TopBar() {
  const pathname = usePathname();
  const status = STATUS[useApiStatus()];
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[1100] flex items-start justify-between gap-4 p-4 sm:p-5">
      <div className="glass pointer-events-auto rounded-2xl px-4 py-2.5">
        <Brand />
      </div>
      <nav className="glass pointer-events-auto flex items-center gap-1 rounded-2xl p-1.5">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-xl px-3.5 py-2 text-sm font-medium transition-all',
                active ? 'bg-volt text-night shadow-[0_0_24px_rgba(212,255,58,0.35)]' : 'text-ink-dim hover:bg-white/5 hover:text-ink',
              )}
            >
              {item.label}
            </Link>
          );
        })}
        <span className="mx-1 hidden h-5 w-px bg-white/10 md:block" />
        <span className="hidden items-center gap-2 px-2 md:flex" title={API_BASE_URL}>
          <span className={cn('h-2 w-2 rounded-full', status.dot)} />
          <span className="label-mono">{status.label}</span>
        </span>
      </nav>
    </header>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname === '/';
  return (
    <>
      <TopBar />
      <main className={cn('min-h-screen', !fullBleed && 'mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6')}>{children}</main>
    </>
  );
}
