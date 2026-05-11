import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { fromZonedTime } from 'date-fns-tz';
import { PrismaService } from '../prisma/prisma.service.js';

const CLINIC_TZ = 'America/Costa_Rica';
import {
  CreateAppointmentDto,
  UpdateAppointmentStatusDto,
  UpdateAppointmentDto,
  AppointmentQueryDto,
} from './dto/appointment.dto.js';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clinicId: string, query: AppointmentQueryDto) {
    const where: any = {
      clinic_id: clinicId,
      deletedAt: null,
    };

    if (query.date) {
      // Treat the date as a full day in Costa Rica time and convert to UTC boundaries.
      // e.g. 2026-03-16 CR → gte: 2026-03-16T06:00:00Z, lte: 2026-03-17T05:59:59.999Z
      where.start_time = {
        gte: fromZonedTime(`${query.date}T00:00:00`, CLINIC_TZ),
        lte: fromZonedTime(`${query.date}T23:59:59.999`, CLINIC_TZ),
      };
    } else if (query.startDate || query.endDate) {
      where.start_time = {};
      if (query.startDate) {
        where.start_time.gte = fromZonedTime(`${query.startDate}T00:00:00`, CLINIC_TZ);
      }
      if (query.endDate) {
        where.start_time.lte = fromZonedTime(`${query.endDate}T23:59:59.999`, CLINIC_TZ);
      }
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: { id: true, first_name: true, last_name: true },
        },
        doctor: {
          select: { id: true, first_name: true, last_name: true },
        },
        service: {
          select: { id: true, name: true, duration_minutes: true, price: true },
        },
      },
      orderBy: { start_time: 'asc' },
    });
  }

  async create(clinicId: string, dto: CreateAppointmentDto) {
    const startTime = new Date(dto.start_time);
    const endTime = new Date(dto.end_time);

    // Check for schedule overlap for the same doctor
    const overlap = await this.prisma.appointment.findFirst({
      where: {
        doctor_id: dto.doctor_id,
        clinic_id: clinicId,
        deletedAt: null,
        status: { not: AppointmentStatus.CANCELLED },
        OR: [
          {
            start_time: { lt: endTime },
            end_time: { gt: startTime },
          },
        ],
      },
    });

    if (overlap) {
      throw new ConflictException(
        'The doctor already has an appointment at this time',
      );
    }

    return this.prisma.appointment.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        doctor_id: dto.doctor_id,
        start_time: startTime,
        end_time: endTime,
        reason: dto.reason,
        service_id: dto.service_id,
      },
      include: {
        patient: {
          select: { id: true, first_name: true, last_name: true },
        },
        doctor: {
          select: { id: true, first_name: true, last_name: true },
        },
        service: {
          select: { id: true, name: true, duration_minutes: true, price: true },
        },
      },
    });
  }

  updateStatus(clinicId: string, id: string, dto: UpdateAppointmentStatusDto) {
    return this.prisma.appointment.update({
      where: { id, clinic_id: clinicId },
      data: { status: dto.status },
    });
  }

  async update(clinicId: string, id: string, dto: UpdateAppointmentDto) {
    const apt = await this.prisma.appointment.findFirst({
      where: { id, clinic_id: clinicId, deletedAt: null },
    });
    if (!apt) throw new NotFoundException('Appointment not found');

    const data: Record<string, unknown> = {};
    if (dto.start_time) data.start_time = new Date(dto.start_time);
    if (dto.end_time) data.end_time = new Date(dto.end_time);
    if (dto.reason !== undefined) data.reason = dto.reason;
    if (dto.status) data.status = dto.status;

    return this.prisma.appointment.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, first_name: true, last_name: true } },
        doctor: { select: { id: true, first_name: true, last_name: true } },
        service: { select: { id: true, name: true, duration_minutes: true, price: true } },
      },
    });
  }

  async remove(clinicId: string, id: string) {
    const apt = await this.prisma.appointment.findFirst({
      where: { id, clinic_id: clinicId, deletedAt: null },
    });
    if (!apt) throw new NotFoundException('Appointment not found');
    return this.prisma.appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
