'use client';

import { RefreshCw, ScrollText, ShieldAlert, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ApiErrorAlert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { Input, Select } from '@/components/Input';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { RoleBadge } from '@/components/RoleBadge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatRelative } from '@/lib/format';
import { useDebouncedValue } from '@/lib/hooks';
import type { AuditEntry, PaginationMeta } from '@/lib/types';

const EMPTY_META: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

const ENTITY_OPTIONS = [
  'Correspondence',
  'RouteSheet',
  'RouteRecipient',
  'Attachment',
  'User',
  'PublicTrackingToken',
  'Auth',
];

export default function AuditoriaPage() {
  const { user } = useAuth();
  const canView = user?.role === 'ADMIN' || user?.role === 'SEGUIMIENTO';

  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [actorId, setActorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const debouncedAction = useDebouncedValue(action, 400);
  const debouncedActor = useDebouncedValue(actorId, 400);

  const hasFilters =
    Boolean(debouncedAction.trim()) ||
    entityType !== '' ||
    Boolean(debouncedActor.trim()) ||
    from !== '' ||
    to !== '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.audit.list({
        page,
        pageSize,
        action: debouncedAction.trim() || undefined,
        entityType: entityType || undefined,
        actorId: debouncedActor.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(response.data);
      setMeta(response.meta);
    } catch (caught) {
      setError(caught);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedAction, entityType, debouncedActor, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedAction, entityType, debouncedActor, from, to, pageSize]);

  const clearFilters = () => {
    setAction('');
    setEntityType('');
    setActorId('');
    setFrom('');
    setTo('');
  };

  if (!canView) {
    return (
      <Card>
        <EmptyState
          icon={ShieldAlert}
          title="Acceso restringido"
          description="La auditoría está disponible únicamente para administración y seguimiento."
        />
      </Card>
    );
  }

  const columns: Column<AuditEntry>[] = [
    {
      key: 'occurredAt',
      header: 'Fecha y hora',
      render: (row) => (
        <div>
          <p className="text-xs tabular text-slate-700">{formatDateTime(row.occurredAt)}</p>
          <p className="text-[11px] text-slate-500">{formatRelative(row.occurredAt)}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Acción',
      render: (row) => (
        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
          {row.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Entidad',
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-slate-700">{row.entityType}</p>
          <p
            className="max-w-[140px] truncate font-mono text-[11px] text-slate-400"
            title={row.entityId}
          >
            {row.entityId}
          </p>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (row) =>
        row.actor ? (
          <div className="space-y-1">
            <p className="text-sm text-slate-700">{row.actor.name}</p>
            <RoleBadge role={row.actor.role} />
          </div>
        ) : (
          <span className="text-xs text-slate-400">Sistema</span>
        ),
    },
    {
      key: 'ip',
      header: 'Origen',
      render: (row) => <span className="text-xs tabular text-slate-500">{row.ip ?? '—'}</span>,
    },
    {
      key: 'requestId',
      header: 'Solicitud',
      render: (row) => (
        <span
          className="inline-block max-w-[110px] truncate font-mono text-[11px] text-slate-400"
          title={row.requestId ?? undefined}
        >
          {row.requestId ?? '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Control interno"
        title="Auditoría"
        description="Eventos sensibles registrados por el servidor con actor, entidad y referencia de solicitud. Solo lectura."
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

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Input
              label="Acción"
              placeholder="correspondence.create"
              value={action}
              onChange={(event) => setAction(event.target.value)}
              autoComplete="off"
              hint="Coincidencia parcial sobre el nombre de la acción."
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              label="Entidad"
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
            >
              <option value="">Todas</option>
              {ENTITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div className="lg:col-span-3">
            <Input
              label="ID del actor"
              placeholder="UUID del usuario"
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="lg:col-span-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Desde"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                max={to || undefined}
              />
              <Input
                label="Hasta"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                min={from || undefined}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p className="text-xs text-slate-500">
            {meta.total} evento{meta.total === 1 ? '' : 's'} registrado
            {meta.total === 1 ? '' : 's'}
          </p>
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              icon={<X className="h-4 w-4" aria-hidden="true" />}
            >
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          caption="Registro de auditoría"
          skeletonRows={8}
          empty={
            <EmptyState
              icon={ScrollText}
              title={hasFilters ? 'Sin eventos con estos filtros' : 'Sin eventos registrados'}
              description={
                hasFilters
                  ? 'Ajuste los criterios o limpie los filtros para ver más resultados.'
                  : 'Los eventos aparecerán aquí a medida que se operen correspondencias y usuarios.'
              }
              action={
                hasFilters ? (
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            />
          }
        />
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          pageSize={meta.pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[20, 50, 100]}
          disabled={loading}
        />
      </Card>
    </div>
  );
}
