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
  private readonly whatsappWebhookAuthHeader: string;
  private readonly whatsappWebhookToken: string | null;
  private readonly whatsappRequestTimeoutMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.whatsappWebhookUrl =
      this.configService.get<string>('WHATSAPP_WEBHOOK_URL')?.trim() || null;
    this.whatsappWebhookAuthHeader =
      this.configService.get<string>('WHATSAPP_WEBHOOK_AUTH_HEADER')?.trim() ||
      'Authorization';
    this.whatsappWebhookToken =
      this.configService.get<string>('WHATSAPP_WEBHOOK_TOKEN')?.trim() || null;
    this.whatsappRequestTimeoutMs = Number(
      this.configService.get<string>('WHATSAPP_REQUEST_TIMEOUT_MS')?.trim() ||
        '10000',
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendAppointmentReminders() {
    return this.runAppointmentReminders('cron');
  }

  async sendAppointmentRemindersNow() {
    return this.runAppointmentReminders('manual');
  }

  private async runAppointmentReminders(trigger: 'cron' | 'manual') {
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
      return {
        trigger,
        scanned: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        reminder_window_start: start.toISOString(),
        reminder_window_end: end.toISOString(),
      };
    }

    this.logger.log(
      `Found ${appointments.length} appointments to remind via ${trigger}`,
    );

    const sentAppointmentIds: string[] = [];
    let skipped = 0;
    let failed = 0;

    for (const appointment of appointments) {
      const patient = appointment.patient;
      const doctor = appointment.doctor;
      const normalizedPhone = this.normalizeWhatsappPhone(
        patient.whatsapp_phone,
      );
      const formattedTime = new Intl.DateTimeFormat('es-CR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: CLINIC_TZ,
      }).format(new Date(appointment.start_time));

      const payload = {
        appointment_id: appointment.id,
        clinic_id: appointment.clinic_id,
        clinic_name: appointment.clinic.name,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_phone: normalizedPhone,
        doctor_name: `${doctor.first_name} ${doctor.last_name}`,
        appointment_time: formattedTime,
        reminder_window_start: start.toISOString(),
        reminder_window_end: end.toISOString(),
      };

      if (!normalizedPhone) {
        skipped += 1;
        this.logger.warn(
          `[WhatsApp] Reminder skipped for appointment ${appointment.id}: patient has no valid phone`,
        );
        continue;
      }

      if (!this.whatsappWebhookUrl) {
        skipped += 1;
        this.logger.warn(
          `[WhatsApp] Reminder skipped for appointment ${appointment.id}: WHATSAPP_WEBHOOK_URL is not configured`,
        );
        continue;
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (this.whatsappWebhookToken) {
          headers[this.whatsappWebhookAuthHeader] =
            this.whatsappWebhookToken.startsWith('Bearer ')
              ? this.whatsappWebhookToken
              : `Bearer ${this.whatsappWebhookToken}`;
        }

        await axios.post(this.whatsappWebhookUrl, payload, {
          headers,
          timeout: this.whatsappRequestTimeoutMs,
        });
        sentAppointmentIds.push(appointment.id);
      } catch (error) {
        failed += 1;
        const errorMessage =
          axios.isAxiosError(error) && error.response
            ? `status ${error.response.status} - ${JSON.stringify(
                error.response.data ?? {},
              )}`
            : error instanceof Error
              ? error.message
              : 'unknown error';

        this.logger.error(
          `Failed to send WhatsApp reminder for appointment ${appointment.id}: ${errorMessage}`,
        );
      }
    }

    if (sentAppointmentIds.length > 0) {
      await this.prisma.$transaction(
        sentAppointmentIds.map((id) =>
          this.prisma.appointment.update({
            where: { id },
            data: { reminder_sent: true },
          }),
        ),
      );
    }

    this.logger.log(
      `Reminder run completed via ${trigger}: sent=${sentAppointmentIds.length}, failed=${failed}, skipped=${skipped}`,
    );

    return {
      trigger,
      scanned: appointments.length,
      sent: sentAppointmentIds.length,
      failed,
      skipped,
      reminder_window_start: start.toISOString(),
      reminder_window_end: end.toISOString(),
    };
  }

  private normalizeWhatsappPhone(phone: string | null | undefined) {
    if (!phone) {
      return null;
    }

    const digits = phone.replace(/\D/g, '');
    if (!digits) {
      return null;
    }

    if (digits.startsWith('506') && digits.length === 11) {
      return `+${digits}`;
    }

    if (digits.length === 8) {
      return `+506${digits}`;
    }

    if (digits.startsWith('00') && digits.length > 2) {
      return `+${digits.slice(2)}`;
    }

    if (digits.length >= 9) {
      return `+${digits}`;
    }

    return null;
  }
}
