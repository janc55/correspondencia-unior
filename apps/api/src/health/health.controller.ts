import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';
import { Public } from '../common/decorators/auth.decorators';
import { ApiError } from '../common/errors/api-error';

/**
 * Sonda de salud para el orquestador (Dokploy/Traefik, Kubernetes, etc.).
 * Es pública a propósito, no revela datos del sistema y verifica la base de
 * datos con una consulta trivial.
 */
@ApiTags('Salud')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Estado del servicio y de la base de datos' })
  async check() {
    let database: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }

    if (database === 'down') {
      throw new ApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'SERVICE_UNAVAILABLE',
        'La base de datos no está disponible.',
        { database },
      );
    }

    return {
      status: 'ok',
      database,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      version: process.env.npm_package_version ?? '1.0.0',
    };
  }
}
