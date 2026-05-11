import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBookingDto } from './dto/booking.dto.js';

/** IANA timezone for all clinics in this deployment */
const CLINIC_TZ = 'America/Costa_Rica';

/** Business hours: 08:00–17:00, 30-minute slots */
const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 17;
const SLOT_DURATION_MINUTES = 30;

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async getServices(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId, deletedAt: null },
    });
    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    return this.prisma.service.findMany({
      where: { clinic_id: clinicId, is_active: true, deletedAt: null },
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

  async getDoctors(clinicId: string, serviceId?: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId, deletedAt: null },
    });
    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    // If a service_id is provided, only return doctors mapped to that service
    if (serviceId) {
      const service = await this.prisma.service.findFirst({
        where: {
          id: serviceId,
          clinic_id: clinicId,
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

      // Get specialties from memberships for the matched doctors
      const doctorIds = service.doctors.map((sd) => sd.doctor.id);
      const memberships = await this.prisma.clinicMembership.findMany({
        where: {
          clinic_id: clinicId,
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
        clinic_id: clinicId,
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
    clinicId: string,
    date: string,
    doctorId?: string,
    serviceId?: string,
  ) {
    // Validate the date is not in the past (America/Costa_Rica)
    const nowCR = toZonedTime(new Date(), CLINIC_TZ);
    const todayCR = `${nowCR.getFullYear()}-${String(nowCR.getMonth() + 1).padStart(2, '0')}-${String(nowCR.getDate()).padStart(2, '0')}`;
    if (date < todayCR) {
      throw new BadRequestException('Cannot query slots for a past date');
    }

    const isAny = !doctorId || doctorId === 'any';

    // If a specific doctor was chosen, return slots for that doctor only
    if (!isAny) {
      return this.getSlotsForSingleDoctor(clinicId, doctorId, date);
    }

    // "Any available" — merge slots across all doctors linked to the service
    let doctorIds: string[] = [];

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

      if (service && service.doctors.length > 0) {
        doctorIds = service.doctors.map((sd) => sd.doctor_id);
      }
    }

    // Fallback: if no service-linked doctors, use all clinic doctors
    if (doctorIds.length === 0) {
      const memberships = await this.prisma.clinicMembership.findMany({
        where: {
          clinic_id: clinicId,
          role: 'DOCTOR',
          is_active: true,
          deletedAt: null,
        },
        select: { user_id: true },
      });
      doctorIds = memberships.map((m) => m.user_id);
    }

    if (doctorIds.length === 0) {
      throw new NotFoundException('No doctors available for this service');
    }

    // Build busy-slots per doctor in one query
    const dayStart = new Date(date + 'T00:00:00');
    const dayEnd = new Date(date + 'T23:59:59');

    const [existingAppointments, timeBlocksForDay] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          doctor_id: { in: doctorIds },
          clinic_id: clinicId,
          deletedAt: null,
          status: { not: 'CANCELLED' },
          start_time: { gte: dayStart, lte: dayEnd },
        },
        select: { doctor_id: true, start_time: true },
      }),
      this.prisma.timeBlock.findMany({
        where: {
          doctor_id: { in: doctorIds },
          clinic_id: clinicId,
          start_time: { lt: dayEnd },
          end_time: { gt: dayStart },
        },
        select: { doctor_id: true, start_time: true, end_time: true },
      }),
    ]);

    // Map: doctorId → Set of busy "HH:mm"
    const busyMap = new Map<string, Set<string>>();
    for (const apt of existingAppointments) {
      const start = new Date(apt.start_time);
      const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
      if (!busyMap.has(apt.doctor_id)) {
        busyMap.set(apt.doctor_id, new Set());
      }
      busyMap.get(apt.doctor_id)!.add(time);
    }

    // Pre-compute which slots each doctor has blocked by time blocks
    for (let h = BUSINESS_START_HOUR; h < BUSINESS_END_HOUR; h++) {
      for (let m = 0; m < 60; m += SLOT_DURATION_MINUTES) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotStart = new Date(`${date}T${time}:00`);
        const slotEnd = new Date(
          slotStart.getTime() + SLOT_DURATION_MINUTES * 60_000,
        );
        for (const block of timeBlocksForDay) {
          if (
            slotStart < new Date(block.end_time) &&
            slotEnd > new Date(block.start_time)
          ) {
            if (!busyMap.has(block.doctor_id)) {
              busyMap.set(block.doctor_id, new Set());
            }
            busyMap.get(block.doctor_id)!.add(time);
          }
        }
      }
    }

    // Merge: for each time slot, find the first available doctor
    const slots: { time: string; available: boolean; doctor_id: string | null }[] =
      [];
    for (let h = BUSINESS_START_HOUR; h < BUSINESS_END_HOUR; h++) {
      for (let m = 0; m < 60; m += SLOT_DURATION_MINUTES) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const availableDoctor = doctorIds.find(
          (did) => !busyMap.get(did)?.has(time),
        );
        slots.push({
          time,
          available: !!availableDoctor,
          doctor_id: availableDoctor ?? null,
        });
      }
    }

    return { date, doctor_id: 'any', slots: this.filterPastSlots(date, slots) };
  }

  /** Mark slots in the past as unavailable when the date is today (America/Costa_Rica). */
  private filterPastSlots(
    date: string,
    slots: { time: string; available: boolean; doctor_id: string | null }[],
  ) {
    const nowCR = toZonedTime(new Date(), CLINIC_TZ);
    const todayCR = `${nowCR.getFullYear()}-${String(nowCR.getMonth() + 1).padStart(2, '0')}-${String(nowCR.getDate()).padStart(2, '0')}`;
    if (date !== todayCR) return slots;

    const currentMinutes = nowCR.getHours() * 60 + nowCR.getMinutes();
    return slots.map((s) => {
      const [h, m] = s.time.split(':').map(Number);
      return h * 60 + m <= currentMinutes
        ? { ...s, available: false, doctor_id: null }
        : s;
    });
  }

  // Helper: slots for a single specific doctor
  private async getSlotsForSingleDoctor(
    clinicId: string,
    doctorId: string,
    date: string,
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

    const dayStart = new Date(date + 'T00:00:00');
    const dayEnd = new Date(date + 'T23:59:59');

    const [existingAppointments, timeBlocksForDay] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          doctor_id: doctorId,
          clinic_id: clinicId,
          deletedAt: null,
          status: { not: 'CANCELLED' },
          start_time: { gte: dayStart, lte: dayEnd },
        },
        select: { start_time: true },
      }),
      this.prisma.timeBlock.findMany({
        where: {
          doctor_id: doctorId,
          clinic_id: clinicId,
          // Any block that overlaps with the day
          start_time: { lt: dayEnd },
          end_time: { gt: dayStart },
        },
        select: { start_time: true, end_time: true },
      }),
    ]);

    const busySlots = new Set<string>();
    for (const apt of existingAppointments) {
      const start = new Date(apt.start_time);
      busySlots.add(
        `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
      );
    }

    const slots: { time: string; available: boolean; doctor_id: string | null }[] =
      [];
    for (let h = BUSINESS_START_HOUR; h < BUSINESS_END_HOUR; h++) {
      for (let m = 0; m < 60; m += SLOT_DURATION_MINUTES) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        // Check if any time block overlaps this 30-min slot (using server-local time)
        const slotStart = new Date(`${date}T${time}:00`);
        const slotEnd = new Date(
          slotStart.getTime() + SLOT_DURATION_MINUTES * 60_000,
        );
        const blockedByTimeBlock = timeBlocksForDay.some(
          (b) =>
            slotStart < new Date(b.end_time) && slotEnd > new Date(b.start_time),
        );
        const available = !busySlots.has(time) && !blockedByTimeBlock;
        slots.push({ time, available, doctor_id: available ? doctorId : null });
      }
    }

    return { date, doctor_id: doctorId, slots: this.filterPastSlots(date, slots) };
  }

  async createAppointment(dto: CreateBookingDto) {
    // Validate clinic
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinic_id, deletedAt: null },
    });
    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    // Validate service
    const service = await this.prisma.service.findFirst({
      where: {
        id: dto.service_id,
        clinic_id: dto.clinic_id,
        is_active: true,
        deletedAt: null,
      },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Validate doctor
    const membership = await this.prisma.clinicMembership.findFirst({
      where: {
        user_id: dto.doctor_id,
        clinic_id: dto.clinic_id,
        role: 'DOCTOR',
        is_active: true,
        deletedAt: null,
      },
    });
    if (!membership) {
      throw new NotFoundException('Doctor not found in this clinic');
    }

    // Parse the incoming date+time as Costa Rica local time, then convert to UTC for storage.
    // e.g. dto.date='2026-03-16', dto.time='08:00' → startTime=2026-03-16T14:00:00.000Z
    const startTime = fromZonedTime(`${dto.date}T${dto.time}:00`, CLINIC_TZ);
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60_000);

    // Check for overlap
    const overlap = await this.prisma.appointment.findFirst({
      where: {
        doctor_id: dto.doctor_id,
        clinic_id: dto.clinic_id,
        deletedAt: null,
        status: { not: 'CANCELLED' },
        OR: [{ start_time: { lt: endTime }, end_time: { gt: startTime } }],
      },
    });
    if (overlap) {
      throw new BadRequestException('This time slot is no longer available');
    }

    // Upsert patient: create if new, update contact info if returning
    // Uses the unique index [clinic_id, identification] so soft-deleted records
    // are also restored (deletedAt → null) when the same patient re-books.
    const patient = await this.prisma.patient.upsert({
      where: {
        clinic_id_identification: {
          clinic_id: dto.clinic_id,
          identification: dto.identification,
        },
      },
      create: {
        clinic_id: dto.clinic_id,
        first_name: dto.first_name,
        last_name: dto.last_name,
        identification: dto.identification,
        birth_date: new Date('1990-01-01'), // placeholder; patient can update later
        gender: 'OTHER',
        whatsapp_phone: dto.whatsapp_phone ?? null,
      },
      update: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        whatsapp_phone: dto.whatsapp_phone ?? null,
        deletedAt: null, // restore if previously soft-deleted
      },
    });

    // Create appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        clinic_id: dto.clinic_id,
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

    return appointment;
  }
}
