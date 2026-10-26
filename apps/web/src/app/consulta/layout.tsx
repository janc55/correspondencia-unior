import Link from 'next/link';
import type { ReactNode } from 'react';

import { INSTITUTION_NAME, INSTITUTION_SHORT_NAME } from '@/lib/labels';

export default function PublicConsultationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-mist">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/consulta" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-unior-900 text-base font-bold text-gold-400">
              U
            </span>
            <span>
              <span className="block text-sm font-semibold text-unior-900">{INSTITUTION_NAME}</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Consulta pública de correspondencia
              </span>
            </span>
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-line px-3 text-xs font-medium text-unior-900 transition-colors hover:bg-unior-50"
          >
            Acceso interno
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:px-6">
          <p>
            {INSTITUTION_NAME} · {INSTITUTION_SHORT_NAME}
          </p>
          <p>Solo se muestra la información pública autorizada por la institución.</p>
        </div>
      </footer>
    </div>
  );
}
