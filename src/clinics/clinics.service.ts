import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClinicDto, UpdateClinicDto } from './dto/clinic.dto.js';

@Injectable()
export class ClinicsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.clinic.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.clinic.findUniqueOrThrow({
      where: { id, deletedAt: null },
    });
  }

  create(dto: CreateClinicDto) {
    return this.prisma.clinic.create({ data: dto });
  }

  update(id: string, dto: UpdateClinicDto) {
    return this.prisma.clinic.update({
      where: { id },
      data: dto,
    });
  }
}
