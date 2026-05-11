import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException();
    }

    const adminMembership = await this.prisma.clinicMembership.findFirst({
      where: {
        user_id: user.id,
        role: 'ADMIN',
        is_active: true,
        deletedAt: null,
      },
    });

    if (!adminMembership) {
      throw new ForbiddenException('SuperAdmin access required');
    }

    return true;
  }
}
