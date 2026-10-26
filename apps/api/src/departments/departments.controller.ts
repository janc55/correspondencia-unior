import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('Catálogos')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Catálogo usado por los formularios de asignación de hoja de ruta. */
  @Get()
  async findAll() {
    const departments = await this.prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true, active: true },
    });
    return departments;
  }
}
