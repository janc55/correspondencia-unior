'use client';

import clsx from 'clsx';
import { Check, Copy, KeyRound, RefreshCw, ShieldAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { copyToClipboard } from '@/lib/clipboard';
import { formatDateTime } from '@/lib/format';
import { Button } from './Button';
import { useToast } from './Toast';

function CopyButton({
  value,
  label = 'Copiar',
  size = 'sm',
  variant = 'secondary',
}: {
  value: string;
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'secondary' | 'gold';
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleCopy = async () => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      toast.success('Copiado al portapapeles.');
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('No se pudo copiar. Seleccione el texto manualmente.');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => void handleCopy()}
      icon={
        copied ? (
          <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )
      }
      aria-label={`${label}: ${value}`}
    >
      {copied ? 'Copiado' : label}
    </Button>
  );
}

export interface PublicCodePanelProps {
  trackingNumber: string;
  code?: string | null;
  hasActiveToken?: boolean;
  expiresAt?: string | null;
  createdAt?: string | null;
  canRotate?: boolean;
  rotating?: boolean;
  onRotate?: () => void;
  /** Vista destacada usada justo después de registrar la correspondencia. */
  prominent?: boolean;
  notice?: ReactNode;
  children?: ReactNode;
}

export function PublicCodePanel({
  trackingNumber,
  code,
  hasActiveToken,
  expiresAt,
  createdAt,
  canRotate = false,
  rotating = false,
  onRotate,
  prominent = false,
  notice,
  children,
}: PublicCodePanelProps) {
  const rotateButton =
    canRotate && onRotate ? (
      <Button
        variant={prominent ? 'gold' : 'secondary'}
        size="sm"
        loading={rotating}
        onClick={onRotate}
        icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
      >
        {code ? 'Regenerar código' : 'Generar código'}
      </Button>
    ) : null;

  if (prominent) {
    return (
      <section
        className="overflow-hidden rounded-xl border border-unior-800 bg-gradient-to-br from-unior-900 to-unior-950 text-white shadow-raised"
        aria-labelledby="public-code-title"
      >
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-gold-300">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="public-code-title" className="text-base font-semibold text-white">
                Código de verificación público
              </h2>
              <p className="mt-0.5 text-sm text-unior-100">
                Guárdelo: este código no se vuelve a mostrar. Solo se conserva su huella cifrada.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-unior-200">
                Número de correspondencia
              </p>
              <p className="mt-1 text-lg font-semibold tabular text-white">{trackingNumber}</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-unior-200">
                Código de verificación
              </p>
              <p className="public-code mt-1 text-lg font-semibold text-gold-200">
                {code ?? 'No disponible'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {trackingNumber ? (
              <CopyButton value={trackingNumber} label="Copiar número" variant="gold" />
            ) : null}
            {code ? <CopyButton value={code} label="Copiar código" variant="gold" /> : null}
            {rotateButton}
          </div>

          <div className="space-y-1 text-xs text-unior-200">
            <p>
              Consulte el estado en <span className="font-semibold text-white">/consulta</span> con
              el número y el código.
            </p>
            {expiresAt ? <p>Vigencia del código: hasta {formatDateTime(expiresAt)}.</p> : null}
            {notice ? <p className="text-gold-200">{notice}</p> : null}
          </div>

          {children}
        </div>
      </section>
    );
  }

  return (
    <section className="card p-5" aria-labelledby="public-code-compact-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-unior-50 text-unior-700">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 id="public-code-compact-title" className="text-sm font-semibold text-unior-900">
              Consulta pública
            </h2>
            <p className="text-xs text-slate-500">
              El número por sí solo no habilita la consulta: se requiere el código.
            </p>
          </div>
        </div>
        {rotateButton}
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">Número</dt>
          <dd className="font-medium tabular text-slate-800">{trackingNumber}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">Código</dt>
          <dd className="text-right">
            {code ? (
              <span className="inline-flex items-center gap-2">
                <span className="public-code font-semibold text-unior-900">{code}</span>
                <CopyButton value={code} label="Copiar" />
              </span>
            ) : hasActiveToken ? (
              <span className="text-xs text-slate-500">
                Activo{createdAt ? ` desde ${formatDateTime(createdAt)}` : ''}. El código no se
                puede recuperar; regenérelo si es necesario.
              </span>
            ) : (
              <span className="text-xs font-medium text-amber-700">Sin código activo</span>
            )}
          </dd>
        </div>
        {expiresAt ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Vigencia</dt>
            <dd className="text-slate-700">{formatDateTime(expiresAt)}</dd>
          </div>
        ) : null}
      </dl>

      {children ? <div className={clsx('mt-4')}>{children}</div> : null}
    </section>
  );
}
