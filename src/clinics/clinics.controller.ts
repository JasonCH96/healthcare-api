import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { SkipTenant } from '../common/decorators/skip-tenant.decorator.js';
import { ClinicsService } from './clinics.service.js';
import { CreateClinicDto, UpdateClinicDto } from './dto/clinic.dto.js';

@Controller('clinics')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@SkipTenant()
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get()
  findAll() {
    return this.clinicsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateClinicDto) {
    return this.clinicsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClinicDto) {
    return this.clinicsService.update(id, dto);
  }
}
