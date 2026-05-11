import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendAppointmentReminders() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        start_time: { gte: in24h, lt: in25h },
        status: 'PENDING',
        reminder_sent: false,
        deletedAt: null,
      },
      include: {
        patient: {
          select: {
            first_name: true,
            last_name: true,
            whatsapp_phone: true,
          },
        },
        doctor: {
          select: { first_name: true, last_name: true },
        },
        clinic: {
          select: { name: true },
        },
      },
    });

    if (appointments.length === 0) {
      return;
    }

    this.logger.log(`Found ${appointments.length} appointments to remind`);

    const appointmentIds = appointments.map((a) => a.id);

    for (const appointment of appointments) {
      const patient = appointment.patient;
      const doctor = appointment.doctor;

      // Simulate WhatsApp HTTP request
      this.logger.log(
        `[WhatsApp] Sending reminder to ${patient.first_name} ${patient.last_name} ` +
          `(${patient.whatsapp_phone ?? 'no phone'}) for appointment with ` +
          `Dr. ${doctor.first_name} ${doctor.last_name} at ${appointment.clinic.name} ` +
          `on ${appointment.start_time.toISOString()}`,
      );
    }

    // Update all in a transaction
    await this.prisma.$transaction(
      appointmentIds.map((id) =>
        this.prisma.appointment.update({
          where: { id },
          data: { reminder_sent: true },
        }),
      ),
    );

    this.logger.log(`Marked ${appointmentIds.length} appointments as reminded`);
  }
}
