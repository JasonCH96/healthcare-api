import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
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
  constructor(private readonly prisma: PrismaService) {}

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

    if (
      !membership ||
      !membership.is_active ||
      membership.deletedAt ||
      !membership.clinic.is_active ||
      membership.clinic.deletedAt
    ) {
      throw new ForbiddenException('You do not have access to this clinic');
    }

    request[TENANT_CLINIC_ID] = clinicId;
    request.membership = membership;

    return { clinicId, membership };
  }
}
