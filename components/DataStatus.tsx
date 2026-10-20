import React from 'react';
import { AlertTriangle, Database, FlaskConical } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Meta } from '@/types/api';

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-ink-soft">{message}</p>;
}

export function DataModeNotice({ meta }: { meta: Meta }) {
  if (meta.data_mode === 'mock') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
        <FlaskConical size={12} />
        Données factices (mode mock de l’API)
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
      <Database size={12} />
      Données réelles, mises à jour le {formatDate(meta.data_collected_at)}
    </div>
  );
}
