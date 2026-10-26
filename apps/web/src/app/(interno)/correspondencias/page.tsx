'use client';

import clsx from 'clsx';
import { ArrowRight, Filter, FolderOpen, Plus, SearchX, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiErrorAlert } from '@/components/Alert';
import { Button, LinkButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { CheckField, Input, Select } from '@/components/Input';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { DirectionBadge, OverdueBadge, StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatRelative } from '@/lib/format';
import { useDebouncedValue } from '@/lib/hooks';
import type {
  CorrespondenceListItem,
  CorrespondenceStatus,
  Direction,
  PaginationMeta,
} from '@/lib/types';

const EMPTY_META: PaginationMeta = { page: 1, pageSize: 10, total: 0, totalPages: 1 };

export default function CorrespondenciasPage() {
  const { user } = useAuth();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'RECEPCION';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CorrespondenceStatus | ''>('');
  const [direction, setDirection] = useState<Direction | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<CorrespondenceListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const debouncedSearch = useDebouncedValue(search, 400);

  const hasFilters =
    Boolean(debouncedSearch.trim()) ||
    status !== '' ||
    direction !== '' ||
    from !== '' ||
    to !== '' ||
    overdue ||
    mine;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.correspondences.list({
        page,
        pageSize,
        search: debouncedSearch.trim() || undefined,
        status: status || undefined,
        direction: direction || undefined,
        from: from || undefined,
        to: to || undefined,
        overdue: overdue || undefined,
        mine: mine || undefined,
      });
      setData(response.data);
      setMeta(response.meta);
    } catch (caught) {
      setError(caught);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, status, direction, from, to, overdue, mine]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, direction, from, to, overdue, mine, pageSize]);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setDirection('');
    setFrom('');
    setTo('');
    setOverdue(false);
    setMine(false);
  };

  const columns = useMemo<Column<CorrespondenceListItem>[]>(
    () => [
      {
        key: 'trackingNumber',
        header: 'Correlativo',
        render: (row) => (
          <Link
            href={`/correspondencias/${row.id}`}
            className="text-xs font-semibold tabular text-unior-700 underline-offset-4 hover:underline"
          >
            {row.trackingNumber}
          </Link>
        ),
      },
      {
        key: 'subject',
        header: 'Asunto',
        className: 'max-w-[340px]',
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{row.subject}</p>
            <p className="truncate text-xs text-slate-500">
              {row.senderName}
              {row.senderOrganization ? ` · ${row.senderOrganization}` : ''}
            </p>
          </div>
        ),
      },
      {
        key: 'direction',
        header: 'Tipo',
        render: (row) => <DirectionBadge direction={row.direction} />,
      },
      {
        key: 'status',
        header: 'Estado',
        render: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={row.currentStatus} />
            {row.hasOverdueSegment ? <OverdueBadge /> : null}
          </div>
        ),
      },
      {
        key: 'progress',
        header: 'Tramos',
        align: 'center',
        render: (row) => (
          <span className="text-xs tabular text-slate-600">
            {row.recipientsCompleted}/{row.recipientsTotal}
          </span>
        ),
      },
      {
        key: 'registeredAt',
        header: 'Registro',
        render: (row) => (
          <div>
            <p className="text-xs text-slate-700">{formatDate(row.registeredAt)}</p>
            <p className="text-[11px] text-slate-500">{formatRelative(row.registeredAt)}</p>
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Abrir',
        align: 'right',
        srOnlyHeader: true,
        render: (row) => (
          <Link
            href={`/correspondencias/${row.id}`}
            aria-label={`Abrir ${row.trackingNumber}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-unior-700 hover:underline"
          >
            Detalle
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ),
      },
    ],
    [],
  );

  const emptyContent = (
    <EmptyState
      icon={hasFilters ? SearchX : FolderOpen}
      title={hasFilters ? 'Sin resultados con estos filtros' : 'Todavía no hay correspondencias'}
      description={
        hasFilters
          ? 'Ajuste los criterios de búsqueda o limpie los filtros para ver más registros.'
          : canCreate
            ? 'Registre la primera correspondencia para iniciar la hoja de ruta digital.'
            : 'Cuando se registren documentos aparecerán en este listado.'
      }
      action={
        hasFilters ? (
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        ) : canCreate ? (
          <LinkButton
            href="/correspondencias/nueva"
            size="sm"
            icon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            Nueva correspondencia
          </LinkButton>
        ) : undefined
      }
    />
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Registro interno"
        title="Correspondencias"
        description="Búsqueda y filtros sobre los registros visibles según su rol y ámbito. El resultado lo determina el servidor."
        actions={
          canCreate ? (
            <LinkButton
              href="/correspondencias/nueva"
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Nueva correspondencia
            </LinkButton>
          ) : null
        }
      />

      {error ? <ApiErrorAlert error={error} /> : null}

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Input
              label="Buscar"
              placeholder="Correlativo, asunto o remitente"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoComplete="off"
              aria-label="Buscar correspondencias"
            />
          </div>
          <div className="lg:col-span-2">
            <Select
              label="Estado"
              value={status}
              onChange={(event) => setStatus(event.target.value as CorrespondenceStatus | '')}
            >
              <option value="">Todos</option>
              <option value="REGISTRADA">Registrada</option>
              <option value="EN_TRAMITE">En trámite</option>
              <option value="ATENDIDA">Atendida</option>
              <option value="ARCHIVADA">Archivada</option>
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Select
              label="Tipo"
              value={direction}
              onChange={(event) => setDirection(event.target.value as Direction | '')}
            >
              <option value="">Todos</option>
              <option value="INTERNA">Interna</option>
              <option value="EXTERNA">Externa</option>
            </Select>
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex flex-wrap items-center gap-4">
            <CheckField
              label="Solo demorados"
              checked={overdue}
              onChange={setOverdue}
              description="Tramos que superan el umbral."
            />
            <CheckField
              label="Solo mis tramos asignados"
              checked={mine}
              onChange={setMine}
              description="Correspondencias donde tengo un tramo."
            />
          </div>
          <div className="flex items-center gap-2">
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
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              {meta.total} resultado{meta.total === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="hidden md:block">
          <DataTable
            columns={columns}
            rows={data}
            rowKey={(row) => row.id}
            loading={loading}
            empty={emptyContent}
            caption="Listado de correspondencias"
            skeletonRows={pageSize > 10 ? 10 : pageSize}
          />
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="card p-4">
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton mt-2 h-4 w-full" />
                  <div className="skeleton mt-2 h-3 w-2/3" />
                </div>
              ))
            : data.length === 0
              ? emptyContent
              : data.map((item) => (
                  <Link
                    key={item.id}
                    href={`/correspondencias/${item.id}`}
                    className={clsx(
                      'block rounded-xl border border-line bg-white p-4 transition-colors',
                      'hover:border-unior-200 hover:bg-unior-50/30',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold tabular text-unior-700">
                          {item.trackingNumber}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm font-medium text-slate-800">
                          {item.subject}
                        </p>
                      </div>
                      <StatusBadge status={item.currentStatus} />
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {item.senderName}
                      {item.senderOrganization ? ` · ${item.senderOrganization}` : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <DirectionBadge direction={item.direction} />
                      <span className="tabular">
                        Tramos {item.recipientsCompleted}/{item.recipientsTotal}
                      </span>
                      <span>{formatDate(item.registeredAt)}</span>
                      {item.hasOverdueSegment ? <OverdueBadge /> : null}
                    </div>
                  </Link>
                ))}
        </div>

        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          pageSize={meta.pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          disabled={loading}
        />
      </Card>
    </div>
  );
}
