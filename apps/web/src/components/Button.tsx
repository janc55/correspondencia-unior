'use client';

import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-unior-900 text-white border border-unior-900 hover:bg-unior-800 active:bg-unior-950 shadow-sm',
  secondary:
    'bg-white text-unior-900 border border-line hover:bg-unior-50 hover:border-unior-200 shadow-sm',
  gold: 'bg-gold-500 text-unior-950 border border-gold-500 hover:bg-gold-400 font-semibold shadow-sm',
  ghost:
    'bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-600 text-white border border-red-600 hover:bg-red-700 shadow-sm',
  link: 'bg-transparent text-unior-700 border border-transparent hover:underline underline-offset-4 px-0',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-colors select-none',
        'disabled:cursor-not-allowed disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Obligatorio: el botón solo muestra un icono. */
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex items-center justify-center transition-colors rounded-lg',
        'disabled:cursor-not-allowed disabled:opacity-55',
        VARIANTS[variant],
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}

export interface LinkButtonProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
  target?: string;
  rel?: string;
  prefetch?: boolean;
}

/**
 * Enlace con apariencia de botón. Evita anidar `<button>` dentro de `<a>`,
 * que es HTML inválido y perjudica la navegación con lector de pantalla.
 */
export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  className,
  children,
  target,
  rel,
  prefetch,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      prefetch={prefetch}
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-colors select-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}
