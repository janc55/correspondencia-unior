import { RouteRecipientStatus } from '@prisma/client';

/**
 * Cálculo de duración y demora por tramo. Funciones puras: la misma lógica se
 * usa en el detalle, en el listado de demorados y en las pruebas unitarias.
 */

export type RecipientTiming = {
  status: RouteRecipientStatus;
  createdAt: Date;
  receivedAt: Date | null;
  classifiedAt?: Date | null;
  dispatchedAt: Date | null;
};

const MS_PER_MINUTE = 60_000;

/** Inicio del tramo: la recepción si existe; si no, la creación del tramo. */
export function segmentStart(recipient: RecipientTiming): Date {
  return recipient.receivedAt ?? recipient.createdAt;
}

/** Fin del tramo: la salida si existe; los tramos abiertos se miden contra `now`. */
export function segmentEnd(recipient: RecipientTiming, now: Date): Date {
  return recipient.dispatchedAt ?? now;
}

export function segmentDurationMinutes(recipient: RecipientTiming, now: Date): number {
  const end = segmentEnd(recipient, now).getTime();
  const start = segmentStart(recipient).getTime();
  return Math.max(0, Math.floor((end - start) / MS_PER_MINUTE));
}

export function segmentDurationHours(recipient: RecipientTiming, now: Date): number {
  return segmentDurationMinutes(recipient, now) / 60;
}

export function isSegmentOpen(recipient: RecipientTiming): boolean {
  return recipient.status !== RouteRecipientStatus.DESPACHADO;
}

/** Un tramo está demorado cuando su duración supera el umbral configurado. */
export function isSegmentOverdue(
  recipient: RecipientTiming,
  now: Date,
  thresholdHours: number,
): boolean {
  return segmentDurationHours(recipient, now) > thresholdHours;
}

/** Horas que exceden el umbral (0 si no hay demora). */
export function overdueHours(
  recipient: RecipientTiming,
  now: Date,
  thresholdHours: number,
): number {
  const excess = segmentDurationHours(recipient, now) - thresholdHours;
  return excess > 0 ? Math.round(excess * 10) / 10 : 0;
}

/** Horas de espera de un tramo abierto (para la bandeja del destinatario). */
export function waitingHours(recipient: RecipientTiming, now: Date): number {
  return Math.round(segmentDurationHours(recipient, now) * 10) / 10;
}

export function countOverdueSegments(
  recipients: RecipientTiming[],
  now: Date,
  thresholdHours: number,
): number {
  return recipients.filter((recipient) => isSegmentOverdue(recipient, now, thresholdHours)).length;
}
