import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface StaffInviteEmailInput {
  clinicName: string;
  recipientName: string;
  recipientEmail: string;
  roleLabel: string;
  temporaryPassword: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resendApiKey: string | null;
  private readonly fromEmail: string;
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.resendApiKey =
      this.configService.get<string>('RESEND_API_KEY')?.trim() || null;
    this.fromEmail =
      this.configService.get<string>('INVITE_FROM_EMAIL')?.trim() ||
      'soporte@citabox.app';
    this.appUrl =
      this.configService.get<string>('FRONTEND_URL')?.trim() ||
      this.configService.get<string>('APP_BASE_URL')?.trim() ||
      'http://localhost:3000';
  }

  async sendStaffInvite(input: StaffInviteEmailInput) {
    if (!this.resendApiKey) {
      this.logger.warn(
        `Invite email skipped for ${input.recipientEmail}: RESEND_API_KEY is not configured`,
      );
      return { delivered: false, reason: 'resend_not_configured' as const };
    }

    const subject = `Tu acceso a CitaBox para ${input.clinicName}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">Bienvenido a CitaBox</h2>
        <p>Hola ${input.recipientName},</p>
        <p>Te agregaron al equipo de <strong>${input.clinicName}</strong> como <strong>${input.roleLabel}</strong>.</p>
        <p>Ya puedes ingresar usando estas credenciales temporales:</p>
        <ul>
          <li><strong>Correo:</strong> ${input.recipientEmail}</li>
          <li><strong>Clave temporal:</strong> ${input.temporaryPassword}</li>
        </ul>
        <p>Ingresa desde aquí:</p>
        <p><a href="${this.appUrl}" style="color: #0ea5e9;">${this.appUrl}</a></p>
        <p>Por seguridad, cambia la clave después de tu primer acceso.</p>
        <p>Equipo CitaBox</p>
      </div>
    `;

    try {
      await axios.post(
        'https://api.resend.com/emails',
        {
          from: this.fromEmail,
          to: [input.recipientEmail],
          subject,
          html: htmlBody,
        },
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const details =
          typeof error.response?.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response?.data ?? {});

        this.logger.error(
          `Invite email failed for ${input.recipientEmail}: Resend responded with ${status ?? 'unknown'} - ${details}`,
        );

        return {
          delivered: false as const,
          reason:
            status === 403
              ? ('resend_forbidden' as const)
              : ('resend_request_failed' as const),
        };
      }

      this.logger.error(
        `Invite email failed for ${input.recipientEmail}: unexpected error`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        delivered: false as const,
        reason: 'resend_request_failed' as const,
      };
    }

    return { delivered: true as const };
  }
}
