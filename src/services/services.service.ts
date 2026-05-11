import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceQueryDto,
} from './dto/service.dto.js';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly doctorSelect = {
    doctor: {
      select: { id: true, first_name: true, last_name: true },
    },
  } as const;

  async findAll(clinicId: string, query: ServiceQueryDto) {
    const where: Record<string, unknown> = {
      clinic_id: clinicId,
      deletedAt: null,
    };

    if (query.is_active !== undefined) {
      where.is_active = query.is_active === 'true';
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const services = await this.prisma.service.findMany({
      where,
      include: { doctors: { select: this.doctorSelect } },
      orderBy: { name: 'asc' },
    });

    return services.map((s) => ({
      ...s,
      doctors: s.doctors.map((sd) => sd.doctor),
    }));
  }

  async findOne(clinicId: string, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, clinic_id: clinicId, deletedAt: null },
      include: { doctors: { select: this.doctorSelect } },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return {
      ...service,
      doctors: service.doctors.map((sd) => sd.doctor),
    };
  }

  async create(clinicId: string, dto: CreateServiceDto) {
    const { doctor_ids, ...data } = dto;

    // Validate doctor_ids belong to this clinic with DOCTOR role
    if (doctor_ids?.length) {
      await this.validateDoctorIds(clinicId, doctor_ids);
    }

    const service = await this.prisma.service.create({
      data: {
        ...data,
        clinic_id: clinicId,
        doctors: doctor_ids?.length
          ? {
              create: doctor_ids.map((doctor_id) => ({ doctor_id })),
            }
          : undefined,
      },
      include: { doctors: { select: this.doctorSelect } },
    });

    return {
      ...service,
      doctors: service.doctors.map((sd) => sd.doctor),
    };
  }

  async update(clinicId: string, id: string, dto: UpdateServiceDto) {
    const existing = await this.prisma.service.findFirst({
      where: { id, clinic_id: clinicId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Service not found');
    }

    const { doctor_ids, ...data } = dto;

    // Validate doctor_ids if provided
    if (doctor_ids !== undefined) {
      if (doctor_ids.length) {
        await this.validateDoctorIds(clinicId, doctor_ids);
      }
    }

    const service = await this.prisma.$transaction(async (tx) => {
      // Sync doctor relations if doctor_ids was provided
      if (doctor_ids !== undefined) {
        await tx.serviceDoctor.deleteMany({
          where: { service_id: id },
        });

        if (doctor_ids.length) {
          await tx.serviceDoctor.createMany({
            data: doctor_ids.map((doctor_id) => ({
              service_id: id,
              doctor_id,
            })),
          });
        }
      }

      return tx.service.update({
        where: { id },
        data,
        include: { doctors: { select: this.doctorSelect } },
      });
    });

    return {
      ...service,
      doctors: service.doctors.map((sd) => sd.doctor),
    };
  }

  async remove(clinicId: string, id: string) {
    const existing = await this.prisma.service.findFirst({
      where: { id, clinic_id: clinicId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Service not found');
    }

    await this.prisma.service.update({
      where: { id },
      data: { deletedAt: new Date(), is_active: false },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async validateDoctorIds(clinicId: string, doctorIds: string[]) {
    const memberships = await this.prisma.clinicMembership.findMany({
      where: {
        clinic_id: clinicId,
        user_id: { in: doctorIds },
        role: 'DOCTOR',
        is_active: true,
        deletedAt: null,
      },
      select: { user_id: true },
    });

    const validIds = new Set(memberships.map((m) => m.user_id));
    const invalid = doctorIds.filter((id) => !validIds.has(id));

    if (invalid.length) {
      throw new BadRequestException(
        `The following doctor IDs are invalid or not active doctors in this clinic: ${invalid.join(', ')}`,
      );
    }
  }
}
