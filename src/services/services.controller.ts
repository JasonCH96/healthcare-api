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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { TenantClinicId } from '../common/decorators/tenant-clinic-id.decorator.js';
import { ServicesService } from './services.service.js';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceQueryDto,
} from './dto/service.dto.js';

@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findAll(@TenantClinicId() clinicId: string, @Query() query: ServiceQueryDto) {
    return this.servicesService.findAll(clinicId, query);
  }

  @Get(':id')
  findOne(@TenantClinicId() clinicId: string, @Param('id') id: string) {
    return this.servicesService.findOne(clinicId, id);
  }

  @Post()
  @Roles('ADMIN')
  create(@TenantClinicId() clinicId: string, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(clinicId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @TenantClinicId() clinicId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(clinicId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@TenantClinicId() clinicId: string, @Param('id') id: string) {
    return this.servicesService.remove(clinicId, id);
  }
}
