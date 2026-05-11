import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByClinic(clinicId: string) {
    const memberships = await this.prisma.clinicMembership.findMany({
      where: { clinic_id: clinicId, is_active: true, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.user,
      role: m.role,
      specialty: m.specialty,
      membership_id: m.id,
    }));
  }

  async createOrLink(clinicId: string, dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      // Link existing user to this clinic
      const existingMembership = await this.prisma.clinicMembership.findUnique({
        where: {
          user_id_clinic_id: {
            user_id: existingUser.id,
            clinic_id: clinicId,
          },
        },
      });

      if (existingMembership && existingMembership.is_active) {
        throw new ConflictException('User is already a member of this clinic');
      }

      if (existingMembership) {
        // Reactivate
        return this.prisma.clinicMembership.update({
          where: { id: existingMembership.id },
          data: {
            is_active: true,
            deletedAt: null,
            role: dto.role ?? 'STAFF',
            specialty: dto.specialty,
          },
          include: { user: true },
        });
      }

      return this.prisma.clinicMembership.create({
        data: {
          user_id: existingUser.id,
          clinic_id: clinicId,
          role: (dto.role as Role) ?? 'STAFF',
          specialty: dto.specialty,
        },
        include: { user: true },
      });
    }

    // Create new user + membership
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        email: dto.email,
        password: hashedPassword,
        memberships: {
          create: {
            clinic_id: clinicId,
            role: (dto.role as Role) ?? 'STAFF',
            specialty: dto.specialty,
          },
        },
      },
      include: {
        memberships: {
          where: { clinic_id: clinicId },
        },
      },
    });

    const { password: _, ...result } = user;
    return result;
  }
}
