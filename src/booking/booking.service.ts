import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBookingDto } from './dto/booking.dto.js';
import {
  getClinicDateKey,
  getClinicDayBounds,
  getClinicMinutes,
  getClinicNow,
  getClinicUtcDateTime,
} from '../common/utils/clinic-time.util.js';

const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 17;
const SLOT_DURATION_MINUTES = 30;

type PublicSlot = {
  time: string;
  available: boolean;
  doctor_id: string | null;
};

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async getServices(clinicId?: string, clinicSlug?: string, doctorId?: string) {
    const clinic = await this.resolvePublicClinic(clinicId, clinicSlug);

    return this.prisma.service.findMany({
      where: {
        clinic_id: clinic.id,
        is_active: true,
        deletedAt: null,
        ...(doctorId && doctorId !== 'any'
          ? { doctors: { some: { doctor_id: doctorId } } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        duration_minutes: true,
        price: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getDoctors(clinicId?: string, clinicSlug?: string, serviceId?: string) {
    const clinic = await this.resolvePublicClinic(clinicId, clinicSlug);

    if (serviceId) {
      const service = await this.prisma.service.findFirst({
        where: {
          id: serviceId,
          clinic_id: clinic.id,
          is_active: true,
          deletedAt: null,
        },
        include: {
          doctors: {
            include: {
              doctor: {
                select: { id: true, first_name: true, last_name: true },
              },
            },
          },
        },
      });
      if (!service) {
        throw new NotFoundException('Service not found');
      }

      const doctorIds = service.doctors.map((sd) => sd.doctor.id);
      const memberships = await this.prisma.clinicMembership.findMany({
        where: {
          clinic_id: clinic.id,
          user_id: { in: doctorIds },
          role: 'DOCTOR',
          is_active: true,
          deletedAt: null,
        },
        select: { user_id: true, specialty: true },
      });
      const specMap = new Map(memberships.map((m) => [m.user_id, m.specialty]));

      return service.doctors.map((sd) => ({
        id: sd.doctor.id,
        first_name: sd.doctor.first_name,
        last_name: sd.doctor.last_name,
        specialty: specMap.get(sd.doctor.id) ?? null,
      }));
    }

    const memberships = await this.prisma.clinicMembership.findMany({
      where: {
        clinic_id: clinic.id,
        role: 'DOCTOR',
        is_active: true,
        deletedAt: null,
      },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.user.id,
      first_name: m.user.first_name,
      last_name: m.user.last_name,
      specialty: m.specialty,
    }));
  }

  async getAvailableSlots(
    clinicId: string | undefined,
    clinicSlug: string | undefined,
    date: string,
    doctorId?: string,
    serviceId?: string,
  ) {
    const clinic = await this.resolvePublicClinic(clinicId, clinicSlug);
    const activeClinicId = clinic.id;

    const todayCR = getClinicDateKey(getClinicNow());
    if (date < todayCR) {
      throw new BadRequestException('Cannot query slots for a past date');
    }

    const durationMinutes = serviceId
      ? await this.getServiceDuration(activeClinicId, serviceId)
      : SLOT_DURATION_MINUTES;

    if (doctorId && doctorId !== 'any') {
      return this.getSlotsForSingleDoctor(
        activeClinicId,
        doctorId,
        date,
        durationMinutes,
        serviceId,
      );
    }

    const doctorIds = await this.getServiceDoctorIds(activeClinicId, serviceId);
    if (doctorIds.length === 0) {
      throw new NotFoundException('No doctors available for this service');
    }

    const { dayStart, dayEnd } = getClinicDayBounds(date);
    const [existingAppointments, timeBlocksForDay] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          doctor_id: { in: doctorIds },
          clinic_id: activeClinicId,
          deletedAt: null,
          status: { not: 'CANCELLED' },
          start_time: { lt: dayEnd },
          end_time: { gt: dayStart },
        },
        select: { doctor_id: true, start_time: true, end_time: true },
      }),
      this.prisma.timeBlock.findMany({
        where: {
          doctor_id: { in: doctorIds },
          clinic_id: activeClinicId,
          start_time: { lt: dayEnd },
          end_time: { gt: dayStart },
        },
        select: { doctor_id: true, start_time: true, end_time: true },
      }),
    ]);

    const slots: PublicSlot[] = [];
    for (const time of this.buildCandidateTimes(durationMinutes)) {
      const slotStart = getClinicUtcDateTime(date, time);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);
      const availableDoctor = doctorIds.find((did) => {
        const overlapsAppointment = existingAppointments.some(
          (apt) =>
            apt.doctor_id === did &&
            slotStart < new Date(apt.end_time) &&
            slotEnd > new Date(apt.start_time),
        );
        const overlapsBlock = timeBlocksForDay.some(
          (block) =>
            block.doctor_id === did &&
            slotStart < new Date(block.end_time) &&
            slotEnd > new Date(block.start_time),
        );
        return !overlapsAppointment && !overlapsBlock;
      });

      slots.push({
        time,
        available: !!availableDoctor,
        doctor_id: availableDoctor ?? null,
      });
    }

    return { date, doctor_id: 'any', slots: this.filterPastSlots(date, slots) };
  }

  async createAppointment(dto: CreateBookingDto) {
    const clinic = await this.resolvePublicClinic(dto.clinic_id, dto.clinic_slug);

    const service = await this.prisma.service.findFirst({
      where: {
        id: dto.service_id,
        clinic_id: clinic.id,
        is_active: true,
        deletedAt: null,
      },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const membership = await this.prisma.clinicMembership.findFirst({
      where: {
        user_id: dto.doctor_id,
        clinic_id: clinic.id,
        role: 'DOCTOR',
        is_active: true,
        deletedAt: null,
      },
    });
    if (!membership) {
      throw new NotFoundException('Doctor not found in this clinic');
    }
    await this.assertDoctorCanProvideService(
      clinic.id,
      dto.doctor_id,
      dto.service_id,
    );

    const startTime = getClinicUtcDateTime(dto.date, dto.time);
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60_000);

    const overlap = await this.prisma.appointment.findFirst({
      where: {
        doctor_id: dto.doctor_id,
        clinic_id: clinic.id,
        deletedAt: null,
        status: { not: 'CANCELLED' },
        OR: [{ start_time: { lt: endTime }, end_time: { gt: startTime } }],
      },
    });
    if (overlap) {
      throw new BadRequestException('This time slot is no longer available');
    }

    const patient = await this.prisma.patient.upsert({
      where: {
        clinic_id_identification: {
          clinic_id: clinic.id,
          identification: dto.identification,
        },
      },
      create: {
        clinic_id: clinic.id,
        first_name: dto.first_name,
        last_name: dto.last_name,
        identification: dto.identification,
        birth_date: new Date('1990-01-01'),
        gender: 'OTHER',
        whatsapp_phone: dto.whatsapp_phone ?? null,
      },
      update: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        whatsapp_phone: dto.whatsapp_phone ?? null,
        deletedAt: null,
      },
    });

    return this.prisma.appointment.create({
      data: {
        clinic_id: clinic.id,
        patient_id: patient.id,
        doctor_id: dto.doctor_id,
        service_id: dto.service_id,
        start_time: startTime,
        end_time: endTime,
        status: 'PENDING',
        reason: service.name,
      },
      select: {
        id: true,
        status: true,
        start_time: true,
        end_time: true,
        reason: true,
        service: { select: { name: true } },
        doctor: { select: { first_name: true, last_name: true } },
      },
    });
  }

  private async getSlotsForSingleDoctor(
    clinicId: string,
    doctorId: string,
    date: string,
    durationMinutes: number,
    serviceId?: string,
  ) {
    const membership = await this.prisma.clinicMembership.findFirst({
      where: {
        user_id: doctorId,
        clinic_id: clinicId,
        role: 'DOCTOR',
        is_active: true,
        deletedAt: null,
      },
    });
    if (!membership) {
      throw new NotFoundException('Doctor not found in this clinic');
    }
    if (serviceId) {
      await this.assertDoctorCanProvideService(clinicId, doctorId, serviceId);
    }

    const { dayStart, dayEnd } = getClinicDayBounds(date);
    const [existingAppointments, timeBlocksForDay] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          doctor_id: doctorId,
          clinic_id: clinicId,
          deletedAt: null,
          status: { not: 'CANCELLED' },
          start_time: { lt: dayEnd },
          end_time: { gt: dayStart },
        },
        select: { start_time: true, end_time: true },
      }),
      this.prisma.timeBlock.findMany({
        where: {
          doctor_id: doctorId,
          clinic_id: clinicId,
          start_time: { lt: dayEnd },
          end_time: { gt: dayStart },
        },
        select: { start_time: true, end_time: true },
      }),
    ]);

    const slots: PublicSlot[] = [];
    for (const time of this.buildCandidateTimes(durationMinutes)) {
      const slotStart = getClinicUtcDateTime(date, time);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);
      const overlapsAppointment = existingAppointments.some(
        (apt) =>
          slotStart < new Date(apt.end_time) &&
          slotEnd > new Date(apt.start_time),
      );
      const overlapsBlock = timeBlocksForDay.some(
        (block) =>
          slotStart < new Date(block.end_time) &&
          slotEnd > new Date(block.start_time),
      );
      const available = !overlapsAppointment && !overlapsBlock;
      slots.push({ time, available, doctor_id: available ? doctorId : null });
    }

    return { date, doctor_id: doctorId, slots: this.filterPastSlots(date, slots) };
  }

  private filterPastSlots(date: string, slots: PublicSlot[]) {
    const todayCR = getClinicDateKey(getClinicNow());
    if (date !== todayCR) return slots;

    const currentMinutes = getClinicMinutes(getClinicNow());
    return slots.map((slot) => {
      const [h, m] = slot.time.split(':').map(Number);
      return h * 60 + m <= currentMinutes
        ? { ...slot, available: false, doctor_id: null }
        : slot;
    });
  }

  private async getServiceDuration(clinicId: string, serviceId: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        clinic_id: clinicId,
        is_active: true,
        deletedAt: null,
      },
      select: { duration_minutes: true },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return Math.max(service.duration_minutes, SLOT_DURATION_MINUTES);
  }

  private buildCandidateTimes(durationMinutes: number) {
    const times: string[] = [];
    const startMinutes = BUSINESS_START_HOUR * 60;
    const endMinutes = BUSINESS_END_HOUR * 60;
    const step = Math.max(durationMinutes, SLOT_DURATION_MINUTES);

    for (
      let minutes = startMinutes;
      minutes + durationMinutes <= endMinutes;
      minutes += step
    ) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }

    return times;
  }

  private async getServiceDoctorIds(clinicId: string, serviceId?: string) {
    if (serviceId) {
      const service = await this.prisma.service.findFirst({
        where: {
          id: serviceId,
          clinic_id: clinicId,
          is_active: true,
          deletedAt: null,
        },
        include: { doctors: { select: { doctor_id: true } } },
      });
      if (!service) {
        throw new NotFoundException('Service not found');
      }
      return service.doctors.map((sd) => sd.doctor_id);
    }

    const memberships = await this.prisma.clinicMembership.findMany({
      where: {
        clinic_id: clinicId,
        role: 'DOCTOR',
        is_active: true,
        deletedAt: null,
      },
      select: { user_id: true },
    });
    return memberships.map((m) => m.user_id);
  }

  private async assertDoctorCanProvideService(
    clinicId: string,
    doctorId: string,
    serviceId: string,
  ) {
    const serviceDoctor = await this.prisma.serviceDoctor.findFirst({
      where: {
        doctor_id: doctorId,
        service: {
          id: serviceId,
          clinic_id: clinicId,
          is_active: true,
          deletedAt: null,
        },
      },
    });

    if (!serviceDoctor) {
      throw new BadRequestException('Doctor is not assigned to this service');
    }
  }

  private async resolvePublicClinic(clinicId?: string, clinicSlug?: string) {
    if (!clinicId && !clinicSlug) {
      throw new BadRequestException('clinic_id or clinic_slug is required');
    }

    const clinic = await this.prisma.clinic.findFirst({
      where: {
        ...(clinicId ? { id: clinicId } : { slug: clinicSlug }),
        is_active: true,
        deletedAt: null,
      },
      select: { id: true, booking_enabled: true },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }
    if (!clinic.booking_enabled) {
      throw new BadRequestException('Online booking is disabled for this clinic');
    }

    return clinic;
  }
}
