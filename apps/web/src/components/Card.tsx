import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ElementType, ReactNode } from 'react';

export function Card({
  children,
  className,
  as: Component = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return <Component className={clsx('card', className)}>{children}</Component>;
}

export function CardHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-unior-50 text-unior-700">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
        <div>
          <h2 className="text-base font-semibold text-unior-900">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('px-5 py-4', className)}>{children}</div>;
}

export type MetricTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const METRIC_TONES: Record<MetricTone, { icon: string; value: string; accent: string }> = {
  default: { icon: 'bg-unior-50 text-unior-700', value: 'text-unior-900', accent: 'bg-unior-600' },
  info: { icon: 'bg-blue-50 text-blue-700', value: 'text-blue-900', accent: 'bg-blue-600' },
  success: {
    icon: 'bg-emerald-50 text-emerald-700',
    value: 'text-emerald-900',
    accent: 'bg-emerald-600',
  },
  warning: { icon: 'bg-amber-50 text-amber-700', value: 'text-amber-900', accent: 'bg-amber-500' },
  danger: { icon: 'bg-red-50 text-red-700', value: 'text-red-900', accent: 'bg-red-600' },
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  loading = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: MetricTone;
  loading?: boolean;
}) {
  const tones = METRIC_TONES[tone];
  return (
    <div className="card relative overflow-hidden p-5">
      <span className={clsx('absolute inset-x-0 top-0 h-0.5', tones.accent)} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          {loading ? (
            <div className="skeleton mt-2 h-7 w-16" />
          ) : (
            <p className={clsx('mt-1 text-2xl font-semibold tabular', tones.value)}>{value}</p>
          )}
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <span
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            tones.icon,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
