'use client';

import { ArrowRight, CalendarClock, FileSearch, Hash, Info, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { ApiErrorAlert, InlineAlert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { PublicStatusBadge } from '@/components/StatusBadge';
import { ApiError, api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { PUBLIC_LOOKUP_PLACEHOLDERS } from '@/lib/labels';
import type { PublicTrackingResult } from '@/lib/types';

export default function ConsultaPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicTrackingResult | null>(null);
  const [error, setError] = useState<unknown>(null);

  const rateLimited = error instanceof ApiError && error.status === 429;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trackingNumber.trim() || !code.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.tracking.publicLookup(trackingNumber.trim(), code.trim());
      setResult(data);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setTrackingNumber('');
    setCode('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-600">
          Consulta externa
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-unior-900 sm:text-[28px]">
          Consulte el estado de su correspondencia
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Ingrese el número de correspondencia y el código de verificación entregado por ventanilla.
          Ambos datos son obligatorios.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="card p-5 sm:p-6" aria-labelledby="consulta-form-title">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-unior-50 text-unior-700">
              <FileSearch className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="consulta-form-title" className="text-base font-semibold text-unior-900">
                Datos del documento
              </h2>
              <p className="text-xs text-slate-500">
                El número correlativo por sí solo no habilita la consulta.
              </p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
            <Input
              label="Número de correspondencia"
              placeholder={PUBLIC_LOOKUP_PLACEHOLDERS.number}
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
              disabled={loading}
              hint="Formato COR-AÑO-SECUENCIA, por ejemplo COR-2026-000012."
            />

            <Input
              label="Código de verificación"
              placeholder={PUBLIC_LOOKUP_PLACEHOLDERS.code}
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
              disabled={loading}
              hint="Código entregado al remitente o al registrar el documento. No distingue mayúsculas."
            />

            {rateLimited ? (
              <InlineAlert tone="warning" title="Demasiados intentos">
                Se alcanzó el límite de consultas por minuto. Espere un minuto antes de volver a
                intentar.
              </InlineAlert>
            ) : error ? (
              <ApiErrorAlert error={error} />
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                loading={loading}
                disabled={loading || !trackingNumber.trim() || !code.trim()}
                iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
              >
                Consultar estado
              </Button>
              {result || error ? (
                <Button variant="secondary" onClick={reset} disabled={loading}>
                  Nueva consulta
                </Button>
              ) : null}
            </div>
          </form>

          <div className="mt-5 space-y-2 border-t border-line pt-4 text-xs text-slate-500">
            <p className="flex items-start gap-1.5">
              <ShieldCheck
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-unior-600"
                aria-hidden="true"
              />
              La consulta muestra únicamente el estado público y los movimientos generales. No
              incluye remitente, asunto, nombres ni anexos.
            </p>
            <p className="flex items-start gap-1.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-unior-600" aria-hidden="true" />
              Máximo 10 intentos por minuto. Si no ubica su documento, acuda a Ventanilla Única.
            </p>
          </div>
        </section>

        <section aria-live="polite" aria-busy={loading}>
          {loading ? (
            <div className="card p-6">
              <div className="skeleton h-5 w-32" />
              <div className="mt-4 space-y-3">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-20 w-full" />
              </div>
            </div>
          ) : result ? (
            <div className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-slate-50/70 px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Estado público
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular text-unior-900">
                    {result.trackingNumber}
                  </p>
                </div>
                <PublicStatusBadge status={result.publicStatus} label={result.publicStatusLabel} />
              </div>

              <dl className="grid gap-3 px-5 py-4 sm:grid-cols-2">
                <div>
                  <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <CalendarClock className="h-3 w-3" aria-hidden="true" />
                    Fecha de registro
                  </dt>
                  <dd className="mt-0.5 text-sm text-slate-700">
                    {formatDateTime(result.registeredAt)}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <CalendarClock className="h-3 w-3" aria-hidden="true" />
                    Último movimiento
                  </dt>
                  <dd className="mt-0.5 text-sm text-slate-700">
                    {formatDateTime(result.lastMovementAt)}
                  </dd>
                </div>
              </dl>

              <div className="border-t border-line px-5 py-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Avance por tramos
                </h3>
                <ol className="mt-3 space-y-2">
                  {(result.recipients ?? []).map((recipient) => (
                    <li
                      key={recipient.sequence}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-slate-50/50 px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-sm text-slate-700">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-unior-800 ring-1 ring-line"
                          aria-hidden="true"
                        >
                          {recipient.sequence}
                        </span>
                        Tramo {recipient.sequence}
                      </span>
                      <span className="text-right">
                        <span className="block text-xs font-medium text-slate-700">
                          {recipient.statusLabel}
                        </span>
                        <span className="block text-[11px] text-slate-500 tabular">
                          {recipient.dispatchedAt
                            ? `Salida: ${formatDateTime(recipient.dispatchedAt)}`
                            : recipient.receivedAt
                              ? `Recepción: ${formatDateTime(recipient.receivedAt)}`
                              : 'Sin movimiento'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
                {(result.recipients ?? []).length === 0 ? (
                  <p className="text-xs text-slate-500">Sin tramos públicos registrados.</p>
                ) : null}
              </div>

              <p className="border-t border-line bg-slate-50/70 px-5 py-3 text-[11px] text-slate-500">
                Información pública mínima. Los datos internos del trámite no se exponen en esta
                consulta.
              </p>
            </div>
          ) : (
            <div className="card h-full p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
                  <Hash className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-unior-900">
                    Resultado de la consulta
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Complete el formulario para ver el estado público de su documento. Si el número
                    o el código no coinciden, el sistema mostrará un mensaje genérico por seguridad.
                  </p>
                </div>
              </div>
              <ul className="mt-5 space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-unior-600"
                    aria-hidden="true"
                  />
                  Recibido: la correspondencia ingresó a la universidad.
                </li>
                <li className="flex gap-2">
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"
                    aria-hidden="true"
                  />
                  En curso: uno o más tramos están en atención.
                </li>
                <li className="flex gap-2">
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"
                    aria-hidden="true"
                  />
                  Finalizado: todos los tramos fueron despachados.
                </li>
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
