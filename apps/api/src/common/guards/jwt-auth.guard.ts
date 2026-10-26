import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators';
import { AuthUser } from '../types/auth-user';
import { ApiError } from '../errors/api-error';

type AccessTokenPayload = {
  sub: string;
  email: string;
  role: string;
};

/**
 * Autenticación por JWT de acceso. Revalida el usuario en base de datos en cada
 * petición para que una desactivación o cambio de rol tenga efecto inmediato.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Se requiere autenticación.');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new ApiError(401, 'UNAUTHORIZED', 'La sesión expiró o el token no es válido.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, departmentId: true, active: true },
    });

    if (!user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'La sesión ya no es válida.');
    }
    if (!user.active) {
      throw new ApiError(403, 'USER_INACTIVE', 'El usuario está desactivado.');
    }

    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    };
    return true;
  }
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
  return value.trim();
}
