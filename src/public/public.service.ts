import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getClinicBySlug(slug: string) {
    const clinic = await this.prisma.clinic.findFirst({
      where: {
        slug,
        is_active: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        clinic_type: true,
        specialty_modules: true,
        phone: true,
        email: true,
        public_phone: true,
        public_email: true,
        address: true,
        timezone: true,
        logo_path: true,
        theme_color: true,
        booking_enabled: true,
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    return clinic;
  }
}
