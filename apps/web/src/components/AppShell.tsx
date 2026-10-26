'use client';

import clsx from 'clsx';
import {
  FilePlus2,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  TimerOff,
  Users,
  X,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth';
import { APP_NAME, INSTITUTION_NAME, INSTITUTION_SHORT_NAME, ROLE_LABELS } from '@/lib/labels';
import type { Role } from '@/lib/types';
import { RoleBadge } from './RoleBadge';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Panel', icon: LayoutDashboard },
  { href: '/correspondencias', label: 'Correspondencias', icon: FolderOpen },
  {
    href: '/correspondencias/nueva',
    label: 'Nueva correspondencia',
    icon: FilePlus2,
    roles: ['ADMIN', 'RECEPCION'],
  },
  { href: '/bandeja', label: 'Mi bandeja', icon: Inbox },
  {
    href: '/demorados',
    label: 'Demorados',
    icon: TimerOff,
    roles: ['ADMIN', 'RECEPCION', 'SEGUIMIENTO'],
  },
  { href: '/auditoria', label: 'Auditoría', icon: ScrollText, roles: ['ADMIN', 'SEGUIMIENTO'] },
  { href: '/usuarios', label: 'Usuarios', icon: Users, roles: ['ADMIN'] },
];

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/correspondencias') {
    return (
      pathname === '/correspondencias' ||
      (pathname.startsWith('/correspondencias/') && pathname !== '/correspondencias/nueva')
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 rounded-lg px-2 py-1 outline-offset-4"
      aria-label={`${APP_NAME} · ${INSTITUTION_SHORT_NAME}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-base font-bold text-unior-950">
        U
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-white">Correspondencia</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-unior-300">
          {INSTITUTION_SHORT_NAME}
          {compact ? '' : ' · Sistema interno'}
        </span>
      </span>
    </Link>
  );
}

function NavLinks({
  role,
  pathname,
  onNavigate,
}: {
  role: Role;
  pathname: string;
  onNavigate?: () => void;
}) {
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
  return (
    <nav aria-label="Navegación principal" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
      {items.map((item) => {
        const active = isActive(item.href, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-white/10 font-medium text-white shadow-inner'
                : 'text-unior-200 hover:bg-white/5 hover:text-white',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
            {active ? (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="space-y-2 border-t border-white/10 px-3 py-4">
      <Link
        href="/consulta"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-unior-200 transition-colors hover:bg-white/5 hover:text-white"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        Consulta pública
      </Link>
      <p className="px-3 text-[10px] leading-relaxed text-unior-400">
        {INSTITUTION_NAME}
        <br />
        Versión MVP · 2026
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  if (!user) return null;

  const department = user.department?.name ?? 'Sin departamento';

  return (
    <div className="min-h-screen bg-mist">
      {/* Sidebar fija (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gradient-to-b from-unior-900 via-unior-900 to-unior-950 lg:flex">
        <div className="border-b border-white/10 px-3 py-4">
          <Brand />
        </div>
        <NavLinks role={user.role} pathname={pathname} />
        <SidebarFooter />
      </aside>

      {/* Drawer (móvil) */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/55"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="nav-drawer absolute inset-y-0 left-0 flex w-72 max-w-[86%] flex-col bg-gradient-to-b from-unior-900 via-unior-900 to-unior-950 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-4">
              <Brand compact />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-1.5 text-unior-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <NavLinks
              role={user.role}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
            <SidebarFooter />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú de navegación"
              aria-expanded={mobileOpen}
              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="hidden truncate text-[10px] font-semibold uppercase tracking-widest text-slate-400 sm:block">
                {INSTITUTION_NAME}
              </p>
              <p className="truncate text-sm font-semibold text-unior-900">{APP_NAME}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-sm font-medium text-slate-800">
                {user.name}
              </p>
              <p className="max-w-[180px] truncate text-xs text-slate-500">
                {ROLE_LABELS[user.role]} · {department}
              </p>
            </div>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-unior-900 text-xs font-semibold text-white"
              aria-hidden="true"
            >
              {initials(user.name)}
            </span>
            <span className="hidden md:inline-flex">
              <RoleBadge role={user.role} />
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Salir</span>
              <span className="sr-only sm:hidden">Cerrar sesión</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
