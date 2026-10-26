import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function list(value: string | undefined, fallback: string[]): string[] {
  const items = (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

/**
 * Acceso tipado a la configuración por entorno. Centraliza defaults y evita
 * dispersar `process.env` por los servicios de dominio.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV') ?? 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return int(this.config.get<string>('API_PORT'), 3001);
  }

  get prefix(): string {
    return this.config.get<string>('API_PREFIX') ?? 'api/v1';
  }

  get corsOrigins(): string[] {
    return list(this.config.get<string>('CORS_ORIGINS'), ['http://localhost:3000']);
  }

  /** Confía en el proxy inverso (Traefik/Dokploy) para obtener la IP real del cliente. */
  get trustProxy(): boolean {
    return bool(this.config.get<string>('TRUST_PROXY'));
  }

  get timezone(): string {
    return this.config.get<string>('INSTITUTION_TIMEZONE') ?? 'America/La_Paz';
  }

  get jwtAccessSecret(): string {
    return this.config.get<string>('JWT_ACCESS_SECRET') ?? '';
  }

  get jwtAccessTtl(): number {
    return int(this.config.get<string>('JWT_ACCESS_TTL'), 3600);
  }

  get jwtRefreshTtl(): number {
    return int(this.config.get<string>('JWT_REFRESH_TTL'), 604800);
  }

  get publicVerificationSecret(): string {
    return this.config.get<string>('PUBLIC_VERIFICATION_SECRET') ?? '';
  }

  get publicTrackingRateLimit(): number {
    return int(this.config.get<string>('PUBLIC_TRACKING_RATE_LIMIT'), 10);
  }

  get overdueThresholdHours(): number {
    return int(this.config.get<string>('OVERDUE_THRESHOLD_HOURS'), 24);
  }

  get storageDir(): string {
    return this.config.get<string>('STORAGE_DIR') ?? './storage';
  }

  get maxAttachmentBytes(): number {
    return int(this.config.get<string>('MAX_ATTACHMENT_MB'), 10) * 1024 * 1024;
  }

  get smtpHost(): string {
    return this.config.get<string>('SMTP_HOST') ?? '';
  }

  get smtpPort(): number {
    return int(this.config.get<string>('SMTP_PORT'), 587);
  }

  get smtpSecure(): boolean {
    return bool(this.config.get<string>('SMTP_SECURE'));
  }

  get smtpUser(): string {
    return this.config.get<string>('SMTP_USER') ?? '';
  }

  get smtpPassword(): string {
    return this.config.get<string>('SMTP_PASSWORD') ?? '';
  }

  get mailFrom(): string {
    return (
      this.config.get<string>('MAIL_FROM') ?? 'Correspondencia UNIOR <no-responder@unior.edu.bo>'
    );
  }

  get mailTrackingTeam(): string {
    return this.config.get<string>('MAIL_TRACKING_TEAM') ?? '';
  }

  get overdueAlertsEnabled(): boolean {
    return bool(this.config.get<string>('OVERDUE_ALERTS_ENABLED'));
  }
}
