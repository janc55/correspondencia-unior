import { RouteRecipientStatus } from '@prisma/client';
import {
  countOverdueSegments,
  isSegmentOverdue,
  overdueHours,
  segmentDurationMinutes,
  waitingHours,
} from './overdue';

const now = new Date('2026-02-10T12:00:00.000Z');

function recipient(overrides: Partial<Parameters<typeof isSegmentOverdue>[0]> = {}) {
  return {
    status: RouteRecipientStatus.DESPACHADO,
    createdAt: new Date('2026-02-10T08:00:00.000Z'),
    receivedAt: new Date('2026-02-10T09:00:00.000Z'),
    dispatchedAt: new Date('2026-02-10T11:00:00.000Z'),
    ...overrides,
  };
}

describe('duración y demora por tramo', () => {
  it('calcula la duración desde la recepción hasta la salida', () => {
    expect(segmentDurationMinutes(recipient(), now)).toBe(120);
  });

  it('mide los tramos abiertos contra el momento actual', () => {
    const open = recipient({
      status: RouteRecipientStatus.RECIBIDO,
      dispatchedAt: null,
    });
    expect(segmentDurationMinutes(open, now)).toBe(180);
    expect(waitingHours(open, now)).toBe(3);
  });

  it('usa la creación del tramo cuando aún no hay recepción', () => {
    const pending = recipient({
      status: RouteRecipientStatus.PENDIENTE,
      receivedAt: null,
      dispatchedAt: null,
      createdAt: new Date('2026-02-09T12:00:00.000Z'),
    });
    expect(segmentDurationMinutes(pending, now)).toBe(24 * 60);
  });

  it('marca demora solo cuando se supera el umbral', () => {
    const withinThreshold = recipient({ createdAt: new Date('2026-02-10T00:00:00.000Z') });
    expect(isSegmentOverdue(withinThreshold, now, 24)).toBe(false);

    const late = recipient({
      status: RouteRecipientStatus.RECIBIDO,
      createdAt: new Date('2026-02-09T00:00:00.000Z'),
      receivedAt: new Date('2026-02-09T01:00:00.000Z'),
      dispatchedAt: null,
    });
    expect(isSegmentOverdue(late, now, 24)).toBe(true);
    expect(overdueHours(late, now, 24)).toBe(11);
    expect(countOverdueSegments([withinThreshold, late], now, 24)).toBe(1);
  });

  it('no reporta horas excedidas cuando está dentro del umbral', () => {
    expect(overdueHours(recipient(), now, 24)).toBe(0);
  });
});
