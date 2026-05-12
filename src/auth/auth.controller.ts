import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { SkipTenant } from '../common/decorators/skip-tenant.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @SkipTenant()
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipTenant()
  me(@CurrentUser() user: any, @Req() request: any) {
    const clinicHeader = request.headers['x-clinic-id'];
    const clinicId = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    return this.authService.getProfile(user.id, clinicId);
  }
}
