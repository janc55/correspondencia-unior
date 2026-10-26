import { Role } from '@prisma/client';

/** Identidad mínima disponible en cada petición autenticada. */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
};

export type RequestWithContext = {
  requestId?: string;
  user?: AuthUser;
  ip?: string;
  headers: Record<string, unknown>;
};
