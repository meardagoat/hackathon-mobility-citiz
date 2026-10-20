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
  checking: { dot: 'bg-ink-soft', label: 'Connexion…' },
  up: { dot: 'bg-teal', label: 'Données en direct' },
  down: { dot: 'bg-coral', label: 'API injoignable' },
};

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('group flex items-baseline gap-3', className)}>
      <span className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        proxima<span className="text-teal">.</span>
      </span>
      <span className="label-mono hidden !text-[9.5px] sm:inline">Hackathon Mobilité · 2026</span>
    </Link>
  );
}

function TopBar() {
  const pathname = usePathname();
  const status = STATUS[useApiStatus()];
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[1100] flex items-start justify-between gap-4 p-4 sm:p-5">
      <div className="glass pointer-events-auto rounded-full px-5 py-2.5">
        <Brand />
      </div>
      <nav className="glass pointer-events-auto flex items-center gap-1 rounded-full p-1.5">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition-all',
                active ? 'bg-teal text-white' : 'text-ink-dim hover:bg-ink/[0.04] hover:text-ink',
              )}
            >
              {item.label}
            </Link>
          );
        })}
        <span className="mx-1 hidden h-5 w-px bg-ink/10 md:block" />
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
