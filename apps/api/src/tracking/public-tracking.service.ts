import { Injectable } from '@nestjs/common';
import { RouteRecipientStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { ApiError } from '../common/errors/api-error';
import { AuditService } from '../audit/audit.service';
import { normalizeTrackingNumber } from '../correspondence/correlative';
import { hashPublicCode, verifyPublicCode } from './public-code';

const GENERIC_NOT_FOUND = 'No se encontró una correspondencia con los datos proporcionados.';

@Injectable()
export class PublicTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Consulta externa: exige correlativo + código de verificación. La respuesta
   * es mínima (sin remitente, asunto, nombres ni anexos) y el error es genérico
   * para no permitir enumeración de correlativos.
   */
  async lookup(rawNumber: string, rawCode: string, meta: { ip?: string | null }) {
    const trackingNumber = normalizeTrackingNumber(rawNumber);
    const correspondence = await this.prisma.correspondence.findUnique({
      where: { trackingNumber },
      include: {
        publicTokens: { where: { revokedAt: null } },
        routeSheet: {
          include: {
            recipients: {
              orderBy: { sequence: 'asc' },
              select: {
                sequence: true,
                status: true,
                receivedAt: true,
                dispatchedAt: true,
              },
            },
          },
        },
      },
    });

    const now = new Date();
    const token = correspondence?.publicTokens.find(
      (candidate) => !candidate.expiresAt || candidate.expiresAt.getTime() > now.getTime(),
    );

    const codeValid =
      Boolean(correspondence) &&
      Boolean(token) &&
      verifyPublicCode(rawCode, token?.tokenHash ?? '', this.config.publicVerificationSecret);

    if (!correspondence || !token || !codeValid) {
      await this.audit.log({
        action: 'tracking.public_lookup_failed',
        entityType: 'Tracking',
        entityId: correspondence?.id ?? null,
        ip: meta.ip ?? null,
        metadata: { trackingNumber },
      });
      throw new ApiError(404, 'NOT_FOUND', GENERIC_NOT_FOUND);
    }

    const recipients = correspondence.routeSheet?.recipients ?? [];
    const lastMovement = recipients.reduce<Date>((latest, recipient) => {
      const candidate = recipient.dispatchedAt ?? recipient.receivedAt;
      if (!candidate) return latest;
      return candidate.getTime() > latest.getTime() ? candidate : latest;
    }, correspondence.registeredAt);

    const publicStatus = resolvePublicStatus(
      correspondence.isArchived,
      recipients.map((recipient) => recipient.status),
    );

    await this.prisma.publicTrackingToken.update({
      where: { id: token.id },
      data: { lastUsedAt: now },
    });

    await this.audit.log({
      action: 'tracking.public_lookup',
      entityType: 'Tracking',
      entityId: correspondence.id,
      ip: meta.ip ?? null,
      metadata: { trackingNumber },
    });

    return {
      trackingNumber: correspondence.trackingNumber,
      publicStatus,
      publicStatusLabel: PUBLIC_STATUS_LABELS[publicStatus],
      registeredAt: correspondence.registeredAt,
      lastMovementAt: lastMovement,
      recipients: recipients.map((recipient) => ({
        sequence: recipient.sequence,
        statusLabel: publicRecipientLabel(recipient.status),
        receivedAt: recipient.receivedAt,
        dispatchedAt: recipient.dispatchedAt,
      })),
    };
  }

  /** Utilidad interna para pruebas: hash esperado de un código. */
  hash(code: string): string {
    return hashPublicCode(code, this.config.publicVerificationSecret);
  }
}

export type PublicStatus = 'RECIBIDO' | 'EN_CURSO' | 'FINALIZADO' | 'ARCHIVADO';

export const PUBLIC_STATUS_LABELS: Record<PublicStatus, string> = {
  RECIBIDO: 'Recibido',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  ARCHIVADO: 'Archivado',
};

export function resolvePublicStatus(
  isArchived: boolean,
  statuses: RouteRecipientStatus[],
): PublicStatus {
  if (isArchived) return 'ARCHIVADO';
  if (
    statuses.length > 0 &&
    statuses.every((status) => status === RouteRecipientStatus.DESPACHADO)
  ) {
    return 'FINALIZADO';
  }
  if (statuses.every((status) => status === RouteRecipientStatus.PENDIENTE)) return 'RECIBIDO';
  return 'EN_CURSO';
}

export function publicRecipientLabel(status: RouteRecipientStatus): string {
  switch (status) {
    case RouteRecipientStatus.PENDIENTE:
      return 'Pendiente';
    case RouteRecipientStatus.RECIBIDO:
    case RouteRecipientStatus.CLASIFICADO:
      return 'En proceso';
    case RouteRecipientStatus.DESPACHADO:
      return 'Finalizado';
    default:
      return 'Pendiente';
  }
}
