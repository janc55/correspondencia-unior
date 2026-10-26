import { Role } from '@prisma/client';
import {
  canAccessCorrespondence,
  canActOnRecipient,
  canArchive,
  canManagePublicCode,
  canViewAudit,
  correspondenceScopeFilter,
} from './access.policy';
import { AuthUser } from '../types/auth-user';

const JURIDICA = '11111111-1111-4111-8111-111111111111';
const ACADEMICA = '22222222-2222-4222-8222-222222222222';

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    name: 'Usuario',
    email: 'usuario@unior.edu.bo',
    role: Role.DESTINATARIO,
    departmentId: JURIDICA,
    ...overrides,
  };
}

describe('política de acceso a correspondencias', () => {
  const correspondence = {
    createdById: 'creator-1',
    recipients: [{ userId: 'user-2', departmentId: null }],
  };

  it('permite a los roles de alcance global ver cualquier correspondencia', () => {
    expect(canAccessCorrespondence(user({ role: Role.ADMIN }), correspondence)).toBe(true);
    expect(canAccessCorrespondence(user({ role: Role.RECEPCION }), correspondence)).toBe(true);
    expect(canAccessCorrespondence(user({ role: Role.SEGUIMIENTO }), correspondence)).toBe(true);
  });

  it('limita al destinatario a sus propias asignaciones', () => {
    const outsider = user({ id: 'user-3', departmentId: 'otro-depto' });
    expect(canAccessCorrespondence(outsider, correspondence)).toBe(false);

    const assignedUser = user({ id: 'user-2', departmentId: null });
    expect(canAccessCorrespondence(assignedUser, correspondence)).toBe(true);

    const departmentMatch = user({ id: 'user-4', departmentId: JURIDICA });
    expect(
      canAccessCorrespondence(departmentMatch, {
        createdById: 'creator-1',
        recipients: [{ userId: null, departmentId: JURIDICA }],
      }),
    ).toBe(true);
    expect(
      canAccessCorrespondence(departmentMatch, {
        createdById: 'creator-1',
        recipients: [{ userId: null, departmentId: ACADEMICA }],
      }),
    ).toBe(false);
  });

  it('permite al destinatario operar solo su tramo', () => {
    const owner = user({ id: 'user-2', departmentId: null });
    expect(canActOnRecipient(owner, { userId: 'user-2', departmentId: null })).toBe(true);
    expect(canActOnRecipient(owner, { userId: 'user-9', departmentId: null })).toBe(false);

    const departmentOwner = user({ id: 'user-5', departmentId: JURIDICA });
    expect(canActOnRecipient(departmentOwner, { userId: null, departmentId: JURIDICA })).toBe(true);
    expect(canActOnRecipient(departmentOwner, { userId: 'user-2', departmentId: JURIDICA })).toBe(
      false,
    );

    // Un usuario con rol de seguimiento no opera trámites ajenos.
    expect(
      canActOnRecipient(user({ role: Role.SEGUIMIENTO }), { userId: 'user-2', departmentId: null }),
    ).toBe(false);
    expect(
      canActOnRecipient(user({ role: Role.ADMIN }), { userId: 'user-2', departmentId: null }),
    ).toBe(true);
  });

  it('construye el filtro Prisma del destinatario sin filtrar por departamento nulo', () => {
    const filter = correspondenceScopeFilter(
      user({ id: 'user-7', role: Role.DESTINATARIO, departmentId: null }),
    );
    expect(filter).toHaveProperty('OR');
    const or = (filter as { OR: Array<Record<string, unknown>> }).OR;
    expect(or).toHaveLength(2);
    expect(correspondenceScopeFilter(user({ role: Role.ADMIN }))).toEqual({});
  });

  it('restringe operaciones administrativas por rol', () => {
    expect(canManagePublicCode(Role.RECEPCION)).toBe(true);
    expect(canManagePublicCode(Role.DESTINATARIO)).toBe(false);
    expect(canArchive(Role.SEGUIMIENTO)).toBe(true);
    expect(canArchive(Role.RECEPCION)).toBe(false);
    expect(canViewAudit(Role.SEGUIMIENTO)).toBe(true);
    expect(canViewAudit(Role.DESTINATARIO)).toBe(false);
  });
});
