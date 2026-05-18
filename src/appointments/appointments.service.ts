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
import { AppointmentStatus } from '@prisma/client';
import { getClinicDayBounds } from '../common/utils/clinic-time.util.js';

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
      const { dayStart, dayEnd } = getClinicDayBounds(query.date);
      where.start_time = { gte: dayStart, lte: dayEnd };
    } else if (query.startDate || query.endDate) {
      where.start_time = {};
      if (query.startDate) {
        where.start_time.gte = getClinicDayBounds(query.startDate).dayStart;
      }
      if (query.endDate) {
        where.start_time.lte = getClinicDayBounds(query.endDate).dayEnd;
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

    this.assertValidTimeRange(startTime, endTime);
    await this.validateCreateRelations(clinicId, dto);
    await this.assertNoDoctorOverlap(clinicId, dto.doctor_id, startTime, endTime);

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
    return this.prisma.appointment
      .findFirstOrThrow({
        where: { id, clinic_id: clinicId, deletedAt: null },
        select: { id: true },
      })
      .then(({ id: appointmentId }) =>
        this.prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: dto.status },
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
        }),
      );
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

    if (dto.start_time || dto.end_time) {
      const startTime = data.start_time instanceof Date ? data.start_time : apt.start_time;
      const endTime = data.end_time instanceof Date ? data.end_time : apt.end_time;
      this.assertValidTimeRange(startTime, endTime);
      await this.assertNoDoctorOverlap(
        clinicId,
        apt.doctor_id,
        startTime,
        endTime,
        id,
      );
    }

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

  private assertValidTimeRange(startTime: Date, endTime: Date) {
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid appointment time');
    }
    if (endTime <= startTime) {
      throw new BadRequestException('Appointment end time must be after start time');
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
    if (!doctorMembership) throw new NotFoundException('Doctor not found in this clinic');
    if (dto.service_id && !service) throw new NotFoundException('Service not found');
  }

  private async assertNoDoctorOverlap(
    clinicId: string,
    doctorId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string,
  ) {
    const overlap = await this.prisma.appointment.findFirst({
      where: {
        doctor_id: doctorId,
        clinic_id: clinicId,
        deletedAt: null,
        status: { not: AppointmentStatus.CANCELLED },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
        OR: [{ start_time: { lt: endTime }, end_time: { gt: startTime } }],
      },
    });

    if (overlap) {
      throw new ConflictException(
        'The doctor already has an appointment at this time',
      );
    }
  }
}
