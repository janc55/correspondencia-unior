'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';

import { TableSkeleton } from './Loading';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  srOnlyHeader?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  empty?: ReactNode;
  caption: string;
  rowClassName?: (row: T) => string | undefined;
  footer?: ReactNode;
}

const ALIGN: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  skeletonRows = 5,
  empty,
  caption,
  rowClassName,
  footer,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-hidden">
        <TableSkeleton rows={skeletonRows} columns={Math.min(columns.length, 5)} />
      </div>
    );
  }

  if (rows.length === 0 && empty) {
    return <div>{empty}</div>;
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-slate-50/80">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={clsx(
                    'px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500',
                    ALIGN[column.align ?? 'left'],
                    column.headerClassName,
                  )}
                >
                  {column.srOnlyHeader ? (
                    <span className="sr-only">{column.header}</span>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={clsx('transition-colors hover:bg-slate-50/70', rowClassName?.(row))}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={clsx(
                      'px-4 py-3 align-middle text-slate-700',
                      ALIGN[column.align ?? 'left'],
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
