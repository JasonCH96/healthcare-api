import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PdfGeneratorService } from '../pdf-generator/pdf-generator.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMedicalRecordDto } from './dto/medical-record.dto.js';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {}

  findAllByPatient(clinicId: string, patientId: string) {
    return this.prisma.medicalRecord.findMany({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        deletedAt: null,
      },
      include: {
        doctor: {
          select: { id: true, first_name: true, last_name: true },
        },
        gynoRecord: true,
        dentalRecords: true,
        prescriptions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(clinicId: string, id: string) {
    return this.prisma.medicalRecord.findFirstOrThrow({
      where: { id, clinic_id: clinicId, deletedAt: null },
      include: {
        doctor: {
          select: { id: true, first_name: true, last_name: true },
        },
        patient: {
          select: { id: true, first_name: true, last_name: true },
        },
        gynoRecord: true,
        dentalRecords: true,
        prescriptions: true,
        appointment: true,
      },
    });
  }

  async create(clinicId: string, dto: CreateMedicalRecordDto) {
    await this.validateRelations(clinicId, dto);

    return this.prisma.medicalRecord.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        doctor_id: dto.doctor_id,
        appointment_id: dto.appointment_id,
        vitals: dto.vitals as Prisma.InputJsonValue | undefined,
        diagnosis: dto.diagnosis,
        treatment_plan: dto.treatment_plan,
        gynoRecord: dto.gynoRecord
          ? {
              create: {
                last_menstrual_period: dto.gynoRecord.last_menstrual_period
                  ? new Date(dto.gynoRecord.last_menstrual_period)
                  : undefined,
                estimated_due_date: dto.gynoRecord.estimated_due_date
                  ? new Date(dto.gynoRecord.estimated_due_date)
                  : undefined,
                gestational_weeks: dto.gynoRecord.gestational_weeks,
                ultrasound_notes: dto.gynoRecord.ultrasound_notes,
                image_url: dto.gynoRecord.image_url,
              },
            }
          : undefined,
        dentalRecords: dto.dentalRecords?.length
          ? {
              create: dto.dentalRecords.map((d) => ({
                tooth_number: d.tooth_number,
                condition: d.condition,
                surface: d.surface,
                estimated_budget: d.estimated_budget,
              })),
            }
          : undefined,
        prescriptions:
          dto.prescription?.medications?.length
            ? {
                create: {
                  medications:
                    dto.prescription.medications as unknown as Prisma.InputJsonValue,
                  additional_notes: dto.prescription.additional_notes,
                },
              }
            : undefined,
      },
      include: {
        doctor: {
          select: { id: true, first_name: true, last_name: true },
        },
        patient: {
          select: { id: true, first_name: true, last_name: true },
        },
        gynoRecord: true,
        dentalRecords: true,
        prescriptions: true,
      },
    });
  }

  async generatePdf(clinicId: string, id: string) {
    const [record, clinic] = await Promise.all([
      this.findOne(clinicId, id),
      this.prisma.clinic.findFirstOrThrow({
        where: { id: clinicId, deletedAt: null },
        select: { name: true },
      }),
    ]);

    const buffer = await this.pdfGenerator.generatePrescriptionPdf({
      clinic_name: clinic.name,
      doctor_name: `${record.doctor.first_name} ${record.doctor.last_name}`,
      patient_name: `${record.patient.first_name} ${record.patient.last_name}`,
      date: new Date(record.createdAt).toLocaleDateString('es-CR'),
      diagnosis: record.diagnosis ?? 'Sin diagnostico registrado',
      treatment_plan: record.treatment_plan ?? 'Sin plan de tratamiento registrado',
      medications:
        record.prescriptions[0]?.medications &&
        Array.isArray(record.prescriptions[0].medications)
          ? (record.prescriptions[0].medications as Array<{
              name: string;
              dosage: string;
              frequency: string;
            }>)
          : [],
      additional_notes: record.prescriptions[0]?.additional_notes ?? undefined,
      vitals:
        record.vitals && typeof record.vitals === 'object'
          ? (record.vitals as Record<string, any>)
          : undefined,
    });

    const filename = `expediente-${record.patient.first_name}-${record.patient.last_name}-${record.id}.pdf`
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, '-');

    return { buffer, filename };
  }

  private async validateRelations(clinicId: string, dto: CreateMedicalRecordDto) {
    const [patient, doctorMembership, appointment] = await Promise.all([
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
      dto.appointment_id
        ? this.prisma.appointment.findFirst({
            where: {
              id: dto.appointment_id,
              clinic_id: clinicId,
              patient_id: dto.patient_id,
              doctor_id: dto.doctor_id,
              deletedAt: null,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!patient) throw new NotFoundException('Patient not found');
    if (!doctorMembership) throw new NotFoundException('Doctor not found in this clinic');
    if (dto.appointment_id && !appointment) {
      throw new NotFoundException('Appointment not found for this patient and doctor');
    }
  }
}
