import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async createElectronicInvoice(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        clinic: true,
        patient: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Build Hacienda-compatible JSON payload
    const invoicePayload = {
      clave: invoice.numeric_key,
      consecutivo: invoice.hacienda_consecutive,
      fecha_emision: new Date().toISOString(),
      emisor: {
        nombre: invoice.clinic.name,
        identificacion: invoice.clinic.tax_id,
        telefono: invoice.clinic.phone,
        correo: invoice.clinic.email,
      },
      receptor: {
        nombre: `${invoice.patient.first_name} ${invoice.patient.last_name}`,
        identificacion: invoice.patient.identification,
      },
      detalle: {
        total_venta: Number(invoice.total_amount),
        total_comprobante: Number(invoice.total_amount),
      },
    };

    try {
      const haciendaApiUrl =
        'https://api.comprobanteselectronicos.go.cr/recepcion/v1/recepcion';

      const response = await firstValueFrom(
        this.httpService.post(haciendaApiUrl, invoicePayload, {
          headers: {
            Authorization: `Bearer ${invoice.clinic.hacienda_api_key}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(
        `Hacienda response for invoice ${invoiceId}: ${response.status}`,
      );

      return this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { hacienda_status: 'ACCEPTED' },
      });
    } catch (error) {
      this.logger.error(
        `Hacienda rejection for invoice ${invoiceId}: ${error.message}`,
      );

      return this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { hacienda_status: 'REJECTED' },
      });
    }
  }

  findAll(clinicId: string) {
    return this.prisma.invoice.findMany({
      where: { clinic_id: clinicId, deletedAt: null },
      include: {
        patient: {
          select: { first_name: true, last_name: true, identification: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(clinicId: string, id: string) {
    return this.prisma.invoice.findFirstOrThrow({
      where: { id, clinic_id: clinicId, deletedAt: null },
      include: {
        patient: true,
        clinic: true,
      },
    });
  }

  create(
    clinicId: string,
    data: {
      patient_id: string;
      total_amount: number;
      service_description?: string;
    },
  ) {
    return this.prisma.invoice.create({
      data: {
        clinic_id: clinicId,
        patient_id: data.patient_id,
        total_amount: data.total_amount,
        service_description: data.service_description,
      },
    });
  }

  async update(
    clinicId: string,
    id: string,
    data: {
      service_description?: string;
      payment_status?: any;
      total_amount?: number;
    },
  ) {
    // Verify the invoice belongs to this clinic
    await this.prisma.invoice.findFirstOrThrow({
      where: { id, clinic_id: clinicId, deletedAt: null },
    });

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...(data.service_description !== undefined && {
          service_description: data.service_description,
        }),
        ...(data.payment_status !== undefined && {
          payment_status: data.payment_status,
        }),
        ...(data.total_amount !== undefined && {
          total_amount: data.total_amount,
        }),
      },
      include: {
        patient: {
          select: { first_name: true, last_name: true, identification: true },
        },
      },
    });
  }
}
