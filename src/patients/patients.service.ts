import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreatePatientDto,
  UpdatePatientDto,
  PatientQueryDto,
} from './dto/patient.dto.js';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(clinicId: string, query: PatientQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = {
      clinic_id: clinicId,
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { first_name: { contains: query.search, mode: 'insensitive' } },
        { last_name: { contains: query.search, mode: 'insensitive' } },
        { identification: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findOne(clinicId: string, id: string) {
    return this.prisma.patient.findFirstOrThrow({
      where: { id, clinic_id: clinicId, deletedAt: null },
    });
  }

  async findAppointments(clinicId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinic_id: clinicId, deletedAt: null },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return this.prisma.appointment.findMany({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        deletedAt: null,
      },
      include: {
        patient: {
          select: { id: true, first_name: true, last_name: true },
        },
        doctor: {
          select: { id: true, first_name: true, last_name: true },
        },
        service: {
          select: { id: true, name: true, duration_minutes: true, price: true },
        },
      },
      orderBy: { start_time: 'desc' },
    });
  }

  async create(clinicId: string, dto: CreatePatientDto) {
    try {
      return await this.prisma.patient.create({
        data: {
          first_name: dto.first_name,
          last_name: dto.last_name,
          identification: dto.identification,
          gender: dto.gender,
          whatsapp_phone: dto.whatsapp_phone,
          emergency_contact: dto.emergency_contact as
            | Prisma.InputJsonValue
            | undefined,
          birth_date: new Date(dto.birth_date),
          clinic_id: clinicId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A patient with this identification already exists in this clinic',
        );
      }
      throw error;
    }
  }

  update(clinicId: string, id: string, dto: UpdatePatientDto) {
    return this.prisma.patient.update({
      where: { id, clinic_id: clinicId },
      data: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        whatsapp_phone: dto.whatsapp_phone,
        emergency_contact: dto.emergency_contact as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
  }
}
