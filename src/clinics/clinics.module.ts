import { Module } from '@nestjs/common';
import { ClinicsService } from './clinics.service.js';
import { ClinicsController } from './clinics.controller.js';
import { ClinicSettingsController } from './clinic-settings.controller.js';

@Module({
  controllers: [ClinicSettingsController, ClinicsController],
  providers: [ClinicsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}
