import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { deriveAuditAction } from './audit-action';
import { AuthUser } from '../common/types/auth-user';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Registra de forma transversal las operaciones que modifican datos, sin
 * guardar cuerpos de petición (evita filtrar datos personales o contraseñas).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { requestId?: string; user?: AuthUser }>();

    if (!MUTATING_METHODS.has(request.method)) return next.handle();
    if (request.path.includes('/auth/')) return next.handle();

    return next.handle().pipe(
      tap((response: unknown) => {
        const entityId =
          extractResponseId(response) ??
          (typeof request.params?.id === 'string' ? request.params.id : null);

        void this.audit.log({
          actorId: request.user?.id ?? null,
          action: deriveAuditAction(request.method, request.path),
          entityType: deriveEntityType(request.path),
          entityId,
          requestId: request.requestId ?? null,
          ip: request.ip ?? null,
          userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
          metadata: { statusCode: context.switchToHttp().getResponse().statusCode },
        });
      }),
    );
  }
}

function deriveEntityType(path: string): string {
  const segment =
    path
      .split('?')[0]
      .split('/')
      .filter(Boolean)
      .filter((part) => part !== 'api' && !/^v\d+$/.test(part))[0] ?? 'unknown';

  const map: Record<string, string> = {
    correspondences: 'Correspondence',
    'route-recipients': 'RouteRecipient',
    users: 'User',
    departments: 'Department',
    attachments: 'Attachment',
    notifications: 'Notification',
    tracking: 'Tracking',
    auth: 'Auth',
  };
  return map[segment] ?? 'System';
}

function extractResponseId(response: unknown): string | null {
  if (typeof response !== 'object' || response === null) return null;
  const record = response as Record<string, unknown>;
  if (typeof record.id === 'string') return record.id;
  if (typeof record.correspondence === 'object' && record.correspondence !== null) {
    const correspondence = record.correspondence as Record<string, unknown>;
    if (typeof correspondence.id === 'string') return correspondence.id;
  }
  if (typeof record.recipient === 'object' && record.recipient !== null) {
    const recipient = record.recipient as Record<string, unknown>;
    if (typeof recipient.id === 'string') return recipient.id;
  }
  return null;
}
