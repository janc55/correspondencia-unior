import type { RouteRecipientStatus, SegmentVerb } from './types';

const VERBS: SegmentVerb[] = ['receive', 'classify', 'dispatch'];

export const SEGMENT_VERB_LABELS: Record<SegmentVerb, string> = {
  receive: 'Recibir',
  classify: 'Clasificar',
  dispatch: 'Registrar salida',
};

/**
 * Acciones visibles para un tramo. La UI no concede permisos: solo combina el
 * estado publicado por el backend con `canAct`/`allowedActions` del contrato.
 */
export function segmentActions(
  status: RouteRecipientStatus,
  canAct: boolean,
  allowedActions?: string[] | null,
): SegmentVerb[] {
  if (!canAct) return [];

  const byStatus: SegmentVerb[] =
    status === 'PENDIENTE'
      ? ['receive']
      : status === 'RECIBIDO'
        ? ['classify']
        : status === 'CLASIFICADO'
          ? ['dispatch']
          : [];

  const declared = (allowedActions ?? []).filter((value): value is SegmentVerb =>
    (VERBS as string[]).includes(value),
  );

  if (declared.length === 0) return byStatus;
  return byStatus.filter((verb) => declared.includes(verb));
}
