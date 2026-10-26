import { Injectable, Logger } from '@nestjs/common';
import { TrackingEventType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { ApiError } from '../common/errors/api-error';
import { AuthUser } from '../common/types/auth-user';
import { canAccessCorrespondence } from '../common/access/access.policy';
import { StorageService } from './storage.service';
import { detectAllowedFileType, sanitizeOriginalName } from './file-validation';

export type UploadedFileLike = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly storage: StorageService,
  ) {}

  async upload(correspondenceId: string, user: AuthUser, file?: UploadedFileLike) {
    if (!file?.buffer?.length) {
      throw ApiError.validation('Debe adjuntar un archivo en el campo "file".');
    }
    if (file.size > this.config.maxAttachmentBytes) {
      throw ApiError.tooLarge(
        `El archivo supera el máximo de ${Math.round(this.config.maxAttachmentBytes / (1024 * 1024))} MB.`,
      );
    }
    if (file.size === 0) {
      throw ApiError.validation('El archivo está vacío.');
    }

    const correspondence = await this.prisma.correspondence.findUnique({
      where: { id: correspondenceId },
      include: {
        routeSheet: {
          select: { recipients: { select: { userId: true, departmentId: true } } },
        },
      },
    });
    if (!correspondence) throw ApiError.notFound('Correspondencia no encontrada.');
    if (correspondence.isArchived) {
      throw ApiError.conflict('La correspondencia está archivada y no admite cambios.');
    }

    const allowed = canAccessCorrespondence(user, {
      createdById: correspondence.createdById,
      recipients: correspondence.routeSheet?.recipients ?? [],
    });
    if (!allowed) throw ApiError.forbidden('No tiene acceso a esta correspondencia.');

    const detected = detectAllowedFileType(file.buffer);
    const stored = await this.storage.save({
      correspondenceId,
      extension: detected.extension,
      buffer: file.buffer,
    });

    try {
      const attachment = await this.prisma.attachment.create({
        data: {
          correspondenceId,
          originalName: sanitizeOriginalName(file.originalname),
          storageKey: stored.storageKey,
          mimeType: detected.mimeType,
          sizeBytes: stored.sizeBytes,
          checksum: stored.checksum,
          uploadedById: user.id,
        },
      });

      await this.prisma.trackingEvent.create({
        data: {
          correspondenceId,
          eventType: TrackingEventType.ANEXO,
          actorId: user.id,
          metadata: { attachmentId: attachment.id, mimeType: detected.mimeType },
        },
      });

      return {
        id: attachment.id,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        checksum: attachment.checksum,
        createdAt: attachment.createdAt,
      };
    } catch (error) {
      // Si falla la persistencia, el archivo físico no debe quedar huérfano.
      await this.storage.remove(stored.storageKey);
      throw error;
    }
  }

  async download(attachmentId: string, user: AuthUser) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        correspondence: {
          include: {
            routeSheet: {
              select: { recipients: { select: { userId: true, departmentId: true } } },
            },
          },
        },
      },
    });
    if (!attachment) throw ApiError.notFound('Anexo no encontrado.');

    const allowed = canAccessCorrespondence(user, {
      createdById: attachment.correspondence.createdById,
      recipients: attachment.correspondence.routeSheet?.recipients ?? [],
    });
    if (!allowed) throw ApiError.forbidden('No tiene acceso a este anexo.');

    try {
      const buffer = await this.storage.read(attachment.storageKey);
      return {
        buffer,
        fileName: attachment.originalName,
        mimeType: attachment.mimeType,
      };
    } catch (error) {
      this.logger.error(`No se pudo leer el anexo ${attachment.id}: ${(error as Error).message}`);
      throw ApiError.notFound('El archivo del anexo no está disponible.');
    }
  }
}
