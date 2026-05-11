import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantClinicId } from '../common/decorators/tenant-clinic-id.decorator.js';
import { BillingService } from './billing.service.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { UpdateInvoiceDto } from './dto/update-invoice.dto.js';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices')
  findAll(@TenantClinicId() clinicId: string) {
    return this.billingService.findAll(clinicId);
  }

  @Get('invoices/:id')
  findOne(@TenantClinicId() clinicId: string, @Param('id') id: string) {
    return this.billingService.findOne(clinicId, id);
  }

  @Post('invoices')
  create(@TenantClinicId() clinicId: string, @Body() dto: CreateInvoiceDto) {
    return this.billingService.create(clinicId, dto);
  }

  @Patch('invoices/:id')
  update(
    @TenantClinicId() clinicId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.billingService.update(clinicId, id, dto);
  }

  @Post('invoices/:id/send-to-hacienda')
  sendToHacienda(@Param('id') id: string) {
    return this.billingService.createElectronicInvoice(id);
  }
}
