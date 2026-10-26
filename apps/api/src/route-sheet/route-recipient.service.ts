import { Injectable } from '@nestjs/common';
import {
  CorrespondenceStatus,
  Prisma,
  RecipientAction,
  RouteRecipientStatus,
  TrackingEventType,
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ApiError } from '../common/errors/api-error';
import { AuthUser } from '../common/types/auth-user';
import { canActOnRecipient } from '../common/access/access.policy';
import { AppConfigService } from '../config/app-config.service';
import {
  isSegmentOverdue,
  overdueHours,
  segmentDurationMinutes,
  waitingHours,
} from '../tracking/overdue';
import {
  allowedActions,
  canClassify,
  canDispatch,
  canReceive,
  computeCorrespondenceStatus,
} from './transitions';
import { NotificationsService } from '../notifications/notifications.service';
import { roundHours } from '../common/utils/date.utils';
import { ClassifyActionDto } from './dto/route-recipient.dto';

const RECIPIENT_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  department: { select: { id: true, name: true, code: true } },
  routeSheet: {
    select: {
      id: true,
      correspondenceId: true,
      correspondence: {
        select: { id: true, trackingNumber: true, subject: true, isArchived: true },
      },
    },
  },
} satisfies Prisma.RouteRecipientInclude;

type RecipientRow = Prisma.RouteRecipientGetPayload<{ include: typeof RECIPIENT_INCLUDE }>;

@Injectable()
export class RouteRecipientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async findMine(user: AuthUser, filters: { status?: RouteRecipientStatus; pending?: boolean }) {
    const now = new Date();
    const where: Prisma.RouteRecipientWhereInput = {
      OR: [
        { userId: user.id },
        ...(user.departmentId ? [{ userId: null, departmentId: user.departmentId }] : []),
      ],
      routeSheet: { correspondence: { isArchived: false } },
    };

    if (filters.pending) where.status = { not: RouteRecipientStatus.DESPACHADO };
    else if (filters.status) where.status = filters.status;

    const rows = await this.prisma.routeRecipient.findMany({
      where,
      include: {
        ...RECIPIENT_INCLUDE,
        routeSheet: {
          select: {
            id: true,
            correspondenceId: true,
            correspondence: {
              select: {
                id: true,
                trackingNumber: true,
                subject: true,
                direction: true,
                senderName: true,
                senderOrganization: true,
                registeredAt: true,
                currentStatus: true,
              },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });

    return rows
      .map((row) => this.toMineItem(row, user, now))
      .sort((a, b) => b.waitingHours - a.waitingHours);
  }

  async receive(id: string, user: AuthUser) {
    const recipient = await this.load(id);
    this.assertCanAct(user, recipient);

    if (!canReceive(recipient.status)) {
      throw ApiError.invalidTransition('El tramo no admite recepción en su estado actual.');
    }

    const now = new Date();
    return this.transition(recipient, user, now, {
      expectedStatus: RouteRecipientStatus.PENDIENTE,
      data: { status: RouteRecipientStatus.RECIBIDO, receivedAt: now },
      eventType: TrackingEventType.RECEPCION,
      toStatus: RouteRecipientStatus.RECIBIDO,
    });
  }

  async classify(id: string, user: AuthUser, dto: ClassifyActionDto) {
    const recipient = await this.load(id);
    this.assertCanAct(user, recipient);

    if (!canClassify(recipient.status)) {
      throw ApiError.invalidTransition(
        'Debe registrar la recepción antes de clasificar el trámite.',
      );
    }

    const now = new Date();
    return this.transition(recipient, user, now, {
      expectedStatus: RouteRecipientStatus.RECIBIDO,
      data: {
        status: RouteRecipientStatus.CLASIFICADO,
        action: dto.action,
        classifiedAt: now,
      },
      eventType: TrackingEventType.CLASIFICACION,
      toStatus: RouteRecipientStatus.CLASIFICADO,
      metadata: { action: dto.action },
    });
  }

  async dispatch(id: string, user: AuthUser, internalNotes?: string) {
    const recipient = await this.load(id);
    this.assertCanAct(user, recipient);

    if (!canDispatch(recipient.status)) {
      throw ApiError.invalidTransition('Debe clasificar el trámite antes de registrar la salida.');
    }

    const now = new Date();
    const notes = internalNotes?.trim();
    const result = await this.transition(recipient, user, now, {
      expectedStatus: RouteRecipientStatus.CLASIFICADO,
      data: {
        status: RouteRecipientStatus.DESPACHADO,
        dispatchedAt: now,
        internalNotes: notes
          ? [recipient.internalNotes, notes].filter(Boolean).join('\n')
          : undefined,
      },
      eventType: TrackingEventType.DESPACHO,
      toStatus: RouteRecipientStatus.DESPACHADO,
    });

    await this.notifyNextRecipient(recipient);
    return result;
  }

  private async transition(
    recipient: RecipientRow,
    user: AuthUser,
    now: Date,
    options: {
      expectedStatus: RouteRecipientStatus;
      data: Prisma.RouteRecipientUpdateManyMutationInput;
      eventType: TrackingEventType;
      toStatus: RouteRecipientStatus;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      // Actualización condicional: evita dobles transiciones por concurrencia.
      const updated = await tx.routeRecipient.updateMany({
        where: { id: recipient.id, status: options.expectedStatus },
        data: options.data,
      });
      if (updated.count === 0) {
        throw ApiError.conflict(
          'El tramo cambió de estado. Recargue la página e intente nuevamente.',
        );
      }

      await tx.trackingEvent.create({
        data: {
          correspondenceId: recipient.routeSheet.correspondenceId,
          recipientId: recipient.id,
          eventType: options.eventType,
          fromStatus: options.expectedStatus,
          toStatus: options.toStatus,
          actorId: user.id,
          occurredAt: now,
          metadata: options.metadata ?? Prisma.JsonNull,
        },
      });

      const correspondenceStatus = await this.syncCorrespondenceStatus(
        tx,
        recipient.routeSheet.id,
        recipient.routeSheet.correspondenceId,
        recipient.routeSheet.correspondence.isArchived,
      );

      const fresh = await tx.routeRecipient.findUniqueOrThrow({
        where: { id: recipient.id },
        include: RECIPIENT_INCLUDE,
      });

      return { fresh, correspondenceStatus };
    });

    return {
      recipient: this.toActionItem(result.fresh, user, now),
      correspondenceStatus: result.correspondenceStatus,
    };
  }

  private async syncCorrespondenceStatus(
    tx: Prisma.TransactionClient,
    routeSheetId: string,
    correspondenceId: string,
    isArchived: boolean,
  ): Promise<CorrespondenceStatus> {
    if (isArchived) return CorrespondenceStatus.ARCHIVADA;

    const recipients = await tx.routeRecipient.findMany({
      where: { routeSheetId },
      select: { status: true },
    });
    const nextStatus = computeCorrespondenceStatus(recipients) as CorrespondenceStatus;

    await tx.correspondence.update({
      where: { id: correspondenceId },
      data: { currentStatus: nextStatus },
    });

    return nextStatus;
  }

  private async notifyNextRecipient(current: RecipientRow): Promise<void> {
    const next = await this.prisma.routeRecipient.findFirst({
      where: {
        routeSheetId: current.routeSheet.id,
        sequence: { gt: current.sequence },
        user: { isNot: null },
      },
      orderBy: { sequence: 'asc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!next?.user?.email) return;

    this.notifications.notifyInBackground(
      this.notifications.sendRecipientAssigned({
        to: next.user.email,
        recipientName: next.user.name,
        trackingNumber: current.routeSheet.correspondence.trackingNumber,
        subject: current.routeSheet.correspondence.subject,
        sequence: next.sequence,
        correspondenceId: current.routeSheet.correspondenceId,
        routeRecipientId: next.id,
      }),
    );
  }

  private async load(id: string): Promise<RecipientRow> {
    const recipient = await this.prisma.routeRecipient.findUnique({
      where: { id },
      include: RECIPIENT_INCLUDE,
    });
    if (!recipient) throw ApiError.notFound('Tramo de hoja de ruta no encontrado.');
    if (recipient.routeSheet.correspondence.isArchived) {
      throw ApiError.conflict('La correspondencia está archivada y no admite cambios.');
    }
    return recipient;
  }

  private assertCanAct(user: AuthUser, recipient: RecipientRow): void {
    const allowed = canActOnRecipient(user, {
      userId: recipient.userId,
      departmentId: recipient.departmentId,
    });
    if (!allowed) {
      throw ApiError.forbidden('Este tramo no está asignado a su usuario o departamento.');
    }
  }

  private toActionItem(recipient: RecipientRow, user: AuthUser, now: Date) {
    const timing = {
      status: recipient.status,
      createdAt: recipient.createdAt,
      receivedAt: recipient.receivedAt,
      classifiedAt: recipient.classifiedAt,
      dispatchedAt: recipient.dispatchedAt,
    };

    return {
      id: recipient.id,
      sequence: recipient.sequence,
      status: recipient.status,
      action: recipient.action,
      receivedAt: recipient.receivedAt,
      classifiedAt: recipient.classifiedAt,
      dispatchedAt: recipient.dispatchedAt,
      internalNotes: recipient.internalNotes,
      durationMinutes: segmentDurationMinutes(timing, now),
      isOverdue: isSegmentOverdue(timing, now, this.config.overdueThresholdHours),
      overdueHours: overdueHours(timing, now, this.config.overdueThresholdHours),
      canAct:
        canActOnRecipient(user, {
          userId: recipient.userId,
          departmentId: recipient.departmentId,
        }) && recipient.status !== RouteRecipientStatus.DESPACHADO,
      allowedActions: allowedActions(recipient.status),
      assignee: recipient.user
        ? { type: 'USER' as const, id: recipient.user.id, name: recipient.user.name }
        : recipient.department
          ? {
              type: 'DEPARTMENT' as const,
              id: recipient.department.id,
              name: recipient.department.name,
            }
          : { type: 'UNASSIGNED' as const, id: null, name: 'Sin asignar' },
    };
  }

  private toMineItem(
    row: RecipientRow & {
      routeSheet: RecipientRow['routeSheet'] & {
        correspondence: {
          id: string;
          trackingNumber: string;
          subject: string;
          direction: string;
          senderName: string;
          senderOrganization: string | null;
          registeredAt: Date;
          currentStatus: CorrespondenceStatus;
        };
      };
    },
    user: AuthUser,
    now: Date,
  ) {
    const timing = {
      status: row.status,
      createdAt: row.createdAt,
      receivedAt: row.receivedAt,
      classifiedAt: row.classifiedAt,
      dispatchedAt: row.dispatchedAt,
    };

    return {
      id: row.id,
      sequence: row.sequence,
      status: row.status,
      action: row.action,
      receivedAt: row.receivedAt,
      classifiedAt: row.classifiedAt,
      dispatchedAt: row.dispatchedAt,
      internalNotes: row.internalNotes,
      canAct:
        canActOnRecipient(user, { userId: row.userId, departmentId: row.departmentId }) &&
        row.status !== RouteRecipientStatus.DESPACHADO,
      allowedActions: allowedActions(row.status),
      correspondence: {
        id: row.routeSheet.correspondence.id,
        trackingNumber: row.routeSheet.correspondence.trackingNumber,
        subject: row.routeSheet.correspondence.subject,
        direction: row.routeSheet.correspondence.direction,
        senderName: row.routeSheet.correspondence.senderName,
        senderOrganization: row.routeSheet.correspondence.senderOrganization,
        registeredAt: row.routeSheet.correspondence.registeredAt,
        currentStatus: row.routeSheet.correspondence.currentStatus,
      },
      waitingHours: roundHours(waitingHours(timing, now)),
      isOverdue: isSegmentOverdue(timing, now, this.config.overdueThresholdHours),
    };
  }

  /** Reexportado para pruebas de reglas de acción. */
  static allowedActionsFor(status: RouteRecipientStatus): string[] {
    return allowedActions(status);
  }
}

export type { RecipientAction };
