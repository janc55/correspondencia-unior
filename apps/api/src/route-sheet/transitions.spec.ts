import { RouteRecipientStatus } from '@prisma/client';
import {
  allowedActions,
  canClassify,
  canDispatch,
  canReceive,
  canTransition,
  computeCorrespondenceStatus,
} from './transitions';

const { PENDIENTE, RECIBIDO, CLASIFICADO, DESPACHADO } = RouteRecipientStatus;

describe('transiciones del tramo', () => {
  it('solo permite avanzar un paso en el orden definido', () => {
    expect(canTransition(PENDIENTE, RECIBIDO)).toBe(true);
    expect(canTransition(PENDIENTE, CLASIFICADO)).toBe(false);
    expect(canTransition(PENDIENTE, DESPACHADO)).toBe(false);
    expect(canTransition(RECIBIDO, CLASIFICADO)).toBe(true);
    expect(canTransition(RECIBIDO, DESPACHADO)).toBe(false);
    expect(canTransition(CLASIFICADO, DESPACHADO)).toBe(true);
    expect(canTransition(DESPACHADO, DESPACHADO)).toBe(false);
  });

  it('expone qué acción corresponde en cada estado', () => {
    expect(canReceive(PENDIENTE)).toBe(true);
    expect(canReceive(RECIBIDO)).toBe(false);
    expect(canClassify(RECIBIDO)).toBe(true);
    expect(canClassify(CLASIFICADO)).toBe(false);
    expect(canDispatch(CLASIFICADO)).toBe(true);
    expect(canDispatch(PENDIENTE)).toBe(false);

    expect(allowedActions(PENDIENTE)).toEqual(['receive']);
    expect(allowedActions(RECIBIDO)).toEqual(['classify']);
    expect(allowedActions(CLASIFICADO)).toEqual(['dispatch']);
    expect(allowedActions(DESPACHADO)).toEqual([]);
  });

  it('deriva el estado de la correspondencia a partir de sus tramos', () => {
    expect(computeCorrespondenceStatus([])).toBe('REGISTRADA');
    expect(computeCorrespondenceStatus([{ status: PENDIENTE }, { status: PENDIENTE }])).toBe(
      'REGISTRADA',
    );
    expect(computeCorrespondenceStatus([{ status: DESPACHADO }, { status: PENDIENTE }])).toBe(
      'EN_TRAMITE',
    );
    expect(computeCorrespondenceStatus([{ status: RECIBIDO }])).toBe('EN_TRAMITE');
    expect(computeCorrespondenceStatus([{ status: DESPACHADO }, { status: DESPACHADO }])).toBe(
      'ATENDIDA',
    );
  });
});
