import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantClinicId } from '../common/decorators/tenant-clinic-id.decorator.js';
import { AppointmentsService } from './appointments.service.js';
import {
  CreateAppointmentDto,
  UpdateAppointmentStatusDto,
  UpdateAppointmentDto,
  AppointmentQueryDto,
} from './dto/appointment.dto.js';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  findAll(
    @TenantClinicId() clinicId: string,
    @Query() query: AppointmentQueryDto,
  ) {
    return this.appointmentsService.findAll(clinicId, query);
  }

  @Post()
  create(
    @TenantClinicId() clinicId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(clinicId, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @TenantClinicId() clinicId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(clinicId, id, dto);
  }

  @Patch(':id')
  update(
    @TenantClinicId() clinicId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(clinicId, id, dto);
  }

  @Delete(':id')
  remove(
    @TenantClinicId() clinicId: string,
    @Param('id') id: string,
  ) {
    return this.appointmentsService.remove(clinicId, id);
  }
}
