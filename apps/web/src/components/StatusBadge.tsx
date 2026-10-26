import clsx from 'clsx';
import type { ReactNode } from 'react';

import {
  CORRESPONDENCE_STATUS_LABELS,
  DIRECTION_LABELS,
  PUBLIC_STATUS_LABELS,
  RECIPIENT_ACTION_LABELS,
  ROUTE_STATUS_LABELS,
} from '@/lib/labels';
import type {
  CorrespondenceStatus,
  Direction,
  PublicStatus,
  RecipientAction,
  RouteRecipientStatus,
} from '@/lib/types';

const BASE =
  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap';

const CORRESPONDENCE_TONES: Record<CorrespondenceStatus, string> = {
  REGISTRADA: 'border-amber-200 bg-amber-50 text-amber-800',
  EN_TRAMITE: 'border-blue-200 bg-blue-50 text-blue-800',
  ATENDIDA: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  ARCHIVADA: 'border-slate-200 bg-slate-100 text-slate-600',
};

const ROUTE_TONES: Record<RouteRecipientStatus, string> = {
  PENDIENTE: 'border-amber-200 bg-amber-50 text-amber-800',
  RECIBIDO: 'border-sky-200 bg-sky-50 text-sky-800',
  CLASIFICADO: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  DESPACHADO: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

const ACTION_TONES: Record<RecipientAction, string> = {
  URGENTE: 'border-red-200 bg-red-50 text-red-700',
  ARCHIVAR: 'border-slate-200 bg-slate-100 text-slate-700',
  PREPARAR_RESPUESTA: 'border-unior-200 bg-unior-50 text-unior-800',
};

const PUBLIC_TONES: Record<PublicStatus, string> = {
  RECIBIDO: 'border-amber-200 bg-amber-50 text-amber-800',
  EN_CURSO: 'border-blue-200 bg-blue-50 text-blue-800',
  FINALIZADO: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  ARCHIVADO: 'border-slate-200 bg-slate-100 text-slate-600',
};

const DOT_TONES: Record<CorrespondenceStatus, string> = {
  REGISTRADA: 'bg-amber-500',
  EN_TRAMITE: 'bg-blue-600',
  ATENDIDA: 'bg-emerald-600',
  ARCHIVADA: 'bg-slate-400',
};

export function StatusBadge({
  status,
  className,
}: {
  status: CorrespondenceStatus;
  className?: string;
}) {
  return (
    <span className={clsx(BASE, CORRESPONDENCE_TONES[status], className)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', DOT_TONES[status])} aria-hidden="true" />
      {CORRESPONDENCE_STATUS_LABELS[status]}
    </span>
  );
}

export function RouteStatusBadge({
  status,
  className,
}: {
  status: RouteRecipientStatus;
  className?: string;
}) {
  return (
    <span className={clsx(BASE, ROUTE_TONES[status], className)}>
      {ROUTE_STATUS_LABELS[status]}
    </span>
  );
}

export function ActionBadge({
  action,
  className,
}: {
  action: RecipientAction | null;
  className?: string;
}) {
  if (!action) return null;
  return (
    <span className={clsx(BASE, ACTION_TONES[action], className)}>
      {RECIPIENT_ACTION_LABELS[action]}
    </span>
  );
}

export function PublicStatusBadge({
  status,
  label,
  className,
}: {
  status: PublicStatus;
  label?: string;
  className?: string;
}) {
  return (
    <span className={clsx(BASE, PUBLIC_TONES[status], className)}>
      {label ?? PUBLIC_STATUS_LABELS[status]}
    </span>
  );
}

export function DirectionBadge({
  direction,
  className,
}: {
  direction: Direction;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        BASE,
        direction === 'INTERNA'
          ? 'border-unior-200 bg-unior-50 text-unior-800'
          : 'border-gold-200 bg-gold-50 text-gold-700',
        className,
      )}
    >
      {DIRECTION_LABELS[direction]}
    </span>
  );
}

export function OverdueBadge({ hours, className }: { hours?: number | null; className?: string }) {
  return (
    <span
      className={clsx(BASE, 'border-red-200 bg-red-50 text-red-700', className)}
      title={hours ? `Demora acumulada: ${hours} h sobre el umbral` : 'Tramo demorado'}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-red-600" aria-hidden="true" />
      {hours ? `Demorado +${Math.round(hours)} h` : 'Demorado'}
    </span>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md border border-line bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600',
        className,
      )}
    >
      {children}
    </span>
  );
}
