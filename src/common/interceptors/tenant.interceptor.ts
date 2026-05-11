import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SKIP_TENANT_KEY } from '../decorators/skip-tenant.decorator.js';

export const TENANT_CLINIC_ID = 'tenantClinicId';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const skipTenant = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTenant) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const clinicId = request.headers['x-clinic-id'] as string;

    if (!clinicId) {
      throw new BadRequestException('x-clinic-id header is required');
    }

    const user = request.user;
    if (!user) {
      return next.handle();
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

    return next.handle();
  }
}
