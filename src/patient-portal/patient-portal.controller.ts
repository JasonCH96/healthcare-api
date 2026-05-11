import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { SkipTenant } from '../common/decorators/skip-tenant.decorator.js';
import { PatientAuthGuard } from './guards/patient-auth.guard.js';
import { PatientPortalService } from './services/patient-portal.service.js';
import { PatientLoginDto } from './dto/patient-login.dto.js';

@Controller('portal')
@SkipTenant()
export class PatientPortalController {
  constructor(private readonly portalService: PatientPortalService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: PatientLoginDto) {
    return this.portalService.login(dto);
  }

  @Get('profile')
  @UseGuards(PatientAuthGuard)
  getProfile(@Req() req: any) {
    return this.portalService.getProfile(req.user.id, req.user.clinic_id);
  }

  @Get('appointments')
  @UseGuards(PatientAuthGuard)
  getAppointments(@Req() req: any) {
    return this.portalService.getAppointments(req.user.id, req.user.clinic_id);
  }

  @Get('prescriptions')
  @UseGuards(PatientAuthGuard)
  getPrescriptions(@Req() req: any) {
    return this.portalService.getPrescriptions(req.user.id, req.user.clinic_id);
  }
}
