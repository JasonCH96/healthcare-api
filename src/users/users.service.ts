import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user with hashed password
   */
  async create(createUserDto: CreateUserDto) {
    const { email, password, role, isActive } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        isActive: isActive ?? true,
        passwordChangedAt: new Date(),
      },
    });

    this.logger.log(`User created: ${user.email} (${user.role})`);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Find all users (paginated)
   */
  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          lastLoginAt: true,
          lastLoginIp: true,
          mfaEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find user by ID
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        lastLoginIp: true,
        mfaEnabled: true,
        passwordChangedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Find user by email (includes password for auth)
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by email (alias for auth service)
   */
  async findOneByEmail(email: string) {
    return this.findByEmail(email);
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // Verify user exists

    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        lastLoginIp: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`User updated: ${user.email}`);

    return user;
  }

  /**
   * Deactivate user (soft delete)
   */
  async remove(id: string) {
    await this.findOne(id); // Verify user exists

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });

    this.logger.log(`User deactivated: ${user.email}`);

    return user;
  }

  /**
   * Unlock user account
   */
  async unlock(id: string) {
    await this.findOne(id); // Verify user exists

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        email: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    this.logger.log(`User unlocked: ${user.email}`);

    return user;
  }

  /**
   * Reset user password
   */
  async resetPassword(id: string, newPassword: string) {
    await this.findOne(id); // Verify user exists

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        email: true,
      },
    });

    this.logger.log(`Password reset for user: ${user.email}`);

    return user;
  }
}
