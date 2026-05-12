import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TENANT_CLINIC_ID } from '../tenant/tenant.constants.js';

export const TenantClinicId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request[TENANT_CLINIC_ID];
  },
);
