'use client';

import clsx from 'clsx';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  push: (tone: ToastTone, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { container: string; icon: ReactNode }> = {
  success: {
    container: 'border-emerald-200 bg-white',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />,
  },
  error: {
    container: 'border-red-200 bg-white',
    icon: <XCircle className="h-5 w-5 text-red-600" aria-hidden="true" />,
  },
  info: {
    container: 'border-unior-200 bg-white',
    icon: <Info className="h-5 w-5 text-unior-700" aria-hidden="true" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      counter.current += 1;
      const id = counter.current;
      setItems((current) => [...current.slice(-2), { id, tone, message }]);
      window.setTimeout(() => remove(id), 6500);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
      info: (message: string) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={clsx(
              'toast-item pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-raised',
              TONE_STYLES[item.tone].container,
            )}
          >
            <span className="mt-0.5 shrink-0">{TONE_STYLES[item.tone].icon}</span>
            <p className="min-w-0 flex-1 text-sm text-slate-700">{item.message}</p>
            <button
              type="button"
              onClick={() => remove(item.id)}
              aria-label="Cerrar notificación"
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de <ToastProvider>.');
  return context;
}
