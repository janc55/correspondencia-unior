'use client';

import { RefreshCw, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error de interfaz:', error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-mist px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <TriangleAlert className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-red-600">
          Error inesperado
        </p>
        <h1 className="mt-1 text-lg font-semibold text-unior-900">
          Algo salió mal al mostrar esta página
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Intente nuevamente. Si el problema persiste, comuníquese con el área de sistemas de la
          universidad.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-slate-400">Referencia técnica: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-unior-900 px-4 text-sm font-medium text-white transition-colors hover:bg-unior-800"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-medium text-unior-900 transition-colors hover:bg-unior-50"
          >
            Volver al panel
          </Link>
        </div>
      </div>
    </div>
  );
}
