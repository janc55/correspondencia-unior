import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../common/decorators/auth.decorators';
import { AuthUser } from '../common/types/auth-user';
import { CorrespondenceService } from './correspondence.service';
import {
  ArchiveCorrespondenceDto,
  CreateCorrespondenceDto,
  ListCorrespondencesQueryDto,
} from './dto/correspondence.dto';

@ApiTags('Correspondencias')
@ApiBearerAuth()
@Controller('correspondences')
export class CorrespondenceController {
  constructor(private readonly correspondenceService: CorrespondenceService) {}

  @Post()
  @Roles(Role.ADMIN, Role.RECEPCION)
  create(
    @Body() dto: CreateCorrespondenceDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request & { requestId?: string },
  ) {
    return this.correspondenceService.create(dto, user, req.requestId);
  }

  @Get()
  findAll(@Query() query: ListCorrespondencesQueryDto, @CurrentUser() user: AuthUser) {
    return this.correspondenceService.findAll(query, user);
  }

  @Get('by-number/:number')
  findByNumber(@Param('number') number: string, @CurrentUser() user: AuthUser) {
    return this.correspondenceService.findByNumber(number, user);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthUser) {
    return this.correspondenceService.findOne(id, user);
  }

  @Post(':id/archive')
  @Roles(Role.ADMIN, Role.SEGUIMIENTO)
  @HttpCode(200)
  archive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ArchiveCorrespondenceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.correspondenceService.archive(id, dto.reason, user);
  }

  @Post(':id/public-code')
  @Roles(Role.ADMIN, Role.RECEPCION, Role.SEGUIMIENTO)
  @HttpCode(200)
  regeneratePublicCode(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.correspondenceService.regeneratePublicCode(id, user);
  }
}
