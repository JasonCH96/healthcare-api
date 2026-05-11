import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantClinicId } from '../common/decorators/tenant-clinic-id.decorator.js';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('kpis')
  getKpis(@TenantClinicId() clinicId: string) {
    return this.analyticsService.getKpis(clinicId);
  }

  @Get('revenue')
  getRevenue(@TenantClinicId() clinicId: string) {
    return this.analyticsService.getRevenue(clinicId);
  }
}
