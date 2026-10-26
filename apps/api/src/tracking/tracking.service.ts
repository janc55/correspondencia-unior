import { Injectable } from '@nestjs/common';
import { CorrespondenceStatus, RouteRecipientStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { PaginationQueryDto, paginationMeta } from '../common/dto/pagination.dto';
import { endOfInstitutionDay, startOfInstitutionDay } from '../common/utils/date.utils';
import { hoursBetween, roundHours } from '../common/utils/date.utils';
import { isSegmentOverdue, overdueHours, segmentDurationHours } from './overdue';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { NotificationStatus } from '@prisma/client';

type OpenRecipientRow = Awaited<ReturnType<TrackingService['loadOpenRecipients']>>[number];

/**
 * Consultas de seguimiento: demoras, métricas del panel y alertas.
 * Las reglas de cálculo viven en `overdue.ts` (puras y probadas).
 */
@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  get thresholdHours(): number {
    return this.config.overdueThresholdHours;
  }

  async findOverdue(query: PaginationQueryDto) {
    const now = new Date();
    const rows = await this.loadOpenRecipients();
    const threshold = this.thresholdHours;

    const items = rows
      .map((row) => this.mapOverdueItem(row, now))
      .filter((item) => item.hoursElapsed > threshold)
      .sort((a, b) => b.hoursElapsed - a.hoursElapsed);

    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const start = (page - 1) * pageSize;

    return {
      thresholdHours: threshold,
      data: items.slice(start, start + pageSize),
      meta: paginationMeta(items.length, { page, pageSize } as PaginationQueryDto),
    };
  }

  async overdueCorrespondenceIds(now: Date): Promise<string[]> {
    const rows = await this.loadOpenRecipients();
    const ids = new Set<string>();
    for (const row of rows) {
      if (
        isSegmentOverdue(
          {
            status: row.status,
            createdAt: row.createdAt,
            receivedAt: row.receivedAt,
            classifiedAt: row.classifiedAt,
            dispatchedAt: row.dispatchedAt,
          },
          now,
          this.thresholdHours,
        )
      ) {
        ids.add(row.routeSheet.correspondenceId);
      }
    }
    return [...ids];
  }

  async stats() {
    const now = new Date();
    const dayStart = startOfInstitutionDay(now, this.config.timezone);
    const dayEnd = endOfInstitutionDay(now, this.config.timezone);

    const total = await this.prisma.correspondence.count();
    const grouped = await this.prisma.correspondence.groupBy({
      by: ['currentStatus'],
      _count: { _all: true },
    });
    const overdueItems = await this.findOverdue({ page: 1, pageSize: 100 } as PaginationQueryDto);
    const registeredToday = await this.prisma.correspondence.count({
      where: { registeredAt: { gte: dayStart, lt: dayEnd } },
    });
    const dispatched = await this.prisma.routeRecipient.findMany({
      where: { status: RouteRecipientStatus.DESPACHADO, receivedAt: { not: null } },
      select: { receivedAt: true, dispatchedAt: true, createdAt: true },
    });

    const byStatus: Record<string, number> = {
      [CorrespondenceStatus.REGISTRADA]: 0,
      [CorrespondenceStatus.EN_TRAMITE]: 0,
      [CorrespondenceStatus.ATENDIDA]: 0,
      [CorrespondenceStatus.ARCHIVADA]: 0,
    };
    for (const group of grouped) {
      byStatus[group.currentStatus] = group._count._all;
    }

    const attentionHours = dispatched
      .map((row) => hoursBetween(row.receivedAt ?? row.createdAt, row.dispatchedAt ?? now))
      .filter((value) => Number.isFinite(value));

    const averageAttentionHours =
      attentionHours.length === 0
        ? null
        : roundHours(attentionHours.reduce((sum, value) => sum + value, 0) / attentionHours.length);

    return {
      total,
      byStatus,
      overdue: overdueItems.meta.total,
      registeredToday,
      averageAttentionHours,
      thresholdHours: this.thresholdHours,
    };
  }

  async notifyOverdue(): Promise<{
    checked: number;
    sent: number;
    failed: number;
    skipped: number;
  }> {
    const now = new Date();
    const rows = await this.loadOpenRecipients();
    const overdue = rows
      .map((row) => this.mapOverdueItem(row, now))
      .filter((item) => item.hoursElapsed > this.thresholdHours);

    if (overdue.length === 0) {
      return { checked: 0, sent: 0, failed: 0, skipped: 0 };
    }

    const status = await this.notifications.sendOverdueDigest({
      to: this.notifications.trackingTeamEmail,
      thresholdHours: this.thresholdHours,
      items: overdue.slice(0, 30).map((item) => ({
        trackingNumber: item.trackingNumber,
        subject: item.subject,
        assignee: item.assigneeName,
        hoursElapsed: item.hoursElapsed,
        sequence: item.recipientSequence,
      })),
    });

    await this.audit.log({
      action: 'tracking.overdue_alert',
      entityType: 'Tracking',
      metadata: { checked: overdue.length, status },
    });

    return {
      checked: overdue.length,
      sent: status === NotificationStatus.ENVIADO ? 1 : 0,
      failed: status === NotificationStatus.FALLIDO ? 1 : 0,
      skipped: status === NotificationStatus.OMITIDO ? 1 : 0,
    };
  }

  private async loadOpenRecipients() {
    return this.prisma.routeRecipient.findMany({
      where: {
        status: { not: RouteRecipientStatus.DESPACHADO },
        routeSheet: { correspondence: { isArchived: false } },
      },
      include: {
        user: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        routeSheet: {
          select: {
            correspondenceId: true,
            correspondence: {
              select: {
                id: true,
                trackingNumber: true,
                subject: true,
                registeredAt: true,
                currentStatus: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private mapOverdueItem(row: OpenRecipientRow, now: Date) {
    const timing = {
      status: row.status,
      createdAt: row.createdAt,
      receivedAt: row.receivedAt,
      classifiedAt: row.classifiedAt,
      dispatchedAt: row.dispatchedAt,
    };

    return {
      correspondenceId: row.routeSheet.correspondence.id,
      trackingNumber: row.routeSheet.correspondence.trackingNumber,
      subject: row.routeSheet.correspondence.subject,
      recipientId: row.id,
      recipientSequence: row.sequence,
      status: row.status,
      assigneeName: row.user?.name ?? row.department?.name ?? 'Sin asignar',
      since: row.receivedAt ?? row.createdAt,
      hoursElapsed: roundHours(segmentDurationHours(timing, now)),
      overdueBy: overdueHours(timing, now, this.thresholdHours),
    };
  }
}
