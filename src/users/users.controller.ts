import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { TenantClinicId } from '../common/decorators/tenant-clinic-id.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserMembershipDto } from './dto/update-user-membership.dto.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@TenantClinicId() clinicId: string) {
    return this.usersService.findAllByClinic(clinicId);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@TenantClinicId() clinicId: string, @Body() dto: CreateUserDto) {
    return this.usersService.createOrLink(clinicId, dto);
  }

  @Patch(':membershipId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateMembership(
    @TenantClinicId() clinicId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateUserMembershipDto,
  ) {
    return this.usersService.updateMembership(clinicId, membershipId, dto);
  }

  @Delete(':membershipId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  removeMembership(
    @TenantClinicId() clinicId: string,
    @Param('membershipId') membershipId: string,
    @CurrentUser('id') actorUserId: string,
  ) {
    return this.usersService.removeMembership(clinicId, membershipId, actorUserId);
  }
}
