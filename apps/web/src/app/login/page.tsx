'use client';

import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { ApiErrorAlert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Spinner } from '@/components/Loading';
import { RoleBadge } from '@/components/RoleBadge';
import { useAuth } from '@/lib/auth';
import { APP_NAME, INSTITUTION_NAME, ROLE_LABELS } from '@/lib/labels';
import type { Role } from '@/lib/types';

interface DemoAccount {
  name: string;
  email: string;
  role: Role;
}

const DEMO_PASSWORD = 'Unior2026*';

const DEMO_ACCOUNTS: DemoAccount[] = [
  { name: 'Ana Quispe', email: 'admin@unior.edu.bo', role: 'ADMIN' },
  { name: 'Rosa Ventanilla', email: 'recepcion@unior.edu.bo', role: 'RECEPCION' },
  { name: 'Sofía Secretaría', email: 'seguimiento@unior.edu.bo', role: 'SEGUIMIENTO' },
  { name: 'Luis Abogado', email: 'juridico@unior.edu.bo', role: 'DESTINATARIO' },
  { name: 'Carla Académica', email: 'academico@unior.edu.bo', role: 'DESTINATARIO' },
  { name: 'Mario RRHH', email: 'rrhh@unior.edu.bo', role: 'DESTINATARIO' },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [nextPath, setNextPath] = useState('/');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) setNextPath(next);
  }, []);

  useEffect(() => {
    if (!loading && user) router.replace(nextPath);
  }, [loading, user, nextPath, router]);

  const fillDemo = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace(nextPath);
    } catch (caught) {
      setError(caught);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-mist lg:grid-cols-[1.05fr_1fr]">
      {/* Panel institucional */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-unior-900 via-unior-900 to-unior-950 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-500/10 blur-2xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-unior-500/20 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500 text-xl font-bold text-unior-950">
            U
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{INSTITUTION_NAME}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-unior-300">
              UNIOR · Oruro, Bolivia
            </p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-300">
            Gestión documental
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-white">
            Registro y seguimiento de correspondencia con hoja de ruta digital
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-unior-200">
            Cada documento recibe un número correlativo único y una hoja de ruta de hasta tres
            destinatarios, con fechas oficiales fijadas por el servidor y trazabilidad completa.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              {
                icon: ShieldCheck,
                title: 'Acceso por rol y ámbito',
                text: 'Ventanilla, destinatarios, seguimiento y administración con alcances separados.',
              },
              {
                icon: Lock,
                title: 'Consulta pública verificada',
                text: 'El número correlativo por sí solo no revela información: se exige el código.',
              },
              {
                icon: Mail,
                title: 'Alertas de demora',
                text: 'Los tramos que superan el umbral configurado se destacan y notifican.',
              },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-gold-300">
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-unior-200">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-unior-300">
          MVP institucional · La zona horaria de presentación es America/La_Paz (UTC-4).
        </p>
      </section>

      {/* Formulario */}
      <section className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-unior-900 text-lg font-bold text-gold-400">
              U
            </span>
            <div>
              <p className="text-sm font-semibold text-unior-900">{APP_NAME}</p>
              <p className="text-xs text-slate-500">{INSTITUTION_NAME}</p>
            </div>
          </div>

          <div className="card p-6 sm:p-7">
            <h2 className="text-xl font-semibold text-unior-900">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-slate-500">
              Acceso exclusivo para usuarios internos de la universidad.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
              <Input
                label="Correo institucional"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="usuario@unior.edu.bo"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={submitting}
              />

              <div className="relative">
                <Input
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={submitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2 top-[30px] rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {error ? <ApiErrorAlert error={error} title="No se pudo iniciar sesión" /> : null}

              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={submitting}
                iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
              >
                Ingresar
              </Button>
            </form>

            <div className="mt-5 border-t border-line pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Acceso rápido con credenciales demo
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Usuarios semilla de desarrollo, no productivos. Contraseña común:{' '}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] font-medium text-slate-700">
                  {DEMO_PASSWORD}
                </code>
              </p>
              <div className="mt-3 grid gap-1.5">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillDemo(account)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2 text-left transition-colors hover:border-unior-200 hover:bg-unior-50/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-slate-800">
                        {account.name}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {account.email} · {ROLE_LABELS[account.role]}
                      </span>
                    </span>
                    <RoleBadge role={account.role} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <Link
              href="/consulta"
              className="font-medium text-unior-700 underline-offset-4 hover:underline"
            >
              Consulta pública de correspondencia
            </Link>
            <span className="inline-flex items-center gap-1.5">
              {loading ? (
                <>
                  <Spinner className="h-3.5 w-3.5" label="Verificando sesión" />
                  Verificando sesión
                </>
              ) : (
                'Sesión con tokens de 1 h'
              )}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
