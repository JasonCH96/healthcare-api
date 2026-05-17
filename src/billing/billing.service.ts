import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(clinicId: string) {
    return this.prisma.invoice.findMany({
      where: { clinic_id: clinicId, deletedAt: null },
      include: {
        patient: {
          select: { first_name: true, last_name: true, identification: true },
        },
        appointment: {
          select: { id: true, start_time: true, status: true },
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
        appointment: true,
      },
    });
  }

  create(
    clinicId: string,
    data: {
      patient_id: string;
      total_amount: number;
      appointment_id?: string;
      service_description?: string;
      payment_status?: PaymentStatus;
      payment_method?: PaymentMethod;
      payment_reference?: string;
      paid_amount?: number;
      paid_at?: string;
      notes?: string;
    },
  ) {
    return this.prisma.patient
      .findFirst({
        where: { id: data.patient_id, clinic_id: clinicId, deletedAt: null },
        select: { id: true },
      })
      .then(async (patient) => {
        if (!patient) throw new NotFoundException('Patient not found');
        await this.assertAppointment(clinicId, data.patient_id, data.appointment_id);

        const paymentStatus = data.payment_status ?? 'UNPAID';
        const paidAmount = this.normalizePaidAmount(paymentStatus, data.total_amount, data.paid_amount);

        return this.prisma.invoice.create({
          data: {
            clinic_id: clinicId,
            patient_id: data.patient_id,
            appointment_id: data.appointment_id,
            total_amount: new Prisma.Decimal(data.total_amount),
            service_description: data.service_description,
            payment_status: paymentStatus,
            payment_method: data.payment_method,
            payment_reference: data.payment_reference,
            paid_amount: paidAmount,
            paid_at: data.paid_at ? new Date(data.paid_at) : this.defaultPaidAt(paymentStatus),
            notes: data.notes,
            hacienda_status: 'DRAFT',
          },
          include: {
            patient: {
              select: { first_name: true, last_name: true, identification: true },
            },
            appointment: {
              select: { id: true, start_time: true, status: true },
            },
          },
        });
      });
  }

  async update(
    clinicId: string,
    id: string,
    data: {
      appointment_id?: string;
      service_description?: string;
      payment_status?: PaymentStatus;
      total_amount?: number;
      payment_method?: PaymentMethod;
      payment_reference?: string;
      paid_amount?: number;
      paid_at?: string;
      notes?: string;
    },
  ) {
    const invoice = await this.prisma.invoice.findFirstOrThrow({
      where: { id, clinic_id: clinicId, deletedAt: null },
    });
    await this.assertAppointment(
      clinicId,
      invoice.patient_id,
      data.appointment_id ?? invoice.appointment_id ?? undefined,
    );

    const nextTotalAmount = data.total_amount ?? Number(invoice.total_amount);
    const nextPaymentStatus = data.payment_status ?? invoice.payment_status;
    const nextPaidAmount = this.normalizePaidAmount(
      nextPaymentStatus,
      nextTotalAmount,
      data.paid_amount ?? Number(invoice.paid_amount ?? 0),
    );

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...(data.appointment_id !== undefined && {
          appointment_id: data.appointment_id,
        }),
        ...(data.service_description !== undefined && {
          service_description: data.service_description,
        }),
        ...(data.payment_status !== undefined && {
          payment_status: data.payment_status,
        }),
        ...(data.total_amount !== undefined && {
          total_amount: new Prisma.Decimal(data.total_amount),
        }),
        ...(data.payment_method !== undefined && {
          payment_method: data.payment_method,
        }),
        ...(data.payment_reference !== undefined && {
          payment_reference: data.payment_reference,
        }),
        ...(nextPaidAmount !== undefined && {
          paid_amount: nextPaidAmount,
        }),
        ...(data.paid_at !== undefined && {
          paid_at: data.paid_at ? new Date(data.paid_at) : null,
        }),
        ...(data.notes !== undefined && {
          notes: data.notes,
        }),
      },
      include: {
        patient: {
          select: { first_name: true, last_name: true, identification: true },
        },
        appointment: {
          select: { id: true, start_time: true, status: true },
        },
      },
    });
  }

  private async assertAppointment(
    clinicId: string,
    patientId: string,
    appointmentId?: string,
  ) {
    if (!appointmentId) return;

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        clinic_id: clinicId,
        patient_id: patientId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!appointment) {
      throw new BadRequestException(
        'Appointment not found for this patient in the active clinic',
      );
    }
  }

  private normalizePaidAmount(
    status: PaymentStatus,
    totalAmount: number,
    paidAmount?: number,
  ) {
    if (status === 'UNPAID') {
      return new Prisma.Decimal(0);
    }

    if (status === 'PAID') {
      return new Prisma.Decimal(totalAmount);
    }

    if (!paidAmount || paidAmount <= 0 || paidAmount >= totalAmount) {
      throw new BadRequestException(
        'Partial payments require a paid_amount lower than total_amount',
      );
    }

    return new Prisma.Decimal(paidAmount);
  }

  private defaultPaidAt(status: PaymentStatus) {
    return status === 'UNPAID' ? null : new Date();
  }
}
