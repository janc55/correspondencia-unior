import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { AuditService } from '../audit/audit.service';
import { ApiError } from '../common/errors/api-error';
import { UserWithDepartment, toUserDto } from '../users/user.mapper';
import { Role } from '@prisma/client';
import { verifyPassword } from './password';

export type RequestMeta = {
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: ReturnType<typeof toUserDto>;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string, meta: RequestMeta): Promise<TokenPair> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { department: true },
    });

    if (!user) {
      await this.audit.log({
        action: 'auth.login_failed',
        entityType: 'Auth',
        requestId: meta.requestId ?? null,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: { email: normalizedEmail, reason: 'not_found' },
      });
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas.');
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      await this.audit.log({
        actorId: user.id,
        action: 'auth.login_failed',
        entityType: 'Auth',
        entityId: user.id,
        requestId: meta.requestId ?? null,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: { reason: 'bad_password' },
      });
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas.');
    }

    if (!user.active) {
      throw new ApiError(403, 'USER_INACTIVE', 'El usuario está desactivado.');
    }

    const tokens = await this.issueTokens(user, meta);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.log({
      actorId: user.id,
      action: 'auth.login',
      entityType: 'Auth',
      entityId: user.id,
      requestId: meta.requestId ?? null,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      metadata: { role: user.role },
    });

    return tokens;
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<TokenPair> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { department: true } } },
    });

    if (!stored) {
      throw new ApiError(
        401,
        'INVALID_REFRESH_TOKEN',
        'La sesión expiró. Inicie sesión nuevamente.',
      );
    }

    if (stored.revokedAt) {
      // Reutilización de un token ya rotado: se revoca toda la familia del usuario.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      this.logger.warn(
        `Reutilización de refresh token detectada para el usuario ${stored.userId}.`,
      );
      await this.audit.log({
        actorId: stored.userId,
        action: 'auth.refresh_reuse',
        entityType: 'Auth',
        entityId: stored.userId,
        requestId: meta.requestId ?? null,
        ip: meta.ip ?? null,
        metadata: null,
      });
      throw new ApiError(
        401,
        'INVALID_REFRESH_TOKEN',
        'La sesión no es válida. Inicie sesión nuevamente.',
      );
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      throw new ApiError(
        401,
        'INVALID_REFRESH_TOKEN',
        'La sesión expiró. Inicie sesión nuevamente.',
      );
    }

    if (!stored.user.active) {
      throw new ApiError(403, 'USER_INACTIVE', 'El usuario está desactivado.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user, meta);
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { department: true },
    });
    if (!user) throw ApiError.notFound('Usuario no encontrado.');
    return toUserDto(user);
  }

  private async issueTokens(user: UserWithDepartment, meta: RequestMeta): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role satisfies Role },
      { expiresIn: this.config.jwtAccessTtl },
    );
    const refreshToken = randomBytes(48).toString('base64url');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.config.jwtRefreshTtl * 1000),
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.jwtAccessTtl,
      user: toUserDto(user),
    };
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
