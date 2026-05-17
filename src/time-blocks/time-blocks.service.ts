import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTimeBlockDto, TimeBlockQueryDto } from './dto/time-block.dto.js';
import { getClinicDayBounds } from '../common/utils/clinic-time.util.js';

@Injectable()
export class TimeBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clinicId: string, query: TimeBlockQueryDto) {
    const where: any = { clinic_id: clinicId };

    if (query.startDate || query.endDate) {
      where.start_time = {};
      if (query.startDate) {
        where.start_time.gte = getClinicDayBounds(query.startDate).dayStart;
      }
      if (query.endDate) {
        where.start_time.lte = getClinicDayBounds(query.endDate).dayEnd;
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

    const startTime = new Date(dto.start_time);
    const endTime = new Date(dto.end_time);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid time block range');
    }
    if (endTime <= startTime) {
      throw new BadRequestException('Time block end time must be after start time');
    }

    const overlap = await this.prisma.timeBlock.findFirst({
      where: {
        doctor_id: dto.doctor_id,
        clinic_id: clinicId,
        start_time: { lt: endTime },
        end_time: { gt: startTime },
      },
    });
    if (overlap) {
      throw new ConflictException('Doctor already has a time block in this range');
    }

    return this.prisma.timeBlock.create({
      data: {
        clinic_id: clinicId,
        doctor_id: dto.doctor_id,
        start_time: startTime,
        end_time: endTime,
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
