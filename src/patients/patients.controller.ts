import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantClinicId } from '../common/decorators/tenant-clinic-id.decorator.js';
import { PatientsService } from './patients.service.js';
import {
  CreatePatientDto,
  UpdatePatientDto,
  PatientQueryDto,
} from './dto/patient.dto.js';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  findAll(@TenantClinicId() clinicId: string, @Query() query: PatientQueryDto) {
    return this.patientsService.findAll(clinicId, query);
  }

  @Get(':id/appointments')
  findAppointments(
    @TenantClinicId() clinicId: string,
    @Param('id') id: string,
  ) {
    return this.patientsService.findAppointments(clinicId, id);
  }

  @Get(':id')
  findOne(@TenantClinicId() clinicId: string, @Param('id') id: string) {
    return this.patientsService.findOne(clinicId, id);
  }

  @Post()
  create(@TenantClinicId() clinicId: string, @Body() dto: CreatePatientDto) {
    return this.patientsService.create(clinicId, dto);
  }

  @Patch(':id')
  update(
    @TenantClinicId() clinicId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(clinicId, id, dto);
  }
}
