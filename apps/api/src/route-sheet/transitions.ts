import { RouteRecipientStatus } from '@prisma/client';

/**
 * Máquina de estados del tramo. El servidor es la única autoridad: el cliente
 * no puede fijar marcas de tiempo ni saltar pasos.
 *
 * PENDIENTE -> RECIBIDO -> CLASIFICADO -> DESPACHADO
 */
export const ROUTE_TRANSITIONS: Record<RouteRecipientStatus, RouteRecipientStatus[]> = {
  PENDIENTE: [RouteRecipientStatus.RECIBIDO],
  RECIBIDO: [RouteRecipientStatus.CLASIFICADO],
  CLASIFICADO: [RouteRecipientStatus.DESPACHADO],
  DESPACHADO: [],
};

export function canTransition(from: RouteRecipientStatus, to: RouteRecipientStatus): boolean {
  return ROUTE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canReceive(status: RouteRecipientStatus): boolean {
  return status === RouteRecipientStatus.PENDIENTE;
}

export function canClassify(status: RouteRecipientStatus): boolean {
  return status === RouteRecipientStatus.RECIBIDO;
}

export function canDispatch(status: RouteRecipientStatus): boolean {
  return status === RouteRecipientStatus.CLASIFICADO;
}

/** Acciones de interfaz disponibles para el tramo en su estado actual. */
export function allowedActions(status: RouteRecipientStatus): string[] {
  if (status === RouteRecipientStatus.PENDIENTE) return ['receive'];
  if (status === RouteRecipientStatus.RECIBIDO) return ['classify'];
  if (status === RouteRecipientStatus.CLASIFICADO) return ['dispatch'];
  return [];
}

export type RecipientStatusSnapshot = {
  status: RouteRecipientStatus;
};

/**
 * Estado de la correspondencia derivado de sus tramos:
 * todos despachados -> ATENDIDA; alguno en curso -> EN_TRAMITE; ninguno -> REGISTRADA.
 */
export function computeCorrespondenceStatus(
  recipients: RecipientStatusSnapshot[],
): 'REGISTRADA' | 'EN_TRAMITE' | 'ATENDIDA' {
  if (recipients.length === 0) return 'REGISTRADA';
  if (recipients.every((r) => r.status === RouteRecipientStatus.DESPACHADO)) return 'ATENDIDA';
  if (recipients.every((r) => r.status === RouteRecipientStatus.PENDIENTE)) return 'REGISTRADA';
  return 'EN_TRAMITE';
}
