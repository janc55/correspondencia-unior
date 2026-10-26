import { Injectable } from '@nestjs/common';
import { CorrespondenceStatus, Prisma, TrackingEventType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { ApiError } from '../common/errors/api-error';
import { AuthUser } from '../common/types/auth-user';
import { paginationArgs, paginationMeta } from '../common/dto/pagination.dto';
import {
  canAccessCorrespondence,
  correspondenceScopeFilter,
  RecipientAccess,
} from '../common/access/access.policy';
import {
  endOfInstitutionDay,
  institutionYear,
  startOfInstitutionDay,
} from '../common/utils/date.utils';
import { formatTrackingNumber, normalizeTrackingNumber } from './correlative';
import { correspondenceDetailInclude, correspondenceListInclude } from './correspondence.includes';
import { toCorrespondenceDetail, toCorrespondenceSummary } from './correspondence.mapper';
import { generatePublicCode, hashPublicCode } from '../tracking/public-code';
import { TrackingService } from '../tracking/tracking.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCorrespondenceDto, ListCorrespondencesQueryDto } from './dto/correspondence.dto';

@Injectable()
export class CorrespondenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly tracking: TrackingService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateCorrespondenceDto, user: AuthUser, requestId?: string) {
    const recipients = this.normalizeRecipients(dto);
    await this.validateRecipients(recipients);

    const now = new Date();
    const year = institutionYear(now, this.config.timezone);
    const publicCode = generatePublicCode();
    const tokenHash = hashPublicCode(publicCode, this.config.publicVerificationSecret);

    const created = await this.prisma.$transaction(
      async (tx) => {
        // Secuencia atómica por año: INSERT ... ON CONFLICT evita huecos y carreras.
        const rows = await tx.$queryRaw<Array<{ value: number }>>`
          INSERT INTO correlative_sequences (year, value)
          VALUES (${year}, 1)
          ON CONFLICT (year) DO UPDATE SET value = correlative_sequences.value + 1
          RETURNING value
        `;
        const sequence = Number(rows[0]?.value ?? 0);
        if (!Number.isInteger(sequence) || sequence < 1) {
          throw new Error('No se pudo generar el correlativo.');
        }

        return tx.correspondence.create({
          data: {
            trackingNumber: formatTrackingNumber(year, sequence),
            year,
            sequence,
            direction: dto.direction,
            subject: dto.subject.trim(),
            summary: dto.summary?.trim() ?? null,
            senderName: dto.senderName.trim(),
            senderOrganization: dto.senderOrganization?.trim() ?? null,
            senderReference: dto.senderReference?.trim() ?? null,
            registeredAt: now,
            createdById: user.id,
            currentStatus: CorrespondenceStatus.REGISTRADA,
            routeSheet: {
              create: {
                createdById: user.id,
                recipients: {
                  create: recipients.map((recipient, index) => ({
                    sequence: index + 1,
                    userId: recipient.userId ?? null,
                    departmentId: recipient.userId ? null : (recipient.departmentId ?? null),
                    internalNotes: recipient.internalNotes?.trim() ?? null,
                  })),
                },
              },
            },
            events: {
              create: {
                eventType: TrackingEventType.REGISTRO,
                toStatus: CorrespondenceStatus.REGISTRADA,
                actorId: user.id,
                occurredAt: now,
                requestId: requestId ?? null,
              },
            },
            publicTokens: {
              create: { tokenHash, expiresAt: null },
            },
          },
          include: correspondenceDetailInclude,
        });
      },
      { timeout: 20_000 },
    );

    const firstRecipient = created.routeSheet?.recipients.find(
      (recipient) => recipient.user?.email,
    );
    if (firstRecipient?.user?.email) {
      this.notifications.notifyInBackground(
        this.notifications.sendRecipientAssigned({
          to: firstRecipient.user.email,
          recipientName: firstRecipient.user.name,
          trackingNumber: created.trackingNumber,
          subject: created.subject,
          sequence: firstRecipient.sequence,
          correspondenceId: created.id,
          routeRecipientId: firstRecipient.id,
        }),
      );
    }

    // El código público solo se devuelve en este momento: en base se guarda su HMAC.
    return {
      correspondence: toCorrespondenceDetail(created, user, now, this.tracking.thresholdHours),
      publicAccess: {
        trackingNumber: created.trackingNumber,
        code: publicCode,
        expiresAt: null,
      },
    };
  }

  async findAll(query: ListCorrespondencesQueryDto, user: AuthUser) {
    const now = new Date();
    const where: Prisma.CorrespondenceWhereInput = {};

    const scope = correspondenceScopeFilter(user) as Prisma.CorrespondenceWhereInput;
    if (scope.OR) where.OR = scope.OR as Prisma.CorrespondenceWhereInput[];

    const and: Prisma.CorrespondenceWhereInput[] = [];

    if (query.status) and.push({ currentStatus: query.status });
    if (query.direction) and.push({ direction: query.direction });
    if (query.search) {
      const search = query.search.trim();
      and.push({
        OR: [
          { trackingNumber: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { senderName: { contains: search, mode: 'insensitive' } },
          { senderOrganization: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (query.from) and.push({ registeredAt: { gte: this.parseDay(query.from) } });
    if (query.to) and.push({ registeredAt: { lt: this.parseDay(query.to, true) } });

    if (query.mine) {
      and.push({
        routeSheet: {
          recipients: {
            some: {
              OR: [
                { userId: user.id },
                ...(user.departmentId ? [{ userId: null, departmentId: user.departmentId }] : []),
              ],
            },
          },
        },
      });
    }

    if (query.overdue) {
      const ids = await this.tracking.overdueCorrespondenceIds(now);
      and.push({ id: { in: ids } });
    }

    if (and.length > 0) where.AND = and;

    const { skip, take } = paginationArgs(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.correspondence.count({ where }),
      this.prisma.correspondence.findMany({
        where,
        include: correspondenceListInclude,
        orderBy: { registeredAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return {
      data: rows.map((row) => toCorrespondenceSummary(row, now, this.tracking.thresholdHours)),
      meta: paginationMeta(total, query),
    };
  }

  async findOne(id: string, user: AuthUser) {
    const row = await this.prisma.correspondence.findUnique({
      where: { id },
      include: correspondenceDetailInclude,
    });
    if (!row) throw ApiError.notFound('Correspondencia no encontrada.');
    this.assertAccess(
      { createdById: row.createdById, recipients: row.routeSheet?.recipients ?? [] },
      user,
    );
    return toCorrespondenceDetail(row, user, new Date(), this.tracking.thresholdHours);
  }

  async findByNumber(rawNumber: string, user: AuthUser) {
    const trackingNumber = normalizeTrackingNumber(rawNumber);
    const row = await this.prisma.correspondence.findUnique({
      where: { trackingNumber },
      include: correspondenceDetailInclude,
    });
    if (!row) throw ApiError.notFound('Correspondencia no encontrada.');
    this.assertAccess(
      { createdById: row.createdById, recipients: row.routeSheet?.recipients ?? [] },
      user,
    );
    return toCorrespondenceDetail(row, user, new Date(), this.tracking.thresholdHours);
  }

  async archive(id: string, reason: string | undefined, user: AuthUser) {
    const existing = await this.prisma.correspondence.findUnique({
      where: { id },
      include: { routeSheet: { include: { recipients: true } } },
    });
    if (!existing) throw ApiError.notFound('Correspondencia no encontrada.');
    if (existing.isArchived) throw ApiError.conflict('La correspondencia ya está archivada.');

    const now = new Date();
    const updated = await this.prisma.correspondence.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: now,
        archivedById: user.id,
        currentStatus: CorrespondenceStatus.ARCHIVADA,
        events: {
          create: {
            eventType: TrackingEventType.ARCHIVADO,
            fromStatus: existing.currentStatus,
            toStatus: CorrespondenceStatus.ARCHIVADA,
            actorId: user.id,
            occurredAt: now,
            metadata: { reason: reason?.trim() ?? null },
          },
        },
      },
      include: correspondenceDetailInclude,
    });

    return toCorrespondenceDetail(updated, user, now, this.tracking.thresholdHours);
  }

  /** Rota el código público: el anterior queda revocado de inmediato. */
  async regeneratePublicCode(id: string, user: AuthUser) {
    const existing = await this.prisma.correspondence.findUnique({
      where: { id },
      select: {
        id: true,
        trackingNumber: true,
        createdById: true,
        routeSheet: {
          select: { recipients: { select: { userId: true, departmentId: true } } },
        },
      },
    });
    if (!existing) throw ApiError.notFound('Correspondencia no encontrada.');

    this.assertAccess(
      {
        createdById: existing.createdById,
        recipients: existing.routeSheet?.recipients ?? [],
      },
      user,
    );

    const code = generatePublicCode();
    const tokenHash = hashPublicCode(code, this.config.publicVerificationSecret);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.publicTrackingToken.updateMany({
        where: { correspondenceId: id, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.publicTrackingToken.create({
        data: { correspondenceId: id, tokenHash, expiresAt: null },
      }),
      this.prisma.trackingEvent.create({
        data: {
          correspondenceId: id,
          eventType: TrackingEventType.ACTUALIZACION,
          actorId: user.id,
          occurredAt: now,
          metadata: { change: 'public_code_rotated' },
        },
      }),
    ]);

    return { trackingNumber: existing.trackingNumber, code, expiresAt: null };
  }

  private assertAccess(
    row: { createdById: string; recipients: RecipientAccess[] },
    user: AuthUser,
  ) {
    const allowed = canAccessCorrespondence(user, {
      createdById: row.createdById,
      recipients: row.recipients,
    });
    if (!allowed) {
      throw ApiError.forbidden('No tiene acceso a esta correspondencia.');
    }
  }

  private normalizeRecipients(dto: CreateCorrespondenceDto) {
    const seen = new Set<string>();

    return dto.recipients.map((recipient, index) => {
      if (!recipient.userId && !recipient.departmentId) {
        throw ApiError.validation(
          `El destinatario ${index + 1} debe indicar un usuario o un departamento.`,
        );
      }

      const key = recipient.userId ? `user:${recipient.userId}` : `dept:${recipient.departmentId}`;
      if (seen.has(key)) {
        throw ApiError.validation('No se puede repetir el mismo destinatario en la hoja de ruta.');
      }
      seen.add(key);

      return recipient;
    });
  }

  private async validateRecipients(recipients: CreateCorrespondenceDto['recipients']) {
    const userIds = [
      ...new Set(recipients.map((r) => r.userId).filter((id): id is string => Boolean(id))),
    ];
    const departmentIds = [
      ...new Set(
        recipients
          .filter((recipient) => !recipient.userId)
          .map((r) => r.departmentId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [users, departments] = await Promise.all([
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, active: true },
          })
        : Promise.resolve([]),
      departmentIds.length
        ? this.prisma.department.findMany({
            where: { id: { in: departmentIds } },
            select: { id: true, name: true, active: true },
          })
        : Promise.resolve([]),
    ]);

    for (const userId of userIds) {
      const found = users.find((user) => user.id === userId);
      if (!found) throw ApiError.validation('Uno de los usuarios destinatarios no existe.');
      if (!found.active) {
        throw ApiError.validation(`El usuario destinatario "${found.name}" está inactivo.`);
      }
    }

    for (const departmentId of departmentIds) {
      const found = departments.find((department) => department.id === departmentId);
      if (!found) throw ApiError.validation('Uno de los departamentos destinatarios no existe.');
      if (!found.active) {
        throw ApiError.validation(`El departamento destinatario "${found.name}" está inactivo.`);
      }
    }
  }

  private parseDay(value: string, endOfDay = false): Date {
    const [year, month, day] = value.split('-').map(Number);
    const reference = new Date(Date.UTC(year, month - 1, day, 12));
    return endOfDay
      ? endOfInstitutionDay(reference, this.config.timezone)
      : startOfInstitutionDay(reference, this.config.timezone);
  }
}
