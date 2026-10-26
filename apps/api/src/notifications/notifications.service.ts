import { Injectable, Logger } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { MailerService } from './mailer.service';
import { overdueEmailTemplate, recipientAssignedTemplate } from './mail.templates';

export type NotificationTarget = {
  email: string;
  name?: string;
  correspondenceId?: string;
  routeRecipientId?: string;
  template: string;
};

/**
 * Notificaciones no bloqueantes: el flujo de correspondencia nunca espera al
 * SMTP ni falla por un correo. Cada intento queda registrado en NotificationLog.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly config: AppConfigService,
  ) {}

  async sendRecipientAssigned(params: {
    to: string;
    recipientName: string;
    trackingNumber: string;
    subject: string;
    sequence: number;
    correspondenceId: string;
    routeRecipientId: string;
  }): Promise<NotificationStatus> {
    const { subject: mailSubject, text, html } = recipientAssignedTemplate(params);
    return this.dispatch({
      email: params.to,
      correspondenceId: params.correspondenceId,
      routeRecipientId: params.routeRecipientId,
      template: 'recipient_assigned',
      subject: mailSubject,
      text,
      html,
    });
  }

  async sendOverdueDigest(params: {
    to: string;
    thresholdHours: number;
    items: Array<{
      trackingNumber: string;
      subject: string;
      assignee: string;
      hoursElapsed: number;
      sequence: number;
    }>;
  }): Promise<NotificationStatus> {
    if (!params.to) return NotificationStatus.OMITIDO;
    const { subject, text, html } = overdueEmailTemplate(params);
    return this.dispatch({
      email: params.to,
      template: 'overdue_digest',
      subject,
      text,
      html,
    });
  }

  private async dispatch(params: {
    email: string;
    template: string;
    subject: string;
    text: string;
    html: string;
    correspondenceId?: string;
    routeRecipientId?: string;
  }): Promise<NotificationStatus> {
    if (!this.mailer.isConfigured) {
      await this.record({
        ...params,
        status: NotificationStatus.OMITIDO,
        attempts: 1,
      });
      return NotificationStatus.OMITIDO;
    }

    try {
      await this.mailer.send({
        to: params.email,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      await this.record({
        ...params,
        status: NotificationStatus.ENVIADO,
        attempts: 1,
        sentAt: new Date(),
      });
      return NotificationStatus.ENVIADO;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido de SMTP';
      this.logger.warn(`No se pudo enviar el correo ${params.template}: ${message}`);
      await this.record({
        ...params,
        status: NotificationStatus.FALLIDO,
        attempts: 1,
        errorCode: 'SMTP_ERROR',
        errorMessage: message.slice(0, 500),
      });
      return NotificationStatus.FALLIDO;
    }
  }

  private async record(params: {
    email: string;
    template: string;
    status: NotificationStatus;
    attempts: number;
    sentAt?: Date;
    errorCode?: string;
    errorMessage?: string;
    correspondenceId?: string;
    routeRecipientId?: string;
  }): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          recipientEmail: params.email,
          template: params.template,
          status: params.status,
          attempts: params.attempts,
          sentAt: params.sentAt ?? null,
          errorCode: params.errorCode ?? null,
          errorMessage: params.errorMessage ?? null,
          correspondenceId: params.correspondenceId ?? null,
          routeRecipientId: params.routeRecipientId ?? null,
        },
      });
    } catch (error) {
      this.logger.error(`No se pudo registrar la notificación: ${(error as Error).message}`);
    }
  }

  /** Envoltura segura para no propagar fallos de correo al flujo principal. */
  notifyInBackground(promise: Promise<unknown>): void {
    void promise.catch((error: unknown) => {
      this.logger.warn(`Notificación descartada: ${(error as Error).message}`);
    });
  }

  async findAll(status: NotificationStatus | undefined, page: number, pageSize: number) {
    const where = status ? { status } : {};
    const take = Math.min(100, Math.max(1, pageSize));
    const skip = (Math.max(1, page) - 1) * take;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.notificationLog.count({ where }),
      this.prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          correspondence: { select: { trackingNumber: true } },
        },
      }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        recipientEmail: row.recipientEmail,
        template: row.template,
        status: row.status,
        attempts: row.attempts,
        sentAt: row.sentAt,
        errorCode: row.errorCode,
        createdAt: row.createdAt,
        trackingNumber: row.correspondence?.trackingNumber ?? null,
      })),
      meta: {
        page: Math.max(1, page),
        pageSize: take,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / take),
      },
    };
  }

  get trackingTeamEmail(): string {
    return this.config.mailTrackingTeam;
  }
}
