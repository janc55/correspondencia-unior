import clsx from 'clsx';

import { ROLE_LABELS } from '@/lib/labels';
import type { Role } from '@/lib/types';

const ROLE_TONES: Record<Role, string> = {
  ADMIN: 'border-unior-200 bg-unior-50 text-unior-800',
  RECEPCION: 'border-gold-200 bg-gold-50 text-gold-700',
  DESTINATARIO: 'border-sky-200 bg-sky-50 text-sky-800',
  SEGUIMIENTO: 'border-violet-200 bg-violet-50 text-violet-800',
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap',
        ROLE_TONES[role],
        className,
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
