import React from 'react';
import { cn } from '../../lib/utils.js';

export function Card({ className, ...props }) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-app-border bg-app-surface shadow-subtle transition-all duration-200',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1.5 p-5 sm:p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-base font-bold text-app-text tracking-tight sm:text-lg', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-xs text-app-text-muted leading-relaxed sm:text-sm', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5 sm:p-6 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return <div className={cn('flex items-center p-5 sm:p-6 pt-0 border-t border-app-border/60 mt-4', className)} {...props} />;
}
