import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserMembershipDto } from './dto/update-user-membership.dto.js';
import { Role } from '@prisma/client';
import { EmailService } from '../email/email.service.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async findAllByClinic(clinicId: string) {
    const memberships = await this.prisma.clinicMembership.findMany({
      where: { clinic_id: clinicId },
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
      is_active: m.is_active,
      deleted_at: m.deletedAt,
    }));
  }

  async createOrLink(clinicId: string, dto: CreateUserDto) {
    if (dto.role === 'SUPER_ADMIN') {
      throw new BadRequestException(
        'SUPER_ADMIN cannot be assigned from a clinic workspace',
      );
    }

    const clinic = await this.prisma.clinic.findFirst({
      where: { id: clinicId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!clinic) {
      throw new BadRequestException('Clinic not found');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const temporaryPassword = dto.password ?? this.generateTemporaryPassword();

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
        const membership = await this.prisma.clinicMembership.update({
          where: { id: existingMembership.id },
          data: {
            is_active: true,
            deletedAt: null,
            role: dto.role ?? 'STAFF',
            specialty: dto.specialty,
          },
          include: { user: true },
        });
        const invite = await this.emailService.sendStaffInvite({
          clinicName: clinic.name,
          recipientName: `${membership.user.first_name} ${membership.user.last_name}`,
          recipientEmail: membership.user.email,
          roleLabel: this.getRoleLabel(membership.role),
          temporaryPassword,
        });
        return {
          ...this.serializeMembership(membership),
          invite_delivery: invite.delivered ? 'sent' : 'skipped',
        };
      }

      const membership = await this.prisma.clinicMembership.create({
        data: {
          user_id: existingUser.id,
          clinic_id: clinicId,
          role: (dto.role as Role) ?? 'STAFF',
          specialty: dto.specialty,
        },
        include: { user: true },
      });
      const invite = await this.emailService.sendStaffInvite({
        clinicName: clinic.name,
        recipientName: `${membership.user.first_name} ${membership.user.last_name}`,
        recipientEmail: membership.user.email,
        roleLabel: this.getRoleLabel(membership.role),
        temporaryPassword,
      });
      return {
        ...this.serializeMembership(membership),
        invite_delivery: invite.delivered ? 'sent' : 'skipped',
      };
    }

    // Create new user + membership
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

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

    const membership = user.memberships[0];
    const invite = await this.emailService.sendStaffInvite({
      clinicName: clinic.name,
      recipientName: `${user.first_name} ${user.last_name}`,
      recipientEmail: user.email,
      roleLabel: this.getRoleLabel(membership.role),
      temporaryPassword,
    });

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: membership.role,
      specialty: membership.specialty,
      membership_id: membership.id,
      invite_delivery: invite.delivered ? 'sent' : 'skipped',
    };
  }

  async updateMembership(
    clinicId: string,
    membershipId: string,
    dto: UpdateUserMembershipDto,
  ) {
    const membership = await this.prisma.clinicMembership.findFirst({
      where: {
        id: membershipId,
        clinic_id: clinicId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User membership not found');
    }

    if (dto.role === 'SUPER_ADMIN') {
      throw new BadRequestException(
        'SUPER_ADMIN cannot be assigned from a clinic workspace',
      );
    }

    const updated = await this.prisma.clinicMembership.update({
      where: { id: membershipId },
      data: {
        role: dto.role as Role | undefined,
        specialty: dto.specialty,
        is_active: dto.is_active,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return {
      ...this.serializeMembership(updated),
      is_active: updated.is_active,
    };
  }

  async removeMembership(
    clinicId: string,
    membershipId: string,
    actorUserId: string,
  ) {
    const membership = await this.prisma.clinicMembership.findFirst({
      where: {
        id: membershipId,
        clinic_id: clinicId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User membership not found');
    }

    if (membership.user_id === actorUserId) {
      throw new ForbiddenException(
        'You cannot remove your own active membership from this clinic',
      );
    }

    const removed = await this.prisma.clinicMembership.update({
      where: { id: membershipId },
      data: {
        is_active: false,
        deletedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return {
      ...this.serializeMembership(removed),
      is_active: removed.is_active,
    };
  }

  private serializeMembership(
    membership: Awaited<ReturnType<PrismaService['clinicMembership']['create']>> & {
      user: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
      };
    },
  ) {
    return {
      id: membership.user.id,
      first_name: membership.user.first_name,
      last_name: membership.user.last_name,
      email: membership.user.email,
      createdAt: membership.user.createdAt,
      updatedAt: membership.user.updatedAt,
      role: membership.role,
      specialty: membership.specialty,
      membership_id: membership.id,
      is_active: membership.is_active,
      deleted_at: membership.deletedAt,
    };
  }

  private generateTemporaryPassword() {
    return `Cbx-${randomBytes(6).toString('base64url')}`;
  }

  private getRoleLabel(role: Role) {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'DOCTOR':
        return 'Doctor';
      case 'STAFF':
        return 'Recepción';
      default:
        return role;
    }
  }
}
