import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/auth.decorators';
import { AuditService, AuditQuery } from './audit.service';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

class AuditQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

@ApiTags('Auditoría')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SEGUIMIENTO)
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query as AuditQuery);
  }
}
