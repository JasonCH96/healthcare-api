import { Module } from '@nestjs/common';
import { ClinicsService } from './clinics.service.js';
import { ClinicsController } from './clinics.controller.js';

@Module({
  controllers: [ClinicsController],
  providers: [ClinicsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}
