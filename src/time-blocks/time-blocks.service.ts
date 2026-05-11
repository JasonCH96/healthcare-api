import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTimeBlockDto, TimeBlockQueryDto } from './dto/time-block.dto.js';

@Injectable()
export class TimeBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clinicId: string, query: TimeBlockQueryDto) {
    const where: any = { clinic_id: clinicId };

    if (query.startDate || query.endDate) {
      where.start_time = {};
      if (query.startDate) {
        where.start_time.gte = new Date(query.startDate + 'T00:00:00');
      }
      if (query.endDate) {
        where.start_time.lte = new Date(query.endDate + 'T23:59:59');
      }
    }

    if (query.doctor_id) {
      where.doctor_id = query.doctor_id;
    }

    return this.prisma.timeBlock.findMany({
      where,
      include: {
        doctor: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
      orderBy: { start_time: 'asc' },
    });
  }

  async create(clinicId: string, dto: CreateTimeBlockDto) {
    // Verify the doctor belongs to this clinic
    const membership = await this.prisma.clinicMembership.findFirst({
      where: {
        user_id: dto.doctor_id,
        clinic_id: clinicId,
        role: 'DOCTOR',
        is_active: true,
        deletedAt: null,
      },
    });
    if (!membership) {
      throw new NotFoundException('Doctor not found in this clinic');
    }

    return this.prisma.timeBlock.create({
      data: {
        clinic_id: clinicId,
        doctor_id: dto.doctor_id,
        start_time: new Date(dto.start_time),
        end_time: new Date(dto.end_time),
        reason: dto.reason,
      },
      include: {
        doctor: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });
  }

  async remove(clinicId: string, id: string) {
    const block = await this.prisma.timeBlock.findFirst({
      where: { id, clinic_id: clinicId },
    });
    if (!block) {
      throw new NotFoundException('Time block not found');
    }
    return this.prisma.timeBlock.delete({ where: { id } });
  }
}
