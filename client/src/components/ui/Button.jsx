import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils.js';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-brand-indigo dark:bg-brand-indigo-bright text-white shadow-btn-primary dark:shadow-btn-primary-dark hover:bg-brand-indigo-deep dark:hover:bg-brand-violet hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0',
        secondary:
          'bg-app-secondary text-app-text hover:bg-app-secondary/80 border border-app-border/60 hover:border-app-border',
        outline:
          'border border-app-border bg-app-surface text-app-text shadow-subtle hover:bg-app-secondary hover:border-brand-indigo/50 dark:hover:border-brand-violet/50 hover:text-brand-indigo dark:hover:text-brand-violet-light',
        ghost:
          'text-app-text-muted hover:bg-app-secondary hover:text-app-text',
        destructive:
          'bg-rose-600 text-white shadow-sm hover:bg-rose-700 hover:shadow-rose-600/30',
        subtle:
          'bg-brand-indigo/10 dark:bg-brand-violet/15 text-brand-indigo dark:text-brand-violet-light hover:bg-brand-indigo/20 dark:hover:bg-brand-violet/25',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-8.5 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-6 text-base',
        icon: 'h-9 w-9 rounded-lg p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export function Button({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-current" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
