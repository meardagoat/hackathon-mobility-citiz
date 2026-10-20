import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-ink">{label}</label>}
      <input
        className={cn(
          'px-3 py-2 rounded-lg border text-sm text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-transparent transition-colors',
          error ? 'border-red-400 bg-red-50' : 'border-ink/15 bg-paper hover:border-ink/20',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-dim">{hint}</p>}
    </div>
  );
}
