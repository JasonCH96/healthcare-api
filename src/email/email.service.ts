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
  private readonly postmarkToken: string | null;
  private readonly fromEmail: string;
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.postmarkToken =
      this.configService.get<string>('POSTMARK_SERVER_TOKEN')?.trim() || null;
    this.fromEmail =
      this.configService.get<string>('INVITE_FROM_EMAIL')?.trim() ||
      'soporte@citabox.app';
    this.appUrl =
      this.configService.get<string>('FRONTEND_URL')?.trim() ||
      this.configService.get<string>('APP_BASE_URL')?.trim() ||
      'http://localhost:3000';
  }

  async sendStaffInvite(input: StaffInviteEmailInput) {
    if (!this.postmarkToken) {
      this.logger.warn(
        `Invite email skipped for ${input.recipientEmail}: POSTMARK_SERVER_TOKEN is not configured`,
      );
      return { delivered: false, reason: 'postmark_not_configured' as const };
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

    await axios.post(
      'https://api.postmarkapp.com/email',
      {
        From: this.fromEmail,
        To: input.recipientEmail,
        Subject: subject,
        HtmlBody: htmlBody,
        MessageStream: 'outbound',
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': this.postmarkToken,
        },
      },
    );

    return { delivered: true as const };
  }
}
