import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { TenantClinicId } from '../common/decorators/tenant-clinic-id.decorator.js';
import { BillingService } from './billing.service.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices')
  @Roles('ADMIN', 'STAFF')
  findAll(@TenantClinicId() clinicId: string) {
    return this.billingService.findAll(clinicId);
  }

  @Get('invoices/:id')
  @Roles('ADMIN', 'STAFF')
  findOne(@TenantClinicId() clinicId: string, @Param('id') id: string) {
    return this.billingService.findOne(clinicId, id);
  }

  @Post('invoices')
  @Roles('ADMIN', 'STAFF')
  create(@TenantClinicId() clinicId: string, @Body() dto: CreateInvoiceDto) {
    return this.billingService.create(clinicId, dto);
  }

  @Patch('invoices/:id')
  @Roles('ADMIN', 'STAFF')
  update(
    @TenantClinicId() clinicId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.billingService.update(clinicId, id, dto);
  }
}
