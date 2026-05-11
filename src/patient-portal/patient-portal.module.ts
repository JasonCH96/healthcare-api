import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PatientPortalController } from './patient-portal.controller.js';
import { PatientPortalService } from './services/patient-portal.service.js';
import { PatientJwtStrategy } from './strategies/patient-jwt.strategy.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRATION', '15m') as any,
        },
      }),
    }),
  ],
  controllers: [PatientPortalController],
  providers: [PatientPortalService, PatientJwtStrategy],
})
export class PatientPortalModule {}
