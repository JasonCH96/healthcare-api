import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateAppointmentDto,
  UpdateAppointmentStatusDto,
  UpdateAppointmentDto,
  AppointmentQueryDto,
} from './dto/appointment.dto.js';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { getClinicDayBounds } from '../common/utils/clinic-time.util.js';
import { withDoctorScheduleLock } from '../common/utils/doctor-schedule-lock.util.js';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clinicId: string, query: AppointmentQueryDto) {
    const where: Prisma.AppointmentWhereInput = {
      clinic_id: clinicId,
      deletedAt: null,
    };

    if (query.date) {
      // Treat the date as a full day in Costa Rica time and convert to UTC boundaries.
      // e.g. 2026-03-16 CR → gte: 2026-03-16T06:00:00Z, lte: 2026-03-17T05:59:59.999Z
      const { dayStart, dayEnd } = getClinicDayBounds(query.date);
      where.start_time = { gte: dayStart, lte: dayEnd };
    } else if (query.startDate || query.endDate) {
      where.start_time = {
        ...(query.startDate
          ? { gte: getClinicDayBounds(query.startDate).dayStart }
          : {}),
        ...(query.endDate
          ? { lte: getClinicDayBounds(query.endDate).dayEnd }
          : {}),
      };
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

    this.assertValidTimeRange(startTime, endTime);
    await this.validateCreateRelations(clinicId, dto);
    return withDoctorScheduleLock(this.prisma, dto.doctor_id, async (tx) => {
      await this.assertScheduleAvailable(
        tx,
        clinicId,
        dto.doctor_id,
        startTime,
        endTime,
      );
      return tx.appointment.create({
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
            select: {
              id: true,
              name: true,
              duration_minutes: true,
              price: true,
            },
          },
        },
      });
    });
  }

  async updateStatus(
    clinicId: string,
    id: string,
    dto: UpdateAppointmentStatusDto,
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, clinic_id: clinicId, deletedAt: null },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    return withDoctorScheduleLock(
      this.prisma,
      appointment.doctor_id,
      async (tx) => {
        if (
          appointment.status === AppointmentStatus.CANCELLED &&
          dto.status !== AppointmentStatus.CANCELLED
        ) {
          await this.assertScheduleAvailable(
            tx,
            clinicId,
            appointment.doctor_id,
            appointment.start_time,
            appointment.end_time,
            id,
          );
        }
        return tx.appointment.update({
          where: { id },
          data: { status: dto.status },
          include: {
            patient: {
              select: { id: true, first_name: true, last_name: true },
            },
            doctor: {
              select: { id: true, first_name: true, last_name: true },
            },
            service: {
              select: {
                id: true,
                name: true,
                duration_minutes: true,
                price: true,
              },
            },
          },
        });
      },
    );
  }

  async update(clinicId: string, id: string, dto: UpdateAppointmentDto) {
    const apt = await this.prisma.appointment.findFirst({
      where: { id, clinic_id: clinicId, deletedAt: null },
    });
    if (!apt) throw new NotFoundException('Appointment not found');

    return withDoctorScheduleLock(this.prisma, apt.doctor_id, async (tx) => {
      const current = await tx.appointment.findFirst({
        where: { id, clinic_id: clinicId, deletedAt: null },
      });
      if (!current) throw new NotFoundException('Appointment not found');

      const startTime = dto.start_time
        ? new Date(dto.start_time)
        : current.start_time;
      const endTime = dto.end_time ? new Date(dto.end_time) : current.end_time;
      this.assertValidTimeRange(startTime, endTime);
      const nextStatus = dto.status ?? current.status;
      if (nextStatus !== AppointmentStatus.CANCELLED) {
        await this.assertScheduleAvailable(
          tx,
          clinicId,
          current.doctor_id,
          startTime,
          endTime,
          id,
        );
      }

      return tx.appointment.update({
        where: { id },
        data: {
          ...(dto.start_time ? { start_time: startTime } : {}),
          ...(dto.end_time ? { end_time: endTime } : {}),
          ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
          ...(dto.status ? { status: dto.status } : {}),
        },
        include: {
          patient: { select: { id: true, first_name: true, last_name: true } },
          doctor: { select: { id: true, first_name: true, last_name: true } },
          service: {
            select: {
              id: true,
              name: true,
              duration_minutes: true,
              price: true,
            },
          },
        },
      });
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

  private assertValidTimeRange(startTime: Date, endTime: Date) {
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid appointment time');
    }
    if (endTime <= startTime) {
      throw new BadRequestException(
        'Appointment end time must be after start time',
      );
    }
  }

  private async validateCreateRelations(
    clinicId: string,
    dto: CreateAppointmentDto,
  ) {
    const [patient, doctorMembership, service] = await Promise.all([
      this.prisma.patient.findFirst({
        where: { id: dto.patient_id, clinic_id: clinicId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.clinicMembership.findFirst({
        where: {
          user_id: dto.doctor_id,
          clinic_id: clinicId,
          role: 'DOCTOR',
          is_active: true,
          deletedAt: null,
        },
        select: { id: true },
      }),
      dto.service_id
        ? this.prisma.service.findFirst({
            where: {
              id: dto.service_id,
              clinic_id: clinicId,
              is_active: true,
              deletedAt: null,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!patient) throw new NotFoundException('Patient not found');
    if (!doctorMembership)
      throw new NotFoundException('Doctor not found in this clinic');
    if (dto.service_id && !service)
      throw new NotFoundException('Service not found');
  }

  private async assertScheduleAvailable(
    tx: Prisma.TransactionClient,
    clinicId: string,
    doctorId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string,
  ) {
    const [overlap, block] = await Promise.all([
      tx.appointment.findFirst({
        where: {
          doctor_id: doctorId,
          clinic_id: clinicId,
          deletedAt: null,
          status: { not: AppointmentStatus.CANCELLED },
          ...(excludeAppointmentId
            ? { id: { not: excludeAppointmentId } }
            : {}),
          start_time: { lt: endTime },
          end_time: { gt: startTime },
        },
      }),
      tx.timeBlock.findFirst({
        where: {
          doctor_id: doctorId,
          clinic_id: clinicId,
          start_time: { lt: endTime },
          end_time: { gt: startTime },
        },
      }),
    ]);

    if (overlap || block) {
      throw new ConflictException('The doctor is unavailable at this time');
    }
  }
}
