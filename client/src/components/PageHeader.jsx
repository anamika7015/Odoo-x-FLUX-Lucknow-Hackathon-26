import React from 'react';
import { cn } from '../lib/utils.js';

export function PageHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-[11px] font-bold tracking-widest text-brand-violet dark:text-brand-violet-light uppercase">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-app-text tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-xs sm:text-sm text-app-text-muted max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
