import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { SKIP_TENANT_KEY } from '../decorators/skip-tenant.decorator.js';
import { TenantService } from '../tenant/tenant.service.js';
import { TENANT_CLINIC_ID } from '../tenant/tenant.constants.js';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantService: TenantService,
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

    await this.tenantService.resolve(context.switchToHttp().getRequest());

    return next.handle();
  }
}
