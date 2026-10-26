import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/auth.decorators';
import { AuthUser } from '../types/auth-user';
import { ApiError } from '../errors/api-error';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Se requiere autenticación.');

    if (!requiredRoles.includes(user.role)) {
      throw new ApiError(403, 'FORBIDDEN_SCOPE', 'No tiene permisos para esta operación.');
    }
    return true;
  }
}
