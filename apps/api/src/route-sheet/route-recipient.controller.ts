import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Body,
  HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { RouteRecipientStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/auth.decorators';
import { AuthUser } from '../common/types/auth-user';
import { RouteRecipientService } from './route-recipient.service';
import { ClassifyActionDto, DispatchDto } from './dto/route-recipient.dto';

class MyRecipientsQueryDto {
  @IsOptional()
  @IsEnum(RouteRecipientStatus)
  status?: RouteRecipientStatus;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  pending?: boolean;
}

@ApiTags('Hoja de ruta')
@ApiBearerAuth()
@Controller('route-recipients')
export class RouteRecipientController {
  constructor(private readonly routeRecipientService: RouteRecipientService) {}

  @Get('mine')
  findMine(@Query() query: MyRecipientsQueryDto, @CurrentUser() user: AuthUser) {
    return this.routeRecipientService.findMine(user, query);
  }

  @Post(':id/receive')
  @HttpCode(200)
  receive(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthUser) {
    return this.routeRecipientService.receive(id, user);
  }

  @Patch(':id/action')
  classify(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ClassifyActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.routeRecipientService.classify(id, user, dto);
  }

  @Post(':id/dispatch')
  @HttpCode(200)
  dispatch(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DispatchDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.routeRecipientService.dispatch(id, user, dto.internalNotes);
  }
}
