'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Map, Lightbulb, Activity, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard', description: 'Vue globale' },
  { href: '/map', icon: Map, label: 'Carte', description: 'Couverture géo.' },
  { href: '/recommendations', icon: Lightbulb, label: 'Recommandations', description: 'Optimisation IA' },
];

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-60 flex flex-col z-30" style={{backgroundColor: '#111111'}}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
          <Activity size={16} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">MobilityAI</p>
          <p className="text-white/40 text-[10px]">Hackathon 2024</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-white/30 text-[10px] uppercase tracking-wider px-3 mb-3 font-semibold">Navigation</p>
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm',
                active
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-white/60 hover:bg-white/8 hover:text-white'
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.label}</p>
                <p className={cn('text-[10px] truncate', active ? 'text-blue-200' : 'text-white/30')}>{item.description}</p>
              </div>
              {active && <ChevronRight size={14} className="text-blue-200 flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <p className="text-white/40 text-xs">API connectée</p>
        </div>
        <p className="text-white/20 text-[10px] mt-1">v1.0 — Base URL: localhost:8000</p>
      </div>
    </aside>
  );
}

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen">
        {children}
      </main>
    </div>
  );
}
