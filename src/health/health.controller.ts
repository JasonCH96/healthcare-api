import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipTenant } from '../common/decorators/skip-tenant.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
@SkipTenant()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
