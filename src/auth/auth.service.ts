import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        memberships: {
          where: { is_active: true, deletedAt: null },
          include: { clinic: { select: { id: true, name: true } } },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      memberships: user.memberships.map((m) => ({
        clinic_id: m.clinic_id,
        clinic_name: m.clinic.name,
        role: m.role,
        specialty: m.specialty,
      })),
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException();
    }
    return user;
  }

  async getProfile(userId: string, clinicId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { is_active: true, deletedAt: null },
          include: { clinic: { select: { id: true, name: true } } },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException();
    }

    const activeMembership = user.memberships.find(
      (m) => m.clinic_id === clinicId,
    );

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      active_membership: activeMembership
        ? {
            clinic_id: activeMembership.clinic_id,
            clinic_name: activeMembership.clinic.name,
            role: activeMembership.role,
            specialty: activeMembership.specialty,
          }
        : null,
      memberships: user.memberships.map((m) => ({
        clinic_id: m.clinic_id,
        clinic_name: m.clinic.name,
        role: m.role,
        specialty: m.specialty,
      })),
    };
  }
}
