'use client';

import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { formatNumber } from '@/lib/format';

function pageWindow(page: number, totalPages: number): number[] {
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  return [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
}

export interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  disabled = false,
  className,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const from = total && total > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = total ? Math.min(page * pageSize, total) : 0;
  const pages = pageWindow(page, safeTotalPages);

  return (
    <div
      className={clsx(
        'flex flex-col gap-3 border-t border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-xs text-slate-500" aria-live="polite">
        {total === undefined
          ? `Página ${page} de ${safeTotalPages}`
          : total === 0
            ? 'Sin resultados'
            : `Mostrando ${formatNumber(from)}–${formatNumber(to)} de ${formatNumber(total)}`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange ? (
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Filas</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              disabled={disabled}
              aria-label="Filas por página"
              className="rounded-md border border-line bg-white px-1.5 py-1 text-xs text-slate-700"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <nav aria-label="Paginación" className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Página anterior"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          {pages.map((value, index) => {
            const previous = pages[index - 1];
            const gap = previous !== undefined && value - previous > 1;
            return (
              <span key={value} className="flex items-center gap-1">
                {gap ? <span className="px-1 text-xs text-slate-400">…</span> : null}
                <button
                  type="button"
                  onClick={() => onPageChange(value)}
                  disabled={disabled}
                  aria-label={`Página ${value}`}
                  aria-current={value === page ? 'page' : undefined}
                  className={clsx(
                    'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors',
                    value === page
                      ? 'border-unior-900 bg-unior-900 text-white'
                      : 'border-line bg-white text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {value}
                </button>
              </span>
            );
          })}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page >= safeTotalPages}
            aria-label="Página siguiente"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  );
}
