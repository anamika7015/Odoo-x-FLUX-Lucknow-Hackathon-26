import React from 'react';
import { cn } from '../lib/utils.js';

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-app-border bg-app-surface/60 px-6 py-14 text-center backdrop-blur-sm',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-violet/10 dark:bg-brand-violet/20 text-brand-indigo dark:text-brand-violet-light border border-brand-violet/20">
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-base font-bold text-app-text tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs text-app-text-muted leading-relaxed sm:text-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
