import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

// Every writer of a doctor's calendar uses the same transaction lock so the
// availability check and the write cannot race with another booking or block.
export function withDoctorScheduleLock<T>(
  prisma: PrismaService,
  doctorId: string,
  action: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${doctorId}))::text`;
      return action(tx);
    },
    { timeout: 10_000 },
  );
}
