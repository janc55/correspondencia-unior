import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { ToastProvider } from '@/components/Toast';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Correspondencia UNIOR',
    template: '%s · Correspondencia UNIOR',
  },
  description:
    'Sistema de registro y seguimiento de correspondencia de la Universidad Privada de Oruro.',
  applicationName: 'Correspondencia UNIOR',
};

export const viewport: Viewport = {
  themeColor: '#0B2A5B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
