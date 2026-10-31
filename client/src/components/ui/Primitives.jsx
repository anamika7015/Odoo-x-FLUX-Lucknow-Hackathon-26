import React from 'react';
import { cn } from '../../lib/utils.js';
export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-app-accent/10 text-app-accent',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
    muted: 'bg-app-secondary text-app-muted',
  };
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)} {...props} />;
}
export function Input({ className, ...props }) {
  return <input className={cn('flex h-10 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text placeholder:text-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent disabled:opacity-50', className)} {...props} />;
}
export function Label({ className, ...props }) { return <label className={cn('text-sm font-medium text-app-text', className)} {...props} />; }
export function Skeleton({ className, ...props }) { return <div className={cn('animate-pulse rounded-md bg-app-secondary', className)} {...props} />; }
