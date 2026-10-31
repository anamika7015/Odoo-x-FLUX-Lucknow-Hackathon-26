import React from 'react';
import { cn } from '../../lib/utils.js';

export function Card({ className, ...props }) {
  return <section className={cn('rounded-xl border border-app-border bg-app-surface shadow-sm', className)} {...props} />;
}
export function CardHeader({ className, ...props }) { return <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />; }
export function CardTitle({ className, ...props }) { return <h3 className={cn('text-lg font-semibold text-app-text', className)} {...props} />; }
export function CardDescription({ className, ...props }) { return <p className={cn('text-sm text-app-muted', className)} {...props} />; }
export function CardContent({ className, ...props }) { return <div className={cn('p-6 pt-0', className)} {...props} />; }
export function CardFooter({ className, ...props }) { return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />; }
