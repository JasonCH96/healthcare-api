import { Controller, Get, Post, Body } from '@nestjs/common'
import { UsersService } from './users.service'
import { Role } from '@prisma/client'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() body: { email: string; password: string; role: Role }) {
    return this.usersService.createUser(
      body.email,
      body.password,
      body.role,
    )
  }

  @Get()
  findAll() {
    return this.usersService.findAll()
  }
}

