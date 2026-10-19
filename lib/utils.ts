import type { TransportType } from '@/types/api';
import { TRANSPORT_COLORS, TRANSPORT_LABELS } from './constants';

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function getTransportColor(type: TransportType): string {
  return TRANSPORT_COLORS[type] ?? '#6b7280';
}

export function getTransportLabel(type: TransportType): string {
  return TRANSPORT_LABELS[type] ?? type;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
