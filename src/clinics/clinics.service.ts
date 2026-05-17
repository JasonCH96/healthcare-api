import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClinicDto, UpdateClinicDto } from './dto/clinic.dto.js';
import { type SpecialtyModule } from './clinic-types.js';

@Injectable()
export class ClinicsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.clinic.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.clinic.findUniqueOrThrow({
      where: { id, deletedAt: null },
    });
  }

  async create(dto: CreateClinicDto) {
    const { initial_admin, ...clinicDto } = dto;
    const slug = clinicDto.slug ?? this.slugify(clinicDto.name);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const clinic = await tx.clinic.create({
          data: {
            ...clinicDto,
            slug,
            timezone: clinicDto.timezone ?? 'America/Costa_Rica',
            booking_enabled: clinicDto.booking_enabled ?? true,
            clinic_type: clinicDto.clinic_type ?? 'GENERAL_MEDICINE',
            specialty_modules:
              clinicDto.specialty_modules ??
              this.defaultSpecialtyModules(clinicDto.clinic_type),
          },
        });

        if (!initial_admin) {
          return clinic;
        }

        const existingUser = await tx.user.findUnique({
          where: { email: initial_admin.email },
        });

        const user = existingUser
          ? existingUser
          : await tx.user.create({
              data: {
                first_name: initial_admin.first_name,
                last_name: initial_admin.last_name,
                email: initial_admin.email,
                password: await bcrypt.hash(
                  initial_admin.password ?? this.temporaryPassword(),
                  12,
                ),
              },
            });

        await tx.clinicMembership.upsert({
          where: {
            user_id_clinic_id: {
              user_id: user.id,
              clinic_id: clinic.id,
            },
          },
          update: {
            role: 'ADMIN',
            is_active: true,
            deletedAt: null,
          },
          create: {
            user_id: user.id,
            clinic_id: clinic.id,
            role: 'ADMIN',
            is_active: true,
          },
        });

        return clinic;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Clinic tax ID or slug already exists');
      }
      throw error;
    }
  }

  update(id: string, dto: UpdateClinicDto) {
    return this.prisma.clinic.update({
      where: { id },
      data: dto,
    });
  }

  private slugify(value: string) {
    const slug = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    return slug || `clinic-${randomUUID().slice(0, 8)}`;
  }

  private temporaryPassword() {
    return `Temp-${randomUUID()}`;
  }

  private defaultSpecialtyModules(clinicType?: string) {
    const modules = new Set<SpecialtyModule>([
      'GENERAL_MEDICINE',
      'PRESCRIPTIONS',
    ]);

    if (clinicType === 'DENTAL') modules.add('DENTAL');
    if (clinicType === 'GYNECOLOGY') modules.add('GYNECOLOGY');

    return [...modules];
  }
}
