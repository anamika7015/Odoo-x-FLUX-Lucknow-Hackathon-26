import React from 'react';
import { Loader2 } from 'lucide-react';

export function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-app-muted">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-brand-indigo/10 dark:bg-brand-violet/10 animate-ping absolute" />
        <div className="w-12 h-12 rounded-2xl bg-brand-indigo/10 dark:bg-brand-violet/15 border border-brand-indigo/30 dark:border-brand-violet/30 flex items-center justify-center text-brand-indigo dark:text-brand-violet shadow-glow">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
      <p className="text-sm font-medium tracking-wide">Loading workspace…</p>
    </div>
  );
}
