'use client';

import {
  Archive,
  ArrowLeft,
  Building2,
  CalendarClock,
  FileText,
  Hash,
  History,
  Info,
  Mail,
  RefreshCw,
  Route,
  TimerOff,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiErrorAlert, InlineAlert } from '@/components/Alert';
import { AttachmentList } from '@/components/AttachmentList';
import { Button, LinkButton } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Textarea } from '@/components/Input';
import { CardSkeleton, Skeleton } from '@/components/Loading';
import { ConfirmDialog } from '@/components/Modal';
import { PublicCodePanel } from '@/components/PublicCodePanel';
import { RouteStepper } from '@/components/RouteStepper';
import { SegmentActions } from '@/components/SegmentActions';
import { DirectionBadge, OverdueBadge, Pill, StatusBadge } from '@/components/StatusBadge';
import { Timeline, type TimelineEntry } from '@/components/Timeline';
import { useToast } from '@/components/Toast';
import { api, ApiError, describeError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatDuration, formatHours, formatRelative } from '@/lib/format';
import { CORRESPONDENCE_STATUS_LABELS, eventLabel } from '@/lib/labels';
import type { CorrespondenceDetail, TrackingEvent } from '@/lib/types';

function eventTone(eventType: string): TimelineEntry['tone'] {
  switch (eventType) {
    case 'RECEPCION':
      return 'info';
    case 'CLASIFICACION':
      return 'warning';
    case 'DESPACHO':
      return 'success';
    case 'ARCHIVADO':
      return 'default';
    default:
      return 'default';
  }
}

function eventDescription(event: TrackingEvent): string | null {
  const parts: string[] = [];
  if (event.fromStatus || event.toStatus) {
    parts.push(
      `${event.fromStatus ? CORRESPONDENCE_STATUS_LABELS[event.fromStatus] : 'Inicio'} → ${
        event.toStatus ? CORRESPONDENCE_STATUS_LABELS[event.toStatus] : '—'
      }`,
    );
  }
  if (event.recipientSequence) parts.push(`Tramo ${event.recipientSequence}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export default function DetalleCorrespondenciaPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { user } = useAuth();
  const toast = useToast();

  const [detail, setDetail] = useState<CorrespondenceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiveError, setArchiveError] = useState<unknown>(null);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotatedCode, setRotatedCode] = useState<string | null>(null);

  const role = user?.role;
  const canArchive = role === 'ADMIN' || role === 'SEGUIMIENTO';
  const canRotateCode = role === 'ADMIN' || role === 'RECEPCION' || role === 'SEGUIMIENTO';

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.correspondences.get(id);
      setDetail(data);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const canUpload = useMemo(() => {
    if (!detail) return false;
    if (role === 'ADMIN' || role === 'RECEPCION') return true;
    return detail.routeSheet.recipients.some(
      (recipient) => recipient.canAct && recipient.status !== 'DESPACHADO',
    );
  }, [detail, role]);

  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    if (!detail) return [];
    return detail.events.map((event) => {
      const description = eventDescription(event);
      return {
        id: event.id,
        title: eventLabel(event.eventType),
        description,
        timestamp: event.occurredAt,
        tone: eventTone(event.eventType),
        meta: event.actor ? <Pill>Responsable: {event.actor.name}</Pill> : undefined,
      };
    });
  }, [detail]);

  const handleArchive = async () => {
    if (!detail) return;
    setArchiveError(null);
    try {
      const updated = await api.correspondences.archive(detail.id, archiveReason);
      setDetail(updated);
      setArchiveOpen(false);
      setArchiveReason('');
      toast.success('Correspondencia archivada. El historial se conserva.');
    } catch (caught) {
      setArchiveError(caught);
    }
  };

  const handleRotate = async () => {
    if (!detail) return;
    setRotating(true);
    try {
      const publicAccess = await api.correspondences.rotatePublicCode(detail.id);
      setRotatedCode(publicAccess.code);
      setRotateOpen(false);
      toast.success('Código público regenerado. El código anterior fue revocado.');
      void load();
    } catch (caught) {
      toast.error(describeError(caught));
    } finally {
      setRotating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-6 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CardSkeleton lines={5} />
          </div>
          <CardSkeleton lines={4} />
        </div>
      </div>
    );
  }

  if (error) {
    const status = error instanceof ApiError ? error.status : 0;
    return (
      <div className="space-y-4">
        {status === 404 ? (
          <Card>
            <EmptyState
              icon={FileText}
              title="Correspondencia no encontrada"
              description="El registro no existe o no está disponible para su usuario."
              action={
                <LinkButton href="/correspondencias" variant="secondary">
                  Volver al listado
                </LinkButton>
              }
            />
          </Card>
        ) : (
          <>
            <ApiErrorAlert
              error={error}
              title={status === 403 ? 'Acceso fuera de su ámbito' : 'No se pudo cargar el detalle'}
            />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => void load()}>
                Reintentar
              </Button>
              <LinkButton href="/correspondencias" variant="ghost">
                Volver al listado
              </LinkButton>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!detail) return null;

  const recipients = detail.routeSheet.recipients;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/correspondencias"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-unior-700 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Volver al listado
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {canRotateCode && !rotatedCode ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRotateOpen(true)}
              icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            >
              Regenerar código público
            </Button>
          ) : null}
          {canArchive && !detail.isArchived ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setArchiveError(null);
                setArchiveOpen(true);
              }}
              icon={<Archive className="h-4 w-4" aria-hidden="true" />}
            >
              Archivar
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-unior-50 px-2 py-1 text-xs font-semibold tabular text-unior-800">
                <Hash className="h-3.5 w-3.5" aria-hidden="true" />
                {detail.trackingNumber}
              </span>
              <StatusBadge status={detail.currentStatus} />
              <DirectionBadge direction={detail.direction} />
              {detail.isArchived ? <Pill>Archivada</Pill> : null}
              {detail.metrics.overdueSegments > 0 ? <OverdueBadge /> : null}
            </div>
            <h1 className="mt-2 text-xl font-semibold text-unior-900 sm:text-2xl">
              {detail.subject}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Registrada el {formatDateTime(detail.registeredAt)} ·{' '}
              {formatRelative(detail.registeredAt)}
            </p>
          </div>

          <dl className="grid shrink-0 grid-cols-2 gap-3 text-xs sm:text-right">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Tiempo transcurrido
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-unior-900">
                {formatHours(detail.metrics.elapsedHours)}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Umbral por tramo
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-unior-900">
                {detail.metrics.thresholdHours} h
              </dd>
            </div>
          </dl>
        </div>

        {detail.isArchived ? (
          <div className="border-t border-line px-5 py-3">
            <InlineAlert tone="info" title="Correspondencia archivada">
              El registro se conserva con su historial completo; no admite nuevas acciones de
              trámite.
            </InlineAlert>
          </div>
        ) : null}
      </Card>

      {rotatedCode ? (
        <PublicCodePanel
          prominent
          trackingNumber={detail.trackingNumber}
          code={rotatedCode}
          notice="Este código reemplazó al anterior, que quedó revocado. Guárdelo: no se vuelve a mostrar."
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Hoja de ruta"
              description="Fechas y duraciones fijadas por el servidor. El orden corresponde a la secuencia."
              icon={Route}
            />
            <CardBody>
              <RouteStepper
                recipients={recipients}
                renderActions={(recipient) => (
                  <SegmentActions
                    segment={{
                      id: recipient.id,
                      sequence: recipient.sequence,
                      status: recipient.status,
                      canAct: recipient.canAct && !detail.isArchived,
                      allowedActions: recipient.allowedActions,
                    }}
                    onDone={() => void load()}
                    showBlockedHint={!detail.isArchived}
                  />
                )}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Historial de eventos"
              description="Registro auditable e inmutable de las transiciones."
              icon={History}
            />
            <CardBody>
              {timelineEntries.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Sin eventos registrados"
                  description="El historial aparecerá cuando se registren movimientos."
                />
              ) : (
                <Timeline entries={timelineEntries} />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Anexos"
              description="Documentos escaneados asociados a esta correspondencia."
              icon={FileText}
            />
            <CardBody>
              <AttachmentList
                attachments={detail.attachments}
                correspondenceId={detail.id}
                canUpload={canUpload && !detail.isArchived}
                onUploaded={() => void load()}
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Datos del remitente" icon={UserRound} />
            <CardBody className="space-y-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Remitente
                </p>
                <p className="font-medium text-slate-800">{detail.senderName}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Organización
                </p>
                <p className="text-slate-700">
                  {detail.senderOrganization ?? (
                    <span className="text-slate-400">No especificada</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Referencia
                </p>
                <p className="text-slate-700">
                  {detail.senderReference ?? <span className="text-slate-400">Sin referencia</span>}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Resumen
                </p>
                <p className="text-slate-700">
                  {detail.summary ?? <span className="text-slate-400">Sin resumen</span>}
                </p>
              </div>
              <div className="border-t border-line pt-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <Mail className="h-3 w-3" aria-hidden="true" />
                  Registrado por
                </p>
                <p className="text-slate-700">{detail.createdBy.name}</p>
                <p className="text-xs text-slate-500">{formatDateTime(detail.registeredAt)}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Trazabilidad" icon={CalendarClock} />
            <CardBody className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Route className="h-3.5 w-3.5" aria-hidden="true" />
                  Tramos
                </span>
                <span className="tabular text-slate-800">
                  {recipients.filter((recipient) => recipient.status === 'DESPACHADO').length}/
                  {recipients.length} despachados
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <TimerOff className="h-3.5 w-3.5" aria-hidden="true" />
                  Tramos demorados
                </span>
                <span className="tabular text-slate-800">{detail.metrics.overdueSegments}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Año / secuencia
                </span>
                <span className="tabular text-slate-800">
                  {detail.year} · {detail.sequence}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Duración media por tramo</span>
                <span className="tabular text-slate-800">
                  {formatDuration(
                    recipients.length > 0
                      ? Math.round(
                          recipients.reduce(
                            (total, recipient) => total + (recipient.durationMinutes ?? 0),
                            0,
                          ) / recipients.length,
                        )
                      : null,
                  )}
                </span>
              </div>
            </CardBody>
          </Card>

          {canRotateCode ? (
            <PublicCodePanel
              trackingNumber={detail.trackingNumber}
              hasActiveToken={detail.publicTracking?.hasActiveToken}
              expiresAt={detail.publicTracking?.expiresAt}
              createdAt={detail.publicTracking?.createdAt}
              canRotate={canRotateCode}
              rotating={rotating}
              onRotate={() => setRotateOpen(true)}
            />
          ) : null}

          <div className="card p-4">
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-unior-600" aria-hidden="true" />
              Las acciones de recepción, clasificación y salida solo se habilitan cuando el backend
              las autoriza para su usuario y el estado del tramo.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleArchive}
        title="Archivar correspondencia"
        message="La correspondencia pasará al estado Archivada. El historial y los anexos se conservan y no se puede deshacer desde la interfaz."
        confirmLabel="Archivar correspondencia"
        tone="danger"
      >
        <Textarea
          label="Motivo del archivado (opcional)"
          value={archiveReason}
          onChange={(event) => setArchiveReason(event.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Por ejemplo: trámite concluido y notificado."
        />
        {archiveError ? <ApiErrorAlert error={archiveError} /> : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={rotateOpen}
        onClose={() => setRotateOpen(false)}
        onConfirm={handleRotate}
        title="Regenerar código público"
        message="Se revocará el código anterior y se generará uno nuevo. El nuevo código se muestra una sola vez; guárdelo antes de cerrar el mensaje."
        confirmLabel="Regenerar código"
      />
    </div>
  );
}
