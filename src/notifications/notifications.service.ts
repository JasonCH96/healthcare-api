import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CLINIC_TZ,
  getReminderWindowUtc,
} from '../common/utils/clinic-time.util.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly whatsappWebhookUrl: string | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.whatsappWebhookUrl =
      this.configService.get<string>('WHATSAPP_WEBHOOK_URL')?.trim() || null;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendAppointmentReminders() {
    const { start, end } = getReminderWindowUtc();

    const appointments = await this.prisma.appointment.findMany({
      where: {
        start_time: { gte: start, lt: end },
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
      const formattedTime = new Intl.DateTimeFormat('es-CR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: CLINIC_TZ,
      }).format(new Date(appointment.start_time));
      const payload = {
        clinic_name: appointment.clinic.name,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_phone: patient.whatsapp_phone,
        doctor_name: `${doctor.first_name} ${doctor.last_name}`,
        appointment_time: formattedTime,
      };

      if (this.whatsappWebhookUrl && patient.whatsapp_phone) {
        try {
          await axios.post(this.whatsappWebhookUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          this.logger.error(
            `Failed to send WhatsApp reminder for appointment ${appointment.id}: ${
              error instanceof Error ? error.message : 'unknown error'
            }`,
          );
          continue;
        }
      } else {
        this.logger.log(
          `[WhatsApp] Reminder queued for ${payload.patient_name} (${payload.patient_phone ?? 'sin teléfono'}) - ${payload.appointment_time} en ${payload.clinic_name}`,
        );
      }
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
