import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PatientLoginDto } from '../dto/patient-login.dto.js';

@Injectable()
export class PatientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: PatientLoginDto) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        identification: dto.identification,
        clinic_id: dto.clinic_id,
        deletedAt: null,
      },
    });

    if (!patient || !patient.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, patient.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: patient.id,
      role: 'PATIENT' as const,
      clinic_id: patient.clinic_id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      patient: {
        id: patient.id,
        first_name: patient.first_name,
        last_name: patient.last_name,
      },
    };
  }

  getProfile(patientId: string, clinicId: string) {
    return this.prisma.patient.findFirstOrThrow({
      where: { id: patientId, clinic_id: clinicId, deletedAt: null },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        identification: true,
        birth_date: true,
        gender: true,
        whatsapp_phone: true,
        emergency_contact: true,
      },
    });
  }

  getAppointments(patientId: string, clinicId: string) {
    return this.prisma.appointment.findMany({
      where: {
        patient_id: patientId,
        clinic_id: clinicId,
        deletedAt: null,
      },
      include: {
        doctor: {
          select: { first_name: true, last_name: true },
        },
      },
      orderBy: { start_time: 'desc' },
    });
  }

  getPrescriptions(patientId: string, clinicId: string) {
    return this.prisma.medicalRecord.findMany({
      where: {
        patient_id: patientId,
        clinic_id: clinicId,
        deletedAt: null,
      },
      select: {
        id: true,
        diagnosis: true,
        treatment_plan: true,
        createdAt: true,
        doctor: {
          select: { first_name: true, last_name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
