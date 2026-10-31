import { cn } from '../lib/utils.js';

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-app-border bg-app-surface px-6 py-16 text-center', className)}>
      {Icon && <Icon className="mb-4 h-10 w-10 text-app-muted" />}
      <h3 className="text-lg font-semibold text-app-text">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-app-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
