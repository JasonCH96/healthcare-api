import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.email) {
      throw new ForbiddenException();
    }

    const superAdminEmails = this.configService
      .get<string>('SUPER_ADMIN_EMAILS', '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (!superAdminEmails.includes(user.email.toLowerCase())) {
      throw new ForbiddenException('SuperAdmin access required');
    }

    return true;
  }
}
