import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ApiError } from '../common/errors/api-error';
import { hashPassword } from '../auth/password';
import { paginationArgs, paginationMeta } from '../common/dto/pagination.dto';
import { toUserDto } from './user.mapper';
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListUsersQueryDto) {
    const where: Prisma.UserWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) where.role = query.role;
    if (typeof query.active === 'boolean') where.active = query.active;

    const { skip, take } = paginationArgs(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: { department: true },
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
        skip,
        take,
      }),
    ]);

    return { data: rows.map(toUserDto), meta: paginationMeta(total, query) };
  }

  async create(dto: CreateUserDto) {
    await this.ensureEmailAvailable(dto.email);
    await this.validateDepartment(dto.departmentId ?? null);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        passwordHash: await hashPassword(dto.password),
        role: dto.role,
        departmentId: dto.departmentId ?? null,
      },
      include: { department: true },
    });

    return toUserDto(user);
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Usuario no encontrado.');

    if (existing.id === currentUserId && dto.active === false) {
      throw ApiError.conflict('No puede desactivar su propio usuario.');
    }
    if (existing.id === currentUserId && dto.role && dto.role !== Role.ADMIN) {
      throw ApiError.conflict('No puede cambiar su propio rol de administrador.');
    }

    if (dto.departmentId !== undefined) {
      await this.validateDepartment(dto.departmentId);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        role: dto.role,
        departmentId: dto.departmentId === undefined ? undefined : dto.departmentId,
        active: dto.active,
      },
      include: { department: true },
    });

    return toUserDto(user);
  }

  async resetPassword(id: string, password: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Usuario no encontrado.');

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(password) },
    });

    // Cualquier sesión previa deja de ser válida al cambiar la contraseña.
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async ensureEmailAvailable(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) throw ApiError.conflict('Ya existe un usuario con ese correo electrónico.');
  }

  private async validateDepartment(departmentId: string | null): Promise<void> {
    if (!departmentId) return;
    const department = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) throw ApiError.validation('El departamento indicado no existe.');
    if (!department.active) throw ApiError.validation('El departamento indicado está inactivo.');
  }
}
