'use client';

import { ShieldOff } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/labels';
import type { Role } from '@/lib/types';
import { LinkButton } from './Button';
import { FullPageLoader } from './Loading';
import { RoleBadge } from './RoleBadge';

/** Guard de sesión y de rol. El backend sigue siendo la autoridad final. */
export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || user) return;
    const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
    router.replace(`/login${next}`);
  }, [loading, user, pathname, router]);

  if (loading) return <FullPageLoader label="Verificando su sesión" />;
  if (!user) return <FullPageLoader label="Redirigiendo al inicio de sesión" />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mist px-4">
        <div className="card w-full max-w-md p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldOff className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-unior-900">Acceso restringido</h1>
          <p className="mt-1 text-sm text-slate-500">
            Su rol actual no permite ver esta sección. Si necesita acceso, solicítelo al
            administrador del sistema.
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-xs text-slate-500">Rol actual:</span>
            <RoleBadge role={user.role} />
            <span className="sr-only">{ROLE_LABELS[user.role]}</span>
          </div>
          <div className="mt-5 flex justify-center gap-2">
            <LinkButton href="/" variant="secondary">
              Ir al panel
            </LinkButton>
            <LinkButton href="/bandeja">Mi bandeja</LinkButton>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
