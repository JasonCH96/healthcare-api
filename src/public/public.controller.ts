import { Controller, Get, Param } from '@nestjs/common';
import { SkipTenant } from '../common/decorators/skip-tenant.decorator.js';
import { PublicService } from './public.service.js';

@Controller('public')
@SkipTenant()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('clinics/:slug')
  getClinic(@Param('slug') slug: string) {
    return this.publicService.getClinicBySlug(slug);
  }
}
