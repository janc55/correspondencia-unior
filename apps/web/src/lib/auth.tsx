'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { api, SESSION_EXPIRED_EVENT, tokenStorage } from './api';
import type { Role, User } from './types';

interface AuthContextValue {
  user: User | null;
  /** `true` mientras se restaura la sesión desde `localStorage`. */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!tokenStorage.getAccessToken() && !tokenStorage.getRefreshToken()) {
        setLoading(false);
        return;
      }
      try {
        const profile = await api.auth.me();
        if (!cancelled) setUser(profile);
      } catch {
        tokenStorage.clear();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setLoading(false);
      tokenStorage.clear();
      // Las rutas públicas siguen accesibles con un token caducado en el navegador.
      const isPublicRoute = pathname === '/login' || pathname?.startsWith('/consulta');
      if (!isPublicRoute) router.replace('/login');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [router, pathname]);

  const login = useCallback(async (email: string, password: string) => {
    const session = await api.auth.login({ email, password });
    tokenStorage.save(session.accessToken, session.refreshToken);
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await api.auth.logout(refreshToken);
      } catch {
        /* el cierre de sesión local no debe bloquearse por un fallo del servidor */
      }
    }
    tokenStorage.clear();
    setUser(null);
    router.replace('/login');
  }, [router]);

  const hasRole = useCallback(
    (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, hasRole }),
    [user, loading, login, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return context;
}
