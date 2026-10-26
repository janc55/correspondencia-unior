import { Prisma } from '@prisma/client';

/** Proyección completa del detalle autorizado de una correspondencia. */
export const correspondenceDetailInclude = Prisma.validator<Prisma.CorrespondenceInclude>()({
  createdBy: { select: { id: true, name: true } },
  routeSheet: {
    include: {
      recipients: {
        orderBy: { sequence: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: { select: { name: true } },
            },
          },
          department: { select: { id: true, name: true, code: true } },
        },
      },
    },
  },
  attachments: {
    orderBy: { createdAt: 'asc' },
    include: { uploadedBy: { select: { id: true, name: true } } },
  },
  events: {
    orderBy: { occurredAt: 'asc' },
    include: {
      actor: { select: { id: true, name: true } },
      recipient: { select: { sequence: true } },
    },
  },
  publicTokens: {
    where: { revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, expiresAt: true },
  },
});

export type CorrespondenceDetailRow = Prisma.CorrespondenceGetPayload<{
  include: typeof correspondenceDetailInclude;
}>;

/** Proyección liviana para listados y bandejas. */
export const correspondenceListInclude = Prisma.validator<Prisma.CorrespondenceInclude>()({
  routeSheet: {
    include: {
      recipients: {
        orderBy: { sequence: 'asc' },
        select: {
          sequence: true,
          status: true,
          createdAt: true,
          receivedAt: true,
          dispatchedAt: true,
        },
      },
    },
  },
});

export type CorrespondenceListRow = Prisma.CorrespondenceGetPayload<{
  include: typeof correspondenceListInclude;
}>;
