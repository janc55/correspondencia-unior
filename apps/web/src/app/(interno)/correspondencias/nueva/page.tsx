'use client';

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  FilePlus2,
  Info,
  Plus,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { ApiErrorAlert, InlineAlert } from '@/components/Alert';
import { AttachmentList } from '@/components/AttachmentList';
import { Button, LinkButton } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Input, Select, Textarea } from '@/components/Input';
import { PageHeader } from '@/components/PageHeader';
import { PublicCodePanel } from '@/components/PublicCodePanel';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import type {
  CreateCorrespondenceInput,
  CreateCorrespondenceResponse,
  Department,
  Direction,
  User,
} from '@/lib/types';

type RecipientKind = 'DEPARTMENT' | 'USER';

interface RecipientDraft {
  key: string;
  kind: RecipientKind;
  id: string;
  internalNotes: string;
}

let recipientCounter = 0;
function newRecipient(): RecipientDraft {
  recipientCounter += 1;
  return { key: `recipient-${recipientCounter}`, kind: 'DEPARTMENT', id: '', internalNotes: '' };
}

function initialForm() {
  return {
    direction: 'EXTERNA' as Direction,
    senderName: '',
    senderOrganization: '',
    senderReference: '',
    subject: '',
    summary: '',
  };
}

export default function NuevaCorrespondenciaPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [form, setForm] = useState(initialForm());
  const [recipients, setRecipients] = useState<RecipientDraft[]>(() => [newRecipient()]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [usersUnavailable, setUsersUnavailable] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<CreateCorrespondenceResponse | null>(null);

  useEffect(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'RECEPCION') {
      setLoadingCatalogs(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingCatalogs(true);
      try {
        const departmentsData = await api.departments.list();
        if (!cancelled) setDepartments(departmentsData);
      } catch {
        if (!cancelled) setDepartments([]);
      }
      if (isAdmin) {
        try {
          const usersData = await api.users.list({ page: 1, pageSize: 100, active: true });
          if (!cancelled) setUsers(usersData.data);
        } catch {
          if (!cancelled) {
            setUsers([]);
            setUsersUnavailable(true);
          }
        }
      } else {
        setUsersUnavailable(true);
      }
      if (!cancelled) setLoadingCatalogs(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, user?.role]);

  const updateForm = (patch: Partial<ReturnType<typeof initialForm>>) =>
    setForm((current) => ({ ...current, ...patch }));

  const updateRecipient = (key: string, patch: Partial<RecipientDraft>) =>
    setRecipients((current) =>
      current.map((recipient) => (recipient.key === key ? { ...recipient, ...patch } : recipient)),
    );

  const addRecipient = () => {
    setRecipients((current) => (current.length >= 3 ? current : [...current, newRecipient()]));
  };

  const removeRecipient = (key: string) => {
    setRecipients((current) =>
      current.length <= 1 ? current : current.filter((recipient) => recipient.key !== key),
    );
  };

  const moveRecipient = (index: number, offset: number) => {
    setRecipients((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(target, 0, item);
      return next;
    });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (form.senderName.trim().length < 3) {
      errors.senderName = 'Ingrese el nombre del remitente (mínimo 3 caracteres).';
    }
    if (form.subject.trim().length < 5) {
      errors.subject = 'El asunto debe tener al menos 5 caracteres.';
    }
    if (form.subject.trim().length > 200) {
      errors.subject = 'El asunto no puede superar los 200 caracteres.';
    }
    recipients.forEach((recipient, index) => {
      if (!recipient.id) {
        errors[`recipient-${index}`] =
          recipient.kind === 'DEPARTMENT'
            ? 'Seleccione un departamento.'
            : 'Seleccione un usuario.';
      }
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const applyServerFieldErrors = (caught: unknown) => {
    if (!(caught instanceof ApiError)) return;
    const map: Record<string, string> = {};
    for (const fieldError of caught.fieldErrors) {
      const key = fieldError.field.replace(/^dto\./, '');
      if (!map[key]) map[key] = fieldError.message;
    }
    setFieldErrors(map);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!validate()) return;

    const payload: CreateCorrespondenceInput = {
      direction: form.direction,
      subject: form.subject.trim(),
      senderName: form.senderName.trim(),
      recipients: recipients.map((recipient) => {
        const notes = recipient.internalNotes.trim();
        return recipient.kind === 'USER'
          ? { userId: recipient.id, ...(notes ? { internalNotes: notes } : {}) }
          : { departmentId: recipient.id, ...(notes ? { internalNotes: notes } : {}) };
      }),
    };
    if (form.summary.trim()) payload.summary = form.summary.trim();
    if (form.senderOrganization.trim()) payload.senderOrganization = form.senderOrganization.trim();
    if (form.senderReference.trim()) payload.senderReference = form.senderReference.trim();

    setSubmitting(true);
    try {
      const response = await api.correspondences.create(payload);
      setCreated(response);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      setError(caught);
      applyServerFieldErrors(caught);
    } finally {
      setSubmitting(false);
    }
  };

  const refreshCreated = async () => {
    if (!created) return;
    try {
      const detail = await api.correspondences.get(created.correspondence.id);
      setCreated({ ...created, correspondence: detail });
    } catch {
      /* la lista de anexos se actualizará al abrir el detalle */
    }
  };

  const startNew = () => {
    setCreated(null);
    setForm(initialForm());
    setRecipients([newRecipient()]);
    setFieldErrors({});
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const departmentOptions = useMemo(
    () => departments.filter((department) => department.active),
    [departments],
  );

  const canCreate = isAdmin || user?.role === 'RECEPCION';
  if (!canCreate) {
    return (
      <Card>
        <EmptyState
          icon={ShieldAlert}
          title="Acceso restringido"
          description="El registro de correspondencia está disponible para recepción y administración."
        />
      </Card>
    );
  }

  if (created) {
    const correspondence = created.correspondence;
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Registro completado"
          title="Correspondencia registrada"
          description={`El servidor asignó el correlativo ${correspondence.trackingNumber} y generó el código de verificación público.`}
          actions={
            <>
              <LinkButton
                href={`/correspondencias/${correspondence.id}`}
                iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
              >
                Ver detalle
              </LinkButton>
              <Button variant="secondary" onClick={startNew}>
                Registrar otra
              </Button>
            </>
          }
        />

        <InlineAlert tone="success" title="Registro guardado">
          <p>
            <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            Registrado el {formatDateTime(correspondence.registeredAt)} · Hoja de ruta con{' '}
            {correspondence.routeSheet.recipients.length} tramo
            {correspondence.routeSheet.recipients.length === 1 ? '' : 's'}.
          </p>
        </InlineAlert>

        <PublicCodePanel
          prominent
          trackingNumber={created.publicAccess.trackingNumber}
          code={created.publicAccess.code}
          expiresAt={created.publicAccess.expiresAt}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Resumen del documento"
              icon={FilePlus2}
              description={`${correspondence.subject}`}
            />
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Correlativo</span>
                <span className="font-semibold tabular text-unior-900">
                  {correspondence.trackingNumber}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Remitente</span>
                <span className="text-right text-slate-800">
                  {correspondence.senderName}
                  {correspondence.senderOrganization
                    ? ` · ${correspondence.senderOrganization}`
                    : ''}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Tipo</span>
                <span className="text-slate-800">
                  {correspondence.direction === 'INTERNA' ? 'Interna' : 'Externa'}
                </span>
              </div>
              {correspondence.senderReference ? (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Referencia</span>
                  <span className="text-right text-slate-800">
                    {correspondence.senderReference}
                  </span>
                </div>
              ) : null}
              {correspondence.summary ? (
                <p className="border-t border-line pt-2 text-xs text-slate-600">
                  {correspondence.summary}
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Anexos"
              icon={FilePlus2}
              description="Puede adjuntar los escaneos del documento en este momento."
            />
            <CardBody>
              <AttachmentList
                attachments={created.correspondence.attachments}
                correspondenceId={created.correspondence.id}
                canUpload
                onUploaded={() => void refreshCreated()}
              />
            </CardBody>
          </Card>
        </div>

        <div className="card p-4">
          <p className="flex items-start gap-2 text-xs text-slate-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-unior-600" aria-hidden="true" />
            El código de verificación se muestra una sola vez. Si se pierde, un usuario autorizado
            puede regenerarlo desde el detalle de la correspondencia; el anterior dejará de ser
            válido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Ventanilla única"
        title="Nueva correspondencia"
        description="El correlativo, las fechas oficiales y el código de verificación los genera el servidor. La hoja de ruta admite de uno a tres destinatarios en orden."
        actions={
          <LinkButton
            href="/correspondencias"
            variant="secondary"
            icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          >
            Volver al listado
          </LinkButton>
        }
      />

      {error ? (
        <ApiErrorAlert error={error} title="No se pudo registrar la correspondencia" />
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Card>
          <CardHeader
            title="Datos del documento"
            description="El asunto y el remitente son obligatorios."
            icon={FilePlus2}
          />
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Tipo de correspondencia"
                value={form.direction}
                onChange={(event) => updateForm({ direction: event.target.value as Direction })}
                required
              >
                <option value="EXTERNA">Externa</option>
                <option value="INTERNA">Interna</option>
              </Select>
              <Input
                label="Nombre del remitente"
                value={form.senderName}
                onChange={(event) => updateForm({ senderName: event.target.value })}
                error={fieldErrors.senderName}
                required
                maxLength={120}
                placeholder="Juan Pérez Mamani"
                autoComplete="off"
              />
              <Input
                label="Organización del remitente"
                value={form.senderOrganization}
                onChange={(event) => updateForm({ senderOrganization: event.target.value })}
                maxLength={160}
                placeholder="Ministerio de Educación"
                autoComplete="off"
                hint="Opcional"
              />
            </div>

            <Input
              label="Referencia del remitente"
              value={form.senderReference}
              onChange={(event) => updateForm({ senderReference: event.target.value })}
              maxLength={160}
              placeholder="CITE: MINEDU-2026-0451"
              autoComplete="off"
              hint="Opcional: cita, hoja de ruta externa u otro identificador."
            />

            <Input
              label="Asunto"
              value={form.subject}
              onChange={(event) => updateForm({ subject: event.target.value })}
              error={fieldErrors.subject}
              required
              maxLength={200}
              placeholder="Solicitud de constancia de estudios"
              hint={`${form.subject.length}/200 caracteres · mínimo 5`}
            />

            <Textarea
              label="Resumen"
              value={form.summary}
              onChange={(event) => updateForm({ summary: event.target.value })}
              maxLength={1000}
              rows={3}
              placeholder="Describa brevemente el contenido del documento."
              hint={`${form.summary.length}/1000 caracteres · opcional`}
              error={fieldErrors.summary}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Hoja de ruta"
            description="De uno a tres destinatarios. El orden define la secuencia del trámite."
            icon={ArrowRight}
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={addRecipient}
                disabled={recipients.length >= 3}
                icon={<Plus className="h-4 w-4" aria-hidden="true" />}
              >
                Añadir destinatario
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {recipients.map((recipient, index) => (
              <div
                key={recipient.key}
                className="rounded-xl border border-line bg-slate-50/50 p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-unior-900 text-[11px] font-semibold text-white">
                      {index + 1}
                    </span>
                    Tramo {index + 1}
                    {index === 0 ? (
                      <span className="rounded-full border border-gold-200 bg-gold-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-700">
                        Primero
                      </span>
                    ) : null}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveRecipient(index, -1)}
                      disabled={index === 0}
                      aria-label={`Mover tramo ${index + 1} hacia arriba`}
                      icon={<ArrowUp className="h-4 w-4" aria-hidden="true" />}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveRecipient(index, 1)}
                      disabled={index === recipients.length - 1}
                      aria-label={`Mover tramo ${index + 1} hacia abajo`}
                      icon={<ArrowDown className="h-4 w-4" aria-hidden="true" />}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecipient(recipient.key)}
                      disabled={recipients.length <= 1}
                      aria-label={`Quitar tramo ${index + 1}`}
                      icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Select
                    label="Asignar a"
                    value={recipient.kind}
                    onChange={(event) =>
                      updateRecipient(recipient.key, {
                        kind: event.target.value as RecipientKind,
                        id: '',
                      })
                    }
                  >
                    <option value="DEPARTMENT">Departamento</option>
                    <option value="USER" disabled={!isAdmin}>
                      Usuario
                    </option>
                  </Select>

                  {recipient.kind === 'DEPARTMENT' ? (
                    <Select
                      label="Departamento"
                      value={recipient.id}
                      onChange={(event) =>
                        updateRecipient(recipient.key, { id: event.target.value })
                      }
                      error={fieldErrors[`recipient-${index}`]}
                      required
                      disabled={loadingCatalogs}
                    >
                      <option value="">Seleccione un departamento</option>
                      {departmentOptions.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Select
                      label="Usuario"
                      value={recipient.id}
                      onChange={(event) =>
                        updateRecipient(recipient.key, { id: event.target.value })
                      }
                      error={fieldErrors[`recipient-${index}`]}
                      required
                      disabled={loadingCatalogs || usersUnavailable}
                      hint={
                        usersUnavailable
                          ? 'La selección por usuario requiere rol administrador. Use un departamento.'
                          : undefined
                      }
                    >
                      <option value="">Seleccione un usuario</option>
                      {users.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                          {item.department ? ` · ${item.department.name}` : ''}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>

                <div className="mt-3">
                  <Input
                    label="Nota interna del tramo"
                    value={recipient.internalNotes}
                    onChange={(event) =>
                      updateRecipient(recipient.key, { internalNotes: event.target.value })
                    }
                    maxLength={500}
                    placeholder="Instrucción para el destinatario (opcional)"
                    hint="No se publica en la consulta externa."
                  />
                </div>
              </div>
            ))}

            {recipients.length >= 3 ? (
              <p className="text-xs text-slate-500">
                Se alcanzó el máximo de tres destinatarios por hoja de ruta.
              </p>
            ) : null}

            {usersUnavailable && !isAdmin ? (
              <InlineAlert tone="info" title="Selección de destinatarios por usuario">
                Su rol no puede consultar el padrón de usuarios. Puede asignar el tramo a un
                departamento; el contrato de API solo expone la lista de usuarios para
                administración.
              </InlineAlert>
            ) : null}
          </CardBody>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-start gap-1.5 text-xs text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Al registrar se mostrará el código de verificación público. Guárdelo: no se vuelve a
            mostrar.
          </p>
          <div className="flex items-center gap-2">
            <LinkButton href="/correspondencias" variant="secondary">
              Cancelar
            </LinkButton>
            <Button
              type="submit"
              loading={submitting}
              icon={<FilePlus2 className="h-4 w-4" aria-hidden="true" />}
            >
              Registrar correspondencia
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
