import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  getClinicDateKey,
  getClinicDayBounds,
  getClinicDaysAgoUtc,
  getClinicMonthStartUtc,
} from '../common/utils/clinic-time.util.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(clinicId: string) {
    const { dayStart: todayStart, dayEnd } = getClinicDayBounds(getClinicDateKey(new Date()));
    const todayEnd = new Date(dayEnd.getTime() + 1);
    const monthStart = getClinicMonthStartUtc();

    const [appointmentsToday, newPatientsThisMonth, revenueThisMonth] =
      await Promise.all([
        this.prisma.appointment.count({
          where: {
            clinic_id: clinicId,
            start_time: { gte: todayStart, lt: todayEnd },
            deletedAt: null,
          },
        }),
        this.prisma.patient.count({
          where: {
            clinic_id: clinicId,
            createdAt: { gte: monthStart },
            deletedAt: null,
          },
        }),
        this.prisma.invoice.aggregate({
          where: {
            clinic_id: clinicId,
            createdAt: { gte: monthStart },
            deletedAt: null,
          },
          _sum: { total_amount: true },
        }),
      ]);

    return {
      appointments_today: appointmentsToday,
      new_patients_this_month: newPatientsThisMonth,
      revenue_this_month: revenueThisMonth._sum.total_amount ?? 0,
    };
  }

  async getRevenue(clinicId: string) {
    const thirtyDaysAgo = getClinicDaysAgoUtc(30);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        clinic_id: clinicId,
        createdAt: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
      select: {
        total_amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const revenueByDay = new Map<string, number>();
    for (const inv of invoices) {
      const day = getClinicDateKey(inv.createdAt);
      const current = revenueByDay.get(day) ?? 0;
      revenueByDay.set(day, current + Number(inv.total_amount));
    }

    return Array.from(revenueByDay.entries()).map(([date, total]) => ({
      date,
      total,
    }));
  }
}
