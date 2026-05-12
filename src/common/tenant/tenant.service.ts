import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TENANT_CLINIC_ID } from './tenant.constants.js';

type RequestWithTenant = {
  headers: Record<string, string | string[] | undefined>;
  user?: { id: string };
  membership?: unknown;
  [TENANT_CLINIC_ID]?: string;
};

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async resolve(request: RequestWithTenant) {
    if (request.membership && request[TENANT_CLINIC_ID]) {
      return {
        clinicId: request[TENANT_CLINIC_ID],
        membership: request.membership,
      };
    }

    const clinicHeader = request.headers['x-clinic-id'];
    const clinicId = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    if (!clinicId) {
      throw new BadRequestException('x-clinic-id header is required');
    }

    const user = request.user;
    if (!user) {
      return { clinicId, membership: null };
    }

    const membership = await this.prisma.clinicMembership.findUnique({
      where: {
        user_id_clinic_id: {
          user_id: user.id,
          clinic_id: clinicId,
        },
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            slug: true,
            is_active: true,
            deletedAt: true,
          },
        },
      },
    });

    if (membership?.is_active && !membership.deletedAt) {
      if (!membership.clinic.is_active || membership.clinic.deletedAt) {
        throw new ForbiddenException('You do not have access to this clinic');
      }

      request[TENANT_CLINIC_ID] = clinicId;
      request.membership = membership;

      return { clinicId, membership };
    }

    const superAdminMembership = await this.resolveSuperAdminMembership(user);
    if (!superAdminMembership) {
      throw new ForbiddenException('You do not have access to this clinic');
    }

    const clinic = await this.prisma.clinic.findFirst({
      where: { id: clinicId, is_active: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        is_active: true,
        deletedAt: true,
      },
    });
    if (!clinic) {
      throw new ForbiddenException('You do not have access to this clinic');
    }

    const effectiveMembership = {
      ...superAdminMembership,
      clinic_id: clinicId,
      clinic,
      role: 'SUPER_ADMIN' as Role,
    };

    request[TENANT_CLINIC_ID] = clinicId;
    request.membership = effectiveMembership;

    return { clinicId, membership: effectiveMembership };
  }

  private async resolveSuperAdminMembership(user: { id: string; email?: string }) {
    const membership = await this.prisma.clinicMembership.findFirst({
      where: {
        user_id: user.id,
        role: 'SUPER_ADMIN',
        is_active: true,
        deletedAt: null,
        clinic: {
          is_active: true,
          deletedAt: null,
        },
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            slug: true,
            is_active: true,
            deletedAt: true,
          },
        },
      },
    });

    if (membership) {
      return membership;
    }

    const superAdminEmails = this.configService
      .get<string>('SUPER_ADMIN_EMAILS', '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (!user.email || !superAdminEmails.includes(user.email.toLowerCase())) {
      return null;
    }

    const bootstrapMembership = await this.prisma.clinicMembership.findFirst({
      where: {
        user_id: user.id,
        is_active: true,
        deletedAt: null,
        clinic: {
          is_active: true,
          deletedAt: null,
        },
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            slug: true,
            is_active: true,
            deletedAt: true,
          },
        },
      },
    });

    return (
      bootstrapMembership ?? {
        id: 'bootstrap-super-admin',
        user_id: user.id,
        clinic_id: '',
        role: 'SUPER_ADMIN' as Role,
        specialty: null,
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        clinic: null,
      }
    );
  }
}
