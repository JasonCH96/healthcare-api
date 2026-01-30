import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Role } from '@prisma/client'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(email: string, password: string, role: Role) {
    return this.prisma.user.create({
      data: {
        email,
        password,
        role,
      },
    })
  }

  async findAll() {
    return this.prisma.user.findMany()
  }
}
