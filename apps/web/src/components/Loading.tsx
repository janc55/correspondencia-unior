'use client';

import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function Spinner({ className, label = 'Cargando' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={clsx('inline-flex', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-unior-700" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-line" aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-5 py-4">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div
              key={columnIndex}
              className="skeleton h-4"
              style={{ width: columnIndex === 0 ? '28%' : `${Math.max(12, 64 / columns)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FullPageLoader({ label = 'Cargando información' }: { label?: string }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-mist"
      role="status"
      aria-live="polite"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-unior-900">
        <Loader2 className="h-6 w-6 animate-spin text-gold-400" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card p-5" aria-hidden="true">
      <div className="flex items-center justify-between gap-4">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="skeleton h-3" style={{ width: `${90 - index * 12}%` }} />
        ))}
      </div>
    </div>
  );
}
