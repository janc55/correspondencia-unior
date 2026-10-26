import clsx from 'clsx';
import type { ReactNode } from 'react';

import { formatDateTime, formatRelative } from '@/lib/format';

export type TimelineTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<TimelineTone, string> = {
  default: 'bg-unior-600 ring-unior-100',
  info: 'bg-blue-600 ring-blue-100',
  success: 'bg-emerald-600 ring-emerald-100',
  warning: 'bg-amber-500 ring-amber-100',
  danger: 'bg-red-600 ring-red-100',
};

export interface TimelineEntry {
  id: string;
  title: string;
  description?: ReactNode;
  timestamp: string;
  meta?: ReactNode;
  tone?: TimelineTone;
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="space-y-0">
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;
        return (
          <li key={entry.id} className="flex gap-3">
            <div className="flex w-3 shrink-0 flex-col items-center pt-1.5">
              <span
                className={clsx(
                  'h-2.5 w-2.5 shrink-0 rounded-full ring-4',
                  TONES[entry.tone ?? 'default'],
                )}
                aria-hidden="true"
              />
              {!isLast ? <span className="mt-1 w-px flex-1 bg-line" aria-hidden="true" /> : null}
            </div>
            <div className={clsx('min-w-0 flex-1', isLast ? 'pb-0' : 'pb-5')}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-medium text-slate-800">{entry.title}</p>
                <p
                  className="text-xs text-slate-500 tabular"
                  title={formatDateTime(entry.timestamp)}
                >
                  {formatRelative(entry.timestamp)}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 tabular">
                {formatDateTime(entry.timestamp)}
              </p>
              {entry.description ? (
                <div className="mt-1 text-sm text-slate-600">{entry.description}</div>
              ) : null}
              {entry.meta ? <div className="mt-1.5 flex flex-wrap gap-2">{entry.meta}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
