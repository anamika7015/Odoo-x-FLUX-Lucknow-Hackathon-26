import React from 'react';
import { cn } from '../../lib/utils.js';

export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default:
      'bg-brand-indigo/10 dark:bg-brand-violet/20 text-brand-indigo dark:text-brand-violet-light border border-brand-indigo/20 dark:border-brand-violet/30',
    violet:
      'bg-brand-violet/15 dark:bg-brand-violet/25 text-brand-indigo dark:text-brand-violet-light border border-brand-violet/30',
    success:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
    warning:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25',
    danger:
      'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25',
    muted:
      'bg-app-secondary text-app-text-muted border border-app-border',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-xl border border-app-border bg-app-surface px-3.5 py-2 text-sm text-app-text placeholder:text-app-text-muted/60 transition-all focus-visible:outline-none focus-visible:border-brand-indigo dark:focus-visible:border-brand-violet-light focus-visible:ring-2 focus-visible:ring-app-ring disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }) {
  return <label className={cn('text-xs font-semibold text-app-text', className)} {...props} />;
}

export function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse rounded-xl bg-app-secondary/80', className)} {...props} />;
}
