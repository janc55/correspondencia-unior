'use client';

import { BellRing, RefreshCw, ShieldAlert, TimerOff, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { ApiErrorAlert, InlineAlert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { OverdueBadge, RouteStatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatHours, formatRelative } from '@/lib/format';
import type { OverdueNotifyResult, OverdueSegment, PaginationMeta } from '@/lib/types';

const EMPTY_META: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

export default function DemoradosPage() {
  const { user } = useAuth();
  const canNotify = user?.role === 'ADMIN' || user?.role === 'SEGUIMIENTO';
  const canView =
    user?.role === 'ADMIN' || user?.role === 'RECEPCION' || user?.role === 'SEGUIMIENTO';

  const [rows, setRows] = useState<OverdueSegment[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [thresholdHours, setThresholdHours] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [notifying, setNotifying] = useState(false);
  const [notifyError, setNotifyError] = useState<unknown>(null);
  const [notifyResult, setNotifyResult] = useState<OverdueNotifyResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.tracking.overdue({ page, pageSize });
      setRows(response.data);
      setMeta(response.meta);
      setThresholdHours(response.thresholdHours);
    } catch (caught) {
      setError(caught);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleNotify = async () => {
    setNotifying(true);
    setNotifyError(null);
    setNotifyResult(null);
    try {
      const result = await api.tracking.notifyOverdue();
      setNotifyResult(result);
      void load();
    } catch (caught) {
      setNotifyError(caught);
    } finally {
      setNotifying(false);
    }
  };

  if (!canView) {
    return (
      <Card>
        <EmptyState
          icon={ShieldAlert}
          title="Acceso restringido"
          description="La lista de tramos demorados está disponible para recepción, seguimiento y administración."
        />
      </Card>
    );
  }

  const columns: Column<OverdueSegment>[] = [
    {
      key: 'trackingNumber',
      header: 'Correlativo',
      render: (row) => (
        <Link
          href={`/correspondencias/${row.correspondenceId}`}
          className="text-xs font-semibold tabular text-unior-700 underline-offset-4 hover:underline"
        >
          {row.trackingNumber}
        </Link>
      ),
    },
    {
      key: 'subject',
      header: 'Asunto',
      className: 'max-w-[320px]',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">{row.subject}</p>
          <p className="text-xs text-slate-500">Tramo {row.recipientSequence}</p>
        </div>
      ),
    },
    {
      key: 'assigneeName',
      header: 'Responsable',
      render: (row) => <span className="text-sm text-slate-700">{row.assigneeName}</span>,
    },
    {
      key: 'status',
      header: 'Estado del tramo',
      render: (row) => <RouteStatusBadge status={row.status} />,
    },
    {
      key: 'waiting',
      header: 'Espera',
      render: (row) => (
        <div>
          <p className="text-sm font-semibold tabular text-red-700">
            {formatHours(row.hoursElapsed)}
          </p>
          <p className="text-[11px] text-slate-500" title={formatDateTime(row.since)}>
            desde {formatRelative(row.since)}
          </p>
        </div>
      ),
    },
    {
      key: 'overdue',
      header: 'Demora',
      render: () => <OverdueBadge />,
    },
    {
      key: 'open',
      header: 'Abrir',
      align: 'right',
      srOnlyHeader: true,
      render: (row) => (
        <Link
          href={`/correspondencias/${row.correspondenceId}`}
          className="text-xs font-medium text-unior-700 hover:underline"
        >
          Ver detalle
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Seguimiento institucional"
        title="Tramos demorados"
        description="Tramos abiertos que superan el umbral configurado. El cálculo y el envío de alertas corresponden al servidor."
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
              <TimerOff className="h-3.5 w-3.5" aria-hidden="true" />
              Umbral: {thresholdHours ?? '—'} h
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void load()}
              loading={loading}
              icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            >
              Actualizar
            </Button>
            {canNotify ? (
              <Button
                size="sm"
                onClick={() => void handleNotify()}
                loading={notifying}
                icon={<BellRing className="h-4 w-4" aria-hidden="true" />}
              >
                Enviar alertas
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <ApiErrorAlert error={error} /> : null}
      {notifyError ? (
        <ApiErrorAlert error={notifyError} title="No se pudieron enviar las alertas" />
      ) : null}

      {notifyResult ? (
        <InlineAlert tone="info" title="Resultado del envío de alertas">
          Revisados: <strong>{notifyResult.checked}</strong> · Enviados:{' '}
          <strong>{notifyResult.sent}</strong> · Fallidos: <strong>{notifyResult.failed}</strong> ·
          Omitidos: <strong>{notifyResult.skipped}</strong>.{' '}
          {notifyResult.sent === 0 && notifyResult.skipped > 0
            ? 'Los envíos quedaron omitidos: el servidor SMTP no está configurado en este entorno.'
            : 'El envío de correo no bloquea el flujo principal.'}
        </InlineAlert>
      ) : null}

      {!loading && rows.length === 0 && !error ? (
        <InlineAlert tone="success" title="Sin demoras activas">
          Ningún tramo abierto supera el umbral de {thresholdHours ?? 24} h en su ámbito autorizado.
        </InlineAlert>
      ) : null}

      <Card className="overflow-hidden">
        <div className="hidden md:block">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.recipientId}
            loading={loading}
            caption="Tramos demorados"
            skeletonRows={5}
            empty={
              <EmptyState
                icon={TimerOff}
                title="No hay tramos demorados"
                description={`Ningún tramo abierto supera el umbral de ${thresholdHours ?? 24} h.`}
              />
            }
          />
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="card p-4">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton mt-2 h-4 w-full" />
                <div className="skeleton mt-2 h-3 w-1/2" />
              </div>
            ))
          ) : rows.length === 0 ? (
            <EmptyState
              icon={TimerOff}
              title="No hay tramos demorados"
              description={`Ningún tramo abierto supera el umbral de ${thresholdHours ?? 24} h.`}
            />
          ) : (
            rows.map((row) => (
              <Link
                key={row.recipientId}
                href={`/correspondencias/${row.correspondenceId}`}
                className="block rounded-xl border border-line bg-white p-4 transition-colors hover:border-unior-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tabular text-unior-700">
                      {row.trackingNumber}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-medium text-slate-800">
                      {row.subject}
                    </p>
                  </div>
                  <OverdueBadge />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Tramo {row.recipientSequence} · {row.assigneeName}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <RouteStatusBadge status={row.status} />
                  <span className="flex items-center gap-1 text-xs font-semibold tabular text-red-700">
                    <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatHours(row.hoursElapsed)} de espera
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          pageSize={meta.pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50]}
          disabled={loading}
        />
      </Card>

      {canNotify ? (
        <p className="text-xs text-slate-500">
          El envío de alertas notifica al equipo de seguimiento. Si el servidor SMTP no está
          configurado, los envíos se registran como omitidos y no bloquean el sistema.
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Solo administración y seguimiento pueden disparar las alertas por correo.
        </p>
      )}
    </div>
  );
}
