import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginationQueryDto, paginationArgs, paginationMeta } from '../common/dto/pagination.dto';

export type AuditEntry = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

export type AuditQuery = PaginationQueryDto & {
  action?: string;
  entityType?: string;
  actorId?: string;
  from?: string;
  to?: string;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * La auditoría nunca debe romper la operación de negocio: si falla el
   * registro se deja traza en el log del servidor y se continúa.
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          requestId: entry.requestId ?? null,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
          metadata: entry.metadata ?? Prisma.JsonNull,
        },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo registrar auditoría (${entry.action}): ${(error as Error).message}`,
      );
    }
  }

  async findAll(query: AuditQuery) {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.entityType) where.entityType = query.entityType;
    if (query.actorId) where.actorId = query.actorId;

    if (query.from || query.to) {
      where.occurredAt = {};
      if (query.from) where.occurredAt.gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) where.occurredAt.lte = new Date(`${query.to}T23:59:59.999Z`);
    }

    const { skip, take } = paginationArgs(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take,
        include: { actor: { select: { id: true, name: true, role: true } } },
      }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        occurredAt: row.occurredAt,
        requestId: row.requestId,
        ip: row.ip,
        actor: row.actor,
        metadata: row.metadata,
      })),
      meta: paginationMeta(total, query),
    };
  }
}
