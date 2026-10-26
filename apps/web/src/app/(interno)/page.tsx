'use client';

import clsx from 'clsx';
import {
  ArrowRight,
  CalendarPlus,
  Clock,
  FilePlus2,
  FolderOpen,
  Gauge,
  Inbox,
  RefreshCw,
  ScrollText,
  TimerOff,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiErrorAlert, InlineAlert } from '@/components/Alert';
import { Button, LinkButton } from '@/components/Button';
import { Card, CardBody, CardHeader, MetricCard } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { OverdueBadge, StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatHours, formatHoursShort, formatNumber, formatRelative } from '@/lib/format';
import { CORRESPONDENCE_STATUS_LABELS } from '@/lib/labels';
import type {
  CorrespondenceListItem,
  CorrespondenceStatus,
  OverdueSegment,
  TrackingStats,
} from '@/lib/types';

const STATUS_ORDER: CorrespondenceStatus[] = ['REGISTRADA', 'EN_TRAMITE', 'ATENDIDA', 'ARCHIVADA'];

const STATUS_BAR: Record<CorrespondenceStatus, string> = {
  REGISTRADA: 'bg-amber-500',
  EN_TRAMITE: 'bg-blue-600',
  ATENDIDA: 'bg-emerald-600',
  ARCHIVADA: 'bg-slate-400',
};

interface QuickAction {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TrackingStats | null>(null);
  const [recent, setRecent] = useState<CorrespondenceListItem[]>([]);
  const [overdue, setOverdue] = useState<OverdueSegment[]>([]);
  const [thresholdHours, setThresholdHours] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const role = user?.role;
  const canSeeOverdue = role === 'ADMIN' || role === 'RECEPCION' || role === 'SEGUIMIENTO';
  const canCreate = role === 'ADMIN' || role === 'RECEPCION';
  const canAudit = role === 'ADMIN' || role === 'SEGUIMIENTO';
  const isAdmin = role === 'ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, recentData] = await Promise.all([
        api.tracking.stats(),
        api.correspondences.list({ page: 1, pageSize: 5 }),
      ]);
      setStats(statsData);
      setRecent(recentData.data);
      setThresholdHours(statsData.thresholdHours);

      if (canSeeOverdue) {
        try {
          const overdueData = await api.tracking.overdue({ page: 1, pageSize: 5 });
          setOverdue(overdueData.data);
          setThresholdHours(overdueData.thresholdHours);
        } catch {
          setOverdue([]);
        }
      }
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [canSeeOverdue]);

  useEffect(() => {
    void load();
  }, [load]);

  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = [];
    if (canCreate) {
      actions.push({
        href: '/correspondencias/nueva',
        label: 'Registrar correspondencia',
        description: 'Datos del remitente y hoja de ruta.',
        icon: FilePlus2,
      });
    }
    actions.push({
      href: '/bandeja',
      label: 'Mi bandeja',
      description: 'Tramos asignados pendientes de atención.',
      icon: Inbox,
    });
    actions.push({
      href: '/correspondencias',
      label: 'Buscar correspondencia',
      description: 'Listado con filtros y búsqueda.',
      icon: FolderOpen,
    });
    if (canSeeOverdue) {
      actions.push({
        href: '/demorados',
        label: 'Tramos demorados',
        description: 'Tramos que superan el umbral configurado.',
        icon: TimerOff,
      });
    }
    if (canAudit) {
      actions.push({
        href: '/auditoria',
        label: 'Auditoría',
        description: 'Eventos registrados en el sistema.',
        icon: ScrollText,
      });
    }
    if (isAdmin) {
      actions.push({
        href: '/usuarios',
        label: 'Usuarios',
        description: 'Altas, roles y estados.',
        icon: Users,
      });
    }
    return actions;
  }, [canCreate, canSeeOverdue, canAudit, isAdmin]);

  const total = stats?.total ?? 0;
  const overdueCount = stats?.overdue ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Panel de seguimiento"
        title={user ? `Bienvenido/a, ${user.name}` : 'Panel de seguimiento'}
        description="Resumen institucional del registro y seguimiento de correspondencia. Los indicadores se calculan en el servidor."
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

      {overdueCount > 0 && thresholdHours ? (
        <InlineAlert tone="warning" title="Existen trámites con demora">
          {overdueCount} tramo{overdueCount === 1 ? '' : 's'} supera
          {overdueCount === 1 ? '' : 'n'} el umbral de {thresholdHours} h.{' '}
          {canSeeOverdue ? (
            <Link href="/demorados" className="font-semibold underline underline-offset-2">
              Revisar demorados
            </Link>
          ) : null}
        </InlineAlert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Correspondencias"
          value={loading ? '—' : formatNumber(stats?.total)}
          hint="Registros visibles según su alcance"
          icon={FolderOpen}
          loading={loading}
        />
        <MetricCard
          label="Registradas hoy"
          value={loading ? '—' : formatNumber(stats?.registeredToday)}
          hint="Jornada actual en horario institucional"
          icon={CalendarPlus}
          tone="info"
          loading={loading}
        />
        <MetricCard
          label="En trámite"
          value={loading ? '—' : formatNumber(stats?.byStatus?.EN_TRAMITE)}
          hint="Con tramos en atención"
          icon={Clock}
          tone="warning"
          loading={loading}
        />
        <MetricCard
          label="Demorados"
          value={loading ? '—' : formatNumber(stats?.overdue)}
          hint={thresholdHours ? `Umbral: ${thresholdHours} h por tramo` : 'Umbral configurable'}
          icon={TimerOff}
          tone={overdueCount > 0 ? 'danger' : 'success'}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Últimas correspondencias"
            description="Los registros más recientes visibles para su rol."
            icon={TrendingUp}
            actions={
              <Link
                href="/correspondencias"
                className="inline-flex items-center gap-1 text-xs font-medium text-unior-700 hover:underline"
              >
                Ver todas
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          />
          {loading ? (
            <div className="divide-y divide-line">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="w-2/3 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="Aún no hay correspondencias"
              description={
                canCreate
                  ? 'Registre la primera correspondencia para iniciar el seguimiento.'
                  : 'Cuando se registren documentos aparecerán en este panel.'
              }
              action={
                canCreate ? (
                  <LinkButton href="/correspondencias/nueva" size="sm">
                    Registrar correspondencia
                  </LinkButton>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/correspondencias/${item.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 transition-colors hover:bg-slate-50/70"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tabular text-unior-700">
                        {item.trackingNumber}
                      </p>
                      <p className="truncate text-sm font-medium text-slate-800">{item.subject}</p>
                      <p className="truncate text-xs text-slate-500">
                        {item.senderName}
                        {item.senderOrganization ? ` · ${item.senderOrganization}` : ''} ·{' '}
                        {formatRelative(item.registeredAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.hasOverdueSegment ? <OverdueBadge /> : null}
                      <StatusBadge status={item.currentStatus} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Distribución por estado" icon={Gauge} />
          <CardBody className="space-y-3">
            {STATUS_ORDER.map((status) => {
              const count = stats?.byStatus?.[status] ?? 0;
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">
                      {CORRESPONDENCE_STATUS_LABELS[status]}
                    </span>
                    <span className="tabular text-slate-500">
                      {loading ? '—' : `${formatNumber(count)} · ${percent}%`}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={clsx('h-full rounded-full transition-all', STATUS_BAR[status])}
                      style={{ width: `${loading ? 0 : percent}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="mt-4 flex items-center justify-between rounded-lg bg-unior-50/70 px-3 py-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-unior-700">
                  Tiempo promedio de atención
                </p>
                <p className="text-lg font-semibold text-unior-900">
                  {loading ? '—' : formatHoursShort(stats?.averageAttentionHours)}
                </p>
              </div>
              <Clock className="h-5 w-5 text-unior-600" aria-hidden="true" />
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Demorados destacados"
            description={
              thresholdHours
                ? `Tramos abiertos que superan ${thresholdHours} h desde su último movimiento.`
                : 'Tramos abiertos que superan el umbral configurado.'
            }
            icon={TimerOff}
            actions={
              canSeeOverdue ? (
                <Link
                  href="/demorados"
                  className="inline-flex items-center gap-1 text-xs font-medium text-unior-700 hover:underline"
                >
                  Ver todos
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : undefined
            }
          />
          {!canSeeOverdue ? (
            <EmptyState
              icon={TimerOff}
              title="Información no disponible para su rol"
              description="Los indicadores de demora están disponibles para recepción, seguimiento y administración."
            />
          ) : loading ? (
            <div className="divide-y divide-line">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="w-2/3 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : overdue.length === 0 ? (
            <EmptyState
              icon={TimerOff}
              title="Sin tramos demorados"
              description="Ningún tramo abierto supera el umbral configurado en este momento."
            />
          ) : (
            <ul className="divide-y divide-line">
              {overdue.map((item) => (
                <li key={item.recipientId}>
                  <Link
                    href={`/correspondencias/${item.correspondenceId}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 transition-colors hover:bg-red-50/40"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tabular text-unior-700">
                        {item.trackingNumber} · Tramo {item.recipientSequence}
                      </p>
                      <p className="truncate text-sm font-medium text-slate-800">{item.subject}</p>
                      <p className="truncate text-xs text-slate-500">
                        Responsable: {item.assigneeName} · desde {formatRelative(item.since)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <OverdueBadge hours={item.hoursElapsed} />
                      <span className="text-xs font-semibold tabular text-red-700">
                        {formatHours(item.hoursElapsed)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Accesos rápidos" description="Según su rol." icon={ArrowRight} />
          <CardBody className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-start gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors hover:border-unior-200 hover:bg-unior-50/50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-unior-50 text-unior-700">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800">{action.label}</span>
                    <span className="block text-xs text-slate-500">{action.description}</span>
                  </span>
                </Link>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
