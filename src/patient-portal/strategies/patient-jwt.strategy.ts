import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface PatientJwtPayload {
  sub: string;
  role: 'PATIENT';
  clinic_id: string;
}

@Injectable()
export class PatientJwtStrategy extends PassportStrategy(
  Strategy,
  'patient-jwt',
) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: PatientJwtPayload) {
    if (payload.role !== 'PATIENT') {
      throw new UnauthorizedException();
    }

    const patient = await this.prisma.patient.findFirst({
      where: {
        id: payload.sub,
        clinic_id: payload.clinic_id,
        deletedAt: null,
      },
    });

    if (!patient) {
      throw new UnauthorizedException();
    }

    return { ...patient, role: 'PATIENT' };
  }
}
