import { Controller, Get, HttpCode, Ip, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { TrackingService } from './tracking.service';
import { PublicTrackingService } from './public-tracking.service';

class PublicTrackingQueryDto {
  @IsString()
  @MinLength(6, { message: 'El número de correspondencia no es válido.' })
  @MaxLength(40)
  number!: string;

  @IsString()
  @MinLength(6, { message: 'El código de verificación no es válido.' })
  @MaxLength(40)
  code!: string;
}

@ApiTags('Seguimiento')
@Controller('tracking')
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly publicTrackingService: PublicTrackingService,
  ) {}

  @ApiBearerAuth()
  @Get('stats')
  stats() {
    return this.trackingService.stats();
  }

  @ApiBearerAuth()
  @Get('overdue')
  @Roles(Role.ADMIN, Role.RECEPCION, Role.SEGUIMIENTO)
  overdue(@Query() query: PaginationQueryDto) {
    return this.trackingService.findOverdue(query);
  }

  @ApiBearerAuth()
  @Post('overdue/notify')
  @Roles(Role.ADMIN, Role.SEGUIMIENTO)
  @HttpCode(200)
  notifyOverdue() {
    return this.trackingService.notifyOverdue();
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('public')
  publicLookup(@Query() query: PublicTrackingQueryDto, @Ip() ip: string) {
    return this.publicTrackingService.lookup(query.number, query.code, { ip });
  }
}
