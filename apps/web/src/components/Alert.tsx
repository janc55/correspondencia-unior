import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { ApiError, describeError } from '@/lib/api';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<AlertTone, { wrapper: string; icon: ReactNode }> = {
  info: {
    wrapper: 'border-unior-200 bg-unior-50 text-unior-900',
    icon: <Info className="h-4 w-4 text-unior-700" aria-hidden="true" />,
  },
  success: {
    wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />,
  },
  warning: {
    wrapper: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />,
  },
  error: {
    wrapper: 'border-red-200 bg-red-50 text-red-900',
    icon: <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />,
  },
};

export function InlineAlert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx(
        'flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm',
        TONES[tone].wrapper,
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{TONES[tone].icon}</span>
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-sm leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}

/** Mensaje uniforme para errores de la API, incluidos los `details` por campo. */
export function ApiErrorAlert({
  error,
  className,
  title,
}: {
  error: unknown;
  className?: string;
  title?: string;
}) {
  const fieldErrors = error instanceof ApiError ? error.fieldErrors : [];
  const status = error instanceof ApiError ? error.status : 0;

  const heading =
    title ??
    (status === 403
      ? 'Acción fuera de su ámbito'
      : status === 429
        ? 'Demasiadas solicitudes'
        : status === 404
          ? 'Sin resultados'
          : 'No se pudo completar la operación');

  return (
    <InlineAlert tone="error" title={heading} className={className}>
      <p>{describeError(error)}</p>
      {fieldErrors.length > 0 ? (
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          {fieldErrors.map((item, index) => (
            <li key={`${item.field}-${index}`}>
              <span className="font-medium">{item.field}:</span> {item.message}
            </li>
          ))}
        </ul>
      ) : null}
      {error instanceof ApiError && error.requestId ? (
        <p className="mt-1 text-xs opacity-70">Referencia: {error.requestId}</p>
      ) : null}
    </InlineAlert>
  );
}
