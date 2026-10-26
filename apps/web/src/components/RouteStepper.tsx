import clsx from 'clsx';
import { Clock, Inbox, Send, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatDateTime, formatDuration, formatHours } from '@/lib/format';
import type { RouteRecipientDetail } from '@/lib/types';
import { ActionBadge, OverdueBadge, RouteStatusBadge } from './StatusBadge';

function DateCell({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  icon: typeof Clock;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </p>
      <p className={clsx('mt-0.5 text-xs tabular', value ? 'text-slate-700' : 'text-slate-400')}>
        {value ? formatDateTime(value) : 'Pendiente'}
      </p>
    </div>
  );
}

export function RouteStepper({
  recipients,
  renderActions,
}: {
  recipients: RouteRecipientDetail[];
  renderActions?: (recipient: RouteRecipientDetail) => ReactNode;
}) {
  if (recipients.length === 0) {
    return (
      <p className="text-sm text-slate-500">Esta correspondencia no tiene tramos registrados.</p>
    );
  }

  const ordered = [...recipients].sort((a, b) => a.sequence - b.sequence);

  return (
    <ol className="space-y-0">
      {ordered.map((recipient, index) => {
        const isLast = index === ordered.length - 1;
        const isActive = recipient.status !== 'DESPACHADO';
        const actions = renderActions?.(recipient);

        return (
          <li key={recipient.id} className="relative pl-11">
            {!isLast ? (
              <span
                className="absolute left-[15px] top-9 bottom-0 w-px bg-line"
                aria-hidden="true"
              />
            ) : null}
            <span
              className={clsx(
                'absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold',
                isActive
                  ? 'border-unior-200 bg-unior-50 text-unior-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700',
              )}
              aria-hidden="true"
            >
              {recipient.sequence}
            </span>

            <div
              className={clsx(
                'mb-4 rounded-xl border p-4',
                isActive ? 'border-unior-200 bg-unior-50/40' : 'border-line bg-white',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Tramo {recipient.sequence}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <UserRound className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    {recipient.assignee.name}
                    {recipient.assignee.department ? (
                      <span className="font-normal text-slate-500">
                        · {recipient.assignee.department}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">
                    {recipient.assignee.type === 'DEPARTMENT'
                      ? 'Asignado a departamento'
                      : 'Asignado a usuario'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <RouteStatusBadge status={recipient.status} />
                  <ActionBadge action={recipient.action} />
                  {recipient.isOverdue ? <OverdueBadge hours={recipient.overdueHours} /> : null}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 border-t border-line/70 pt-3 sm:grid-cols-3">
                <DateCell label="Recepción" value={recipient.receivedAt} icon={Inbox} />
                <DateCell label="Clasificación" value={recipient.classifiedAt} icon={Clock} />
                <DateCell label="Salida" value={recipient.dispatchedAt} icon={Send} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>
                  Duración del tramo:{' '}
                  <span className="font-medium text-slate-700">
                    {formatDuration(recipient.durationMinutes)}
                  </span>
                </span>
                {recipient.isOverdue ? (
                  <span className="text-red-700">
                    Excede el umbral en {formatHours(recipient.overdueHours)}
                  </span>
                ) : null}
              </div>

              {recipient.internalNotes ? (
                <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600 ring-1 ring-line">
                  <span className="font-semibold text-slate-500">Nota interna: </span>
                  {recipient.internalNotes}
                </p>
              ) : null}

              {actions ? <div className="mt-3">{actions}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
