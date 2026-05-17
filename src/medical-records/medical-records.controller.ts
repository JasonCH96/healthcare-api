import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantClinicId } from '../common/decorators/tenant-clinic-id.decorator.js';
import { MedicalRecordsService } from './medical-records.service.js';
import { CreateMedicalRecordDto } from './dto/medical-record.dto.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get('patients/:patientId/medical-records')
  findAllByPatient(
    @TenantClinicId() clinicId: string,
    @Param('patientId') patientId: string,
  ) {
    return this.medicalRecordsService.findAllByPatient(clinicId, patientId);
  }

  @Post('medical-records')
  create(
    @TenantClinicId() clinicId: string,
    @Body() dto: CreateMedicalRecordDto,
  ) {
    return this.medicalRecordsService.create(clinicId, dto);
  }

  @Get('medical-records/:id')
  findOne(@TenantClinicId() clinicId: string, @Param('id') id: string) {
    return this.medicalRecordsService.findOne(clinicId, id);
  }

  @Get('medical-records/:id/pdf')
  async downloadPdf(
    @TenantClinicId() clinicId: string,
    @Param('id') id: string,
  ) {
    const pdf = await this.medicalRecordsService.generatePdf(clinicId, id);

    return new StreamableFile(pdf.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${pdf.filename}"`,
    });
  }
}
