import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  style?: React.CSSProperties;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-ink/[0.04] text-ink',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-teal/15 text-teal-ink',
};

export function Badge({ children, variant = 'default', className, style }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variantClasses[variant], className)} style={style}>
      {children}
    </span>
  );
}
