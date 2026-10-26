import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-mist px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-unior-50 text-unior-700">
          <FileQuestion className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-gold-600">
          Error 404
        </p>
        <h1 className="mt-1 text-lg font-semibold text-unior-900">Página no encontrada</h1>
        <p className="mt-1 text-sm text-slate-500">
          La dirección solicitada no existe o fue movida. Verifique el enlace o vuelva al panel
          principal.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-unior-900 px-4 text-sm font-medium text-white transition-colors hover:bg-unior-800"
          >
            Ir al panel
          </Link>
          <Link
            href="/consulta"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-medium text-unior-900 transition-colors hover:bg-unior-50"
          >
            Consulta pública
          </Link>
        </div>
      </div>
    </div>
  );
}
