import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SKIP_TENANT_KEY } from '../decorators/skip-tenant.decorator.js';
import { TENANT_CLINIC_ID } from '../interceptors/tenant.interceptor.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // If the TenantInterceptor hasn't run yet (guards execute before interceptors),
    // resolve the membership here so role checks work.
    if (!request.membership) {
      const skipTenant = this.reflector.getAllAndOverride<boolean>(
        SKIP_TENANT_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (skipTenant) {
        throw new ForbiddenException('No membership found');
      }

      const clinicId = request.headers['x-clinic-id'] as string;
      if (!clinicId) {
        throw new BadRequestException('x-clinic-id header is required');
      }

      const user = request.user;
      if (!user) {
        throw new ForbiddenException('No membership found');
      }

      const membership = await this.prisma.clinicMembership.findUnique({
        where: {
          user_id_clinic_id: {
            user_id: user.id,
            clinic_id: clinicId,
          },
        },
      });

      if (!membership || !membership.is_active || membership.deletedAt) {
        throw new ForbiddenException('You do not have access to this clinic');
      }

      request[TENANT_CLINIC_ID] = clinicId;
      request.membership = membership;
    }

    const membership = request.membership;
    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
