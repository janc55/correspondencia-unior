import { Role } from '@prisma/client';
import { AuthUser } from '../types/auth-user';

/**
 * Política de acceso a correspondencias. Se aplica tanto en memoria (detalle ya
 * cargado) como en forma de filtro Prisma (listados), para no duplicar reglas.
 */

export type RecipientAccess = {
  userId: string | null;
  departmentId: string | null;
};

export type CorrespondenceAccess = {
  createdById: string;
  recipients: RecipientAccess[];
};

export function hasGlobalCorrespondenceScope(role: Role): boolean {
  return role === Role.ADMIN || role === Role.RECEPCION || role === Role.SEGUIMIENTO;
}

export function canAccessCorrespondence(
  user: AuthUser,
  correspondence: CorrespondenceAccess,
): boolean {
  if (hasGlobalCorrespondenceScope(user.role)) return true;
  if (correspondence.createdById === user.id) return true;

  return correspondence.recipients.some((recipient) => {
    if (recipient.userId) return recipient.userId === user.id;
    return Boolean(user.departmentId) && recipient.departmentId === user.departmentId;
  });
}

/** Filtro equivalente para consultas Prisma del rol DESTINATARIO. */
export function correspondenceScopeFilter(user: AuthUser):
  | Record<string, never>
  | {
      OR: Array<Record<string, unknown>>;
    } {
  if (hasGlobalCorrespondenceScope(user.role)) return {};

  const or: Array<Record<string, unknown>> = [
    { createdById: user.id },
    { routeSheet: { recipients: { some: { userId: user.id } } } },
  ];
  if (user.departmentId) {
    or.push({
      routeSheet: {
        recipients: { some: { userId: null, departmentId: user.departmentId } },
      },
    });
  }
  return { OR: or };
}

/** Solo el destinatario asignado (o un administrador) opera el tramo. */
export function canActOnRecipient(user: AuthUser, recipient: RecipientAccess): boolean {
  if (user.role === Role.ADMIN) return true;
  if (user.role !== Role.DESTINATARIO) return false;
  if (recipient.userId) return recipient.userId === user.id;
  return Boolean(user.departmentId) && recipient.departmentId === user.departmentId;
}

export function canManagePublicCode(role: Role): boolean {
  return role === Role.ADMIN || role === Role.RECEPCION || role === Role.SEGUIMIENTO;
}

export function canArchive(role: Role): boolean {
  return role === Role.ADMIN || role === Role.SEGUIMIENTO;
}

export function canReviewOverdue(role: Role): boolean {
  return role === Role.ADMIN || role === Role.RECEPCION || role === Role.SEGUIMIENTO;
}

export function canViewAudit(role: Role): boolean {
  return role === Role.ADMIN || role === Role.SEGUIMIENTO;
}
