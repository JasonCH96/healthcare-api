import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { TenantModule } from './common/tenant/tenant.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor.js';
import { ClinicsModule } from './clinics/clinics.module.js';
import { UsersModule } from './users/users.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { MedicalRecordsModule } from './medical-records/medical-records.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PatientPortalModule } from './patient-portal/patient-portal.module.js';
import { StorageModule } from './storage/storage.module.js';
import { PdfGeneratorModule } from './pdf-generator/pdf-generator.module.js';
import { BillingModule } from './billing/billing.module.js';
import { BookingModule } from './booking/booking.module.js';
import { ServicesModule } from './services/services.module.js';
import { TimeBlocksModule } from './time-blocks/time-blocks.module.js';
import { PublicModule } from './public/public.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    TenantModule,
    AuthModule,
    ClinicsModule,
    UsersModule,
    PatientsModule,
    AppointmentsModule,
    MedicalRecordsModule,
    AnalyticsModule,
    NotificationsModule,
    PatientPortalModule,
    StorageModule,
    PdfGeneratorModule,
    BillingModule,
    BookingModule,
    ServicesModule,
    TimeBlocksModule,
    PublicModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
