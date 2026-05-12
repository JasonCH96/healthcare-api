import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { TenantClinicId } from '../common/decorators/tenant-clinic-id.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { ClinicsService } from './clinics.service.js';
import { UpdateClinicDto } from './dto/clinic.dto.js';

@Controller('clinics/current')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicSettingsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get()
  findCurrent(@TenantClinicId() clinicId: string) {
    return this.clinicsService.findOne(clinicId);
  }

  @Patch()
  @Roles('ADMIN')
  updateCurrent(
    @TenantClinicId() clinicId: string,
    @Body() dto: UpdateClinicDto,
  ) {
    return this.clinicsService.update(clinicId, dto);
  }
}
