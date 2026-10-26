'use client';

import clsx from 'clsx';
import { ArrowRight, CircleAlert, Inbox, RefreshCw, TimerOff, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiErrorAlert, InlineAlert } from '@/components/Alert';
import { Button, LinkButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { CardSkeleton } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { SegmentActions } from '@/components/SegmentActions';
import {
  ActionBadge,
  DirectionBadge,
  OverdueBadge,
  RouteStatusBadge,
  StatusBadge,
} from '@/components/StatusBadge';
import { api } from '@/lib/api';
import { formatDateTime, formatHours, formatRelative } from '@/lib/format';
import type { MySegment } from '@/lib/types';

type FilterKey = 'todos' | 'pendientes' | 'demorados';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendientes', label: 'Solo pendientes' },
  { key: 'demorados', label: 'Demorados' },
];

export default function BandejaPage() {
  const [segments, setSegments] = useState<MySegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState<FilterKey>('todos');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.recipients.mine();
      setSegments(data);
    } catch (caught) {
      setError(caught);
      setSegments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      todos: segments.length,
      pendientes: segments.filter((segment) => segment.status !== 'DESPACHADO').length,
      demorados: segments.filter((segment) => segment.isOverdue).length,
    }),
    [segments],
  );

  const visible = useMemo(() => {
    if (filter === 'pendientes')
      return segments.filter((segment) => segment.status !== 'DESPACHADO');
    if (filter === 'demorados') return segments.filter((segment) => segment.isOverdue);
    return segments;
  }, [segments, filter]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Destinatario interno"
        title="Mi bandeja"
        description="Tramos asignados a su usuario o a su departamento. Las horas de espera y la demora las calcula el servidor."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void load()}
            loading={loading}
            icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          >
            Actualizar
          </Button>
        }
      />

      {error ? <ApiErrorAlert error={error} /> : null}

      {counts.demorados > 0 ? (
        <InlineAlert tone="warning" title="Tiene tramos demorados">
          {counts.demorados} tramo{counts.demorados === 1 ? '' : 's'} asignado
          {counts.demorados === 1 ? '' : 's'} supera{counts.demorados === 1 ? '' : 'n'} el umbral
          configurado. Priorice su atención.
        </InlineAlert>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            aria-pressed={filter === item.key}
            className={clsx(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              filter === item.key
                ? 'border-unior-900 bg-unior-900 text-white'
                : 'border-line bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {item.label}
            <span
              className={clsx(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular',
                filter === item.key ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600',
              )}
            >
              {counts[item.key]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton key={index} lines={4} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title={
              filter === 'demorados'
                ? 'Ningún tramo demorado'
                : filter === 'pendientes'
                  ? 'No tiene tramos pendientes'
                  : 'Su bandeja está vacía'
            }
            description={
              filter === 'demorados'
                ? 'Todos sus tramos están dentro del umbral de atención.'
                : 'Cuando le asignen una correspondencia aparecerá aquí para registrar recepción, clasificación y salida.'
            }
            action={
              <LinkButton href="/correspondencias" variant="secondary" size="sm">
                Ver correspondencias
              </LinkButton>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((segment) => (
            <Card key={segment.id} className="overflow-hidden">
              <div className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-unior-50 px-2 py-0.5 text-[11px] font-semibold tabular text-unior-800">
                        {segment.correspondence.trackingNumber}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        Tramo {segment.sequence}
                      </span>
                      <RouteStatusBadge status={segment.status} />
                      <ActionBadge action={segment.action} />
                      {segment.isOverdue ? <OverdueBadge /> : null}
                    </div>
                    <Link
                      href={`/correspondencias/${segment.correspondence.id}`}
                      className="mt-1.5 block text-base font-semibold text-unior-900 hover:underline"
                    >
                      {segment.correspondence.subject}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {segment.correspondence.senderName}
                      {segment.correspondence.senderOrganization
                        ? ` · ${segment.correspondence.senderOrganization}`
                        : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-right">
                    <DirectionBadge direction={segment.correspondence.direction} />
                    <StatusBadge status={segment.correspondence.currentStatus} />
                  </div>
                </div>

                {segment.internalNotes ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-line">
                    <span className="font-semibold text-slate-500">Nota interna: </span>
                    {segment.internalNotes}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <dt className="text-slate-500">Registrada</dt>
                      <dd className="tabular text-slate-700">
                        {formatDateTime(segment.correspondence.registeredAt)}
                      </dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <dt className="text-slate-500">Espera</dt>
                      <dd
                        className={clsx(
                          'tabular font-medium',
                          segment.isOverdue ? 'text-red-700' : 'text-slate-700',
                        )}
                      >
                        {formatHours(segment.waitingHours)}
                      </dd>
                    </div>
                    {segment.receivedAt ? (
                      <div className="flex items-center gap-1.5">
                        <dt className="text-slate-500">Recibida</dt>
                        <dd className="tabular text-slate-700">
                          {formatRelative(segment.receivedAt)}
                        </dd>
                      </div>
                    ) : null}
                    {segment.dispatchedAt ? (
                      <div className="flex items-center gap-1.5">
                        <dt className="text-slate-500">Despachada</dt>
                        <dd className="tabular text-slate-700">
                          {formatRelative(segment.dispatchedAt)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/correspondencias/${segment.correspondence.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-unior-700 hover:underline"
                    >
                      Ver detalle
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    <SegmentActions
                      segment={{
                        id: segment.id,
                        sequence: segment.sequence,
                        status: segment.status,
                        canAct: segment.canAct,
                        allowedActions: segment.allowedActions,
                      }}
                      onDone={() => void load()}
                      showBlockedHint={false}
                    />
                  </div>
                </div>

                {!segment.canAct && segment.status !== 'DESPACHADO' ? (
                  <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
                    {segment.isOverdue ? (
                      <TriangleAlert
                        className="mt-0.5 h-3 w-3 shrink-0 text-amber-600"
                        aria-hidden="true"
                      />
                    ) : (
                      <CircleAlert
                        className="mt-0.5 h-3 w-3 shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                    )}
                    El servidor no habilita acciones para este tramo en su estado actual.
                  </p>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && visible.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <TimerOff className="h-3.5 w-3.5" aria-hidden="true" />
          La demora se calcula en el servidor con el umbral institucional configurado.
        </p>
      ) : null}
    </div>
  );
}
