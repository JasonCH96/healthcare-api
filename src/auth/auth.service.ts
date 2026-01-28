import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new ForbiddenException(`Account locked. Try again after ${user.lockedUntil.toISOString()}`);
    }

    const isPasswordMatching = await bcrypt.compare(pass, user.password);

    if (!isPasswordMatching) {
        await this.prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: { increment: 1 } },
        });

        if (user.failedLoginAttempts + 1 >= this.configService.get<number>('MAX_LOGIN_ATTEMPTS', 5)) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    lockedUntil: new Date(Date.now() + this.configService.get<number>('LOCKOUT_DURATION_MINUTES', 30) * 60 * 1000),
                },
            });
        }
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email, user.role);

    return { accessToken, refreshToken, user };
  }

  async generateTokens(userId: string, email: string, role: string) {
    const tokenFamily = uuidv4();
    const accessToken = await this.generateAccessToken(userId, email, role, tokenFamily);
    const refreshToken = await this.generateRefreshToken(userId, tokenFamily);
    return { accessToken, refreshToken };
  }

  async generateAccessToken(userId: string, email: string, role: string, sessionId: string): Promise<string> {
    const payload = { sub: userId, email, role, sessionId };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION'),
    });
  }

  async generateRefreshToken(userId: string, tokenFamily: string): Promise<string> {
    const version = 1;
    const payload = { sub: userId, tokenFamily, version };
    const token = await this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
    });

    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
        data: {
            tokenHash,
            userId,
            tokenFamily,
            version,
            expiresAt,
        },
    });

    return token;
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
        throw new UnauthorizedException('User not found');
    }

    const refreshTokenFromDb = await this.prisma.refreshToken.findFirst({
        where: {
            userId,
            isRevoked: false,
        },
        orderBy: {
            createdAt: 'desc',
        }
    });

    if (!refreshTokenFromDb) {
        throw new UnauthorizedException('No valid refresh token found');
    }

    const isRefreshTokenMatching = await bcrypt.compare(refreshToken, refreshTokenFromDb.tokenHash);

    if (!isRefreshTokenMatching) {
        throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
        where: { id: refreshTokenFromDb.id },
        data: { isRevoked: true },
    });

    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });
  }
}
