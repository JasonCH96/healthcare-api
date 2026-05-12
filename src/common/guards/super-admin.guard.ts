import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.id || !user?.email) {
      throw new ForbiddenException();
    }

    const superAdminEmails = this.configService
      .get<string>('SUPER_ADMIN_EMAILS', '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const isBootstrapSuperAdmin = superAdminEmails.includes(
      user.email.toLowerCase(),
    );
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
    });

    if (!isBootstrapSuperAdmin && !membership) {
      throw new ForbiddenException('SuperAdmin access required');
    }

    return true;
  }
}
