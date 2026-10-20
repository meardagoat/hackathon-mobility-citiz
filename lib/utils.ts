export const UNAVAILABLE = 'Non disponible';

export function formatNumber(n: number | null | undefined): string {
  return n === null || n === undefined ? UNAVAILABLE : n.toLocaleString('fr-FR');
}

export function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return UNAVAILABLE;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export function formatPercent(share: number | null | undefined): string {
  return share === null || share === undefined ? UNAVAILABLE : `${(share * 100).toFixed(1)} %`;
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : UNAVAILABLE;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Pour les bulles de carte construites en HTML : aucune valeur venue des données ne doit devenir du balisage
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
