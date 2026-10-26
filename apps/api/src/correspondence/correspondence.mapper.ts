import { RouteRecipientStatus } from '@prisma/client';
import { AuthUser } from '../common/types/auth-user';
import { canActOnRecipient } from '../common/access/access.policy';
import { minutesBetween, roundHours } from '../common/utils/date.utils';
import { isSegmentOverdue, overdueHours, segmentDurationMinutes } from '../tracking/overdue';
import { CorrespondenceDetailRow, CorrespondenceListRow } from './correspondence.includes';

type RecipientForTiming = {
  status: RouteRecipientStatus;
  createdAt: Date;
  receivedAt: Date | null;
  classifiedAt?: Date | null;
  dispatchedAt: Date | null;
};

export function toCorrespondenceSummary(
  row: CorrespondenceListRow,
  now: Date,
  thresholdHours: number,
) {
  const recipients = row.routeSheet?.recipients ?? [];

  return {
    id: row.id,
    trackingNumber: row.trackingNumber,
    direction: row.direction,
    subject: row.subject,
    senderName: row.senderName,
    senderOrganization: row.senderOrganization,
    registeredAt: row.registeredAt,
    currentStatus: row.currentStatus,
    isArchived: row.isArchived,
    recipientsTotal: recipients.length,
    recipientsCompleted: recipients.filter((r) => r.status === RouteRecipientStatus.DESPACHADO)
      .length,
    hasOverdueSegment: recipients.some((r) =>
      isSegmentOverdue(r as RecipientForTiming, now, thresholdHours),
    ),
  };
}

export function toCorrespondenceDetail(
  row: CorrespondenceDetailRow,
  user: AuthUser,
  now: Date,
  thresholdHours: number,
) {
  const recipients = row.routeSheet?.recipients ?? [];

  const mappedRecipients = recipients.map((recipient) => {
    const timing: RecipientForTiming = {
      status: recipient.status,
      createdAt: recipient.createdAt,
      receivedAt: recipient.receivedAt,
      classifiedAt: recipient.classifiedAt,
      dispatchedAt: recipient.dispatchedAt,
    };

    const assignee = recipient.user
      ? {
          type: 'USER' as const,
          id: recipient.user.id,
          name: recipient.user.name,
          department: recipient.user.department?.name ?? null,
        }
      : recipient.department
        ? {
            type: 'DEPARTMENT' as const,
            id: recipient.department.id,
            name: recipient.department.name,
            department: recipient.department.name,
          }
        : { type: 'UNASSIGNED' as const, id: null, name: 'Sin asignar', department: null };

    return {
      id: recipient.id,
      sequence: recipient.sequence,
      status: recipient.status,
      action: recipient.action,
      receivedAt: recipient.receivedAt,
      classifiedAt: recipient.classifiedAt,
      dispatchedAt: recipient.dispatchedAt,
      internalNotes: recipient.internalNotes,
      assignee,
      durationMinutes: segmentDurationMinutes(timing, now),
      isOverdue: isSegmentOverdue(timing, now, thresholdHours),
      overdueHours: overdueHours(timing, now, thresholdHours),
      canAct:
        canActOnRecipient(user, {
          userId: recipient.userId,
          departmentId: recipient.departmentId,
        }) && recipient.status !== RouteRecipientStatus.DESPACHADO,
    };
  });

  const overdueSegments = mappedRecipients.filter((recipient) => recipient.isOverdue).length;

  return {
    id: row.id,
    trackingNumber: row.trackingNumber,
    year: row.year,
    sequence: row.sequence,
    direction: row.direction,
    subject: row.subject,
    summary: row.summary,
    senderName: row.senderName,
    senderOrganization: row.senderOrganization,
    senderReference: row.senderReference,
    registeredAt: row.registeredAt,
    currentStatus: row.currentStatus,
    isArchived: row.isArchived,
    archivedAt: row.archivedAt,
    createdBy: row.createdBy,
    routeSheet: row.routeSheet
      ? {
          id: row.routeSheet.id,
          createdAt: row.routeSheet.createdAt,
          recipients: mappedRecipients,
        }
      : null,
    attachments: row.attachments.map((attachment) => ({
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      checksum: attachment.checksum,
      createdAt: attachment.createdAt,
      uploadedBy: attachment.uploadedBy,
    })),
    events: row.events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      occurredAt: event.occurredAt,
      actor: event.actor,
      recipientSequence: event.recipient?.sequence ?? null,
      metadata: event.metadata,
    })),
    publicTracking: {
      hasActiveToken: row.publicTokens.length > 0,
      expiresAt: row.publicTokens[0]?.expiresAt ?? null,
      createdAt: row.publicTokens[0]?.createdAt ?? null,
    },
    metrics: {
      elapsedHours: roundHours(minutesBetween(row.registeredAt, now) / 60),
      overdueSegments,
      thresholdHours,
    },
  };
}

export type CorrespondenceSummaryDto = ReturnType<typeof toCorrespondenceSummary>;
export type CorrespondenceDetailDto = ReturnType<typeof toCorrespondenceDetail>;
