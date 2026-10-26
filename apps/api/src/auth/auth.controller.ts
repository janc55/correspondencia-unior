import { Body, Controller, Get, HttpCode, Ip, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, LogoutDto, RefreshTokenDto } from './dto/auth.dto';
import { CurrentUser, Public } from '../common/decorators/auth.decorators';
import { AuthUser } from '../common/types/auth-user';

@ApiTags('Autenticación')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('auth/login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() req: Request & { requestId?: string }, @Ip() ip: string) {
    return this.authService.login(dto.email, dto.password, {
      ip,
      userAgent: req.headers['user-agent'] ?? null,
      requestId: req.requestId ?? null,
    });
  }

  @Public()
  @Post('auth/refresh')
  @HttpCode(200)
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request & { requestId?: string },
    @Ip() ip: string,
  ) {
    return this.authService.refresh(dto.refreshToken, {
      ip,
      userAgent: req.headers['user-agent'] ?? null,
      requestId: req.requestId ?? null,
    });
  }

  @Public()
  @Post('auth/logout')
  @HttpCode(204)
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Get('users/me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.profile(user.id);
  }
}
