import React, { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { applyTheme, getTheme } from '../lib/theme.js';
import { cn } from '../lib/utils.js';

export function ThemeSelect({ className = '', compact = false }) {
  const [theme, setTheme] = useState(getTheme());

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      if (getTheme() === 'system') applyTheme('system');
    };
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const change = (event) => {
    const val = event.target.value;
    setTheme(val);
    applyTheme(val);
  };

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <div className={cn(
        'flex items-center rounded-xl border border-app-border bg-app-surface/90 shadow-subtle hover:border-brand-violet/40 transition-colors',
        compact ? 'h-8 w-8 justify-center' : 'gap-1.5 px-2.5 py-1.5'
      )}>
        <span className="text-brand-indigo dark:text-brand-violet-light shrink-0">
          {theme === 'dark' ? (
            <Moon size={15} strokeWidth={2} />
          ) : theme === 'light' ? (
            <Sun size={15} strokeWidth={2} />
          ) : (
            <Monitor size={15} strokeWidth={2} />
          )}
        </span>
        <select
          aria-label="Theme preference"
          value={theme}
          onChange={change}
          className={cn(
            'bg-transparent text-xs font-semibold text-app-text outline-none cursor-pointer',
            compact ? 'absolute inset-0 h-full w-full opacity-0' : 'pr-1'
          )}
        >
          <option value="light" className="bg-app-surface text-app-text">Light</option>
          <option value="dark" className="bg-app-surface text-app-text">Dark</option>
          <option value="system" className="bg-app-surface text-app-text">System</option>
        </select>
      </div>
    </div>
  );
}
