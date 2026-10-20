import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: string;
  className?: string;
}

export function StatCard({ title, value, subtitle, icon, trend, color = '#3b82f6', className }: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink-dim font-medium truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-ink truncate">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-ink-dim/70">{subtitle}</p>}
          {trend && (
            <div className={cn('mt-2 flex items-center gap-1 text-xs font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 p-3 rounded-xl" style={{ backgroundColor: `${color}20` }}>
          <div style={{color}}>{icon}</div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl" style={{backgroundColor: color}} />
    </Card>
  );
}
