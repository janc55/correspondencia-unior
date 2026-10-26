'use client';

import clsx from 'clsx';
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export interface FieldExtras {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  containerClassName?: string;
}

function describedBy(id: string, hint?: ReactNode, error?: string | null): string | undefined {
  const ids = [!error && hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

function FieldMessages({
  id,
  hint,
  error,
}: {
  id: string;
  hint?: ReactNode;
  error?: string | null;
}) {
  return (
    <>
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </>
  );
}

function Label({ id, label, required }: { id: string; label?: ReactNode; required?: boolean }) {
  if (!label) return null;
  return (
    <label htmlFor={id} className="field-label">
      {label}
      {required ? (
        <span className="ml-0.5 text-red-600" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldExtras {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, containerClassName, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={clsx('w-full', containerClassName)}>
      <Label id={inputId} label={label} required={required} />
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, hint, error)}
        className={clsx('field-control', className)}
        {...rest}
      />
      <FieldMessages id={inputId} hint={hint} error={error} />
    </div>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldExtras {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, containerClassName, className, id, children, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={clsx('w-full', containerClassName)}>
      <Label id={selectId} label={label} required={required} />
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(selectId, hint, error)}
        className={clsx('field-control', className)}
        {...rest}
      >
        {children}
      </select>
      <FieldMessages id={selectId} hint={hint} error={error} />
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldExtras {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, required, containerClassName, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  return (
    <div className={clsx('w-full', containerClassName)}>
      <Label id={textareaId} label={label} required={required} />
      <textarea
        ref={ref}
        id={textareaId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(textareaId, hint, error)}
        className={clsx('field-control min-h-24 resize-y', className)}
        {...rest}
      />
      <FieldMessages id={textareaId} hint={hint} error={error} />
    </div>
  );
});

export interface CheckFieldProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function CheckField({
  label,
  checked,
  onChange,
  description,
  disabled,
  className,
}: CheckFieldProps) {
  const id = useId();
  return (
    <div className={clsx('flex items-start gap-2.5', className)}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-unior-700 accent-unior-700"
      />
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}
