import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { TenantClinicId } from '../common/decorators/tenant-clinic-id.decorator.js';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@TenantClinicId() clinicId: string) {
    return this.usersService.findAllByClinic(clinicId);
  }

  @Post()
  @Roles('ADMIN')
  create(@TenantClinicId() clinicId: string, @Body() dto: CreateUserDto) {
    return this.usersService.createOrLink(clinicId, dto);
  }
}
