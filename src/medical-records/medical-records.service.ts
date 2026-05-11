import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMedicalRecordDto } from './dto/medical-record.dto.js';

@Injectable()
export class MedicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

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
        appointment: true,
      },
    });
  }

  create(clinicId: string, dto: CreateMedicalRecordDto) {
    return this.prisma.medicalRecord.create({
      data: {
        clinic_id: clinicId,
        patient_id: dto.patient_id,
        doctor_id: dto.doctor_id,
        appointment_id: dto.appointment_id,
        vitals: dto.vitals,
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
      },
      include: {
        gynoRecord: true,
        dentalRecords: true,
      },
    });
  }
}
