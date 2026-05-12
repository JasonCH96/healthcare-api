import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  const clinic = await prisma.clinic.upsert({
    where: { tax_id: '3-101-000000' },
    update: {
      slug: 'clinica-demo',
      address: 'San Jose, Costa Rica',
      public_phone: '2200-0000',
      public_email: 'info@clinica.cr',
      booking_enabled: true,
    },
    create: {
      name: 'Clinica Demo',
      slug: 'clinica-demo',
      tax_id: '3-101-000000',
      phone: '2200-0000',
      email: 'info@clinica.cr',
      address: 'San Jose, Costa Rica',
      public_phone: '2200-0000',
      public_email: 'info@clinica.cr',
      is_active: true,
    },
  });

  const secondClinic = await prisma.clinic.upsert({
    where: { tax_id: '3-101-000001' },
    update: {
      slug: 'clinica-escazu',
      address: 'Escazu, Costa Rica',
      public_phone: '2210-0000',
      public_email: 'info@escazu.cr',
      booking_enabled: true,
    },
    create: {
      name: 'Clinica Escazu',
      slug: 'clinica-escazu',
      tax_id: '3-101-000001',
      phone: '2210-0000',
      email: 'info@escazu.cr',
      address: 'Escazu, Costa Rica',
      public_phone: '2210-0000',
      public_email: 'info@escazu.cr',
      is_active: true,
    },
  });

  console.log('Clinics:', clinic.name, clinic.id, secondClinic.name, secondClinic.id);

  const ROUNDS = 12;
  const users = [
    {
      email: 'admin@clinica.cr',
      password: 'admin123',
      first_name: 'Admin',
      last_name: 'User',
      role: 'ADMIN' as const,
    },
    {
      email: 'staff@clinica.cr',
      password: 'staff123',
      first_name: 'Receptionist',
      last_name: 'User',
      role: 'STAFF' as const,
    },
    {
      email: 'doctor@clinica.cr',
      password: 'doctor123',
      first_name: 'Doctor',
      last_name: 'User',
      role: 'DOCTOR' as const,
      specialty: 'General Medicine',
    },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hash },
      create: {
        email: u.email,
        password: hash,
        first_name: u.first_name,
        last_name: u.last_name,
      },
    });

    await prisma.clinicMembership.upsert({
      where: { user_id_clinic_id: { user_id: user.id, clinic_id: clinic.id } },
      update: {
        role: u.role,
        specialty: u.specialty ?? null,
        is_active: true,
        deletedAt: null,
      },
      create: {
        user_id: user.id,
        clinic_id: clinic.id,
        role: u.role,
        specialty: u.specialty ?? null,
        is_active: true,
      },
    });

    if (u.role === 'ADMIN') {
      await prisma.clinicMembership.upsert({
        where: {
          user_id_clinic_id: {
            user_id: user.id,
            clinic_id: secondClinic.id,
          },
        },
        update: { is_active: true, deletedAt: null, role: 'ADMIN' },
        create: {
          user_id: user.id,
          clinic_id: secondClinic.id,
          role: 'ADMIN',
          is_active: true,
        },
      });
    }

    console.log(`Created user: ${u.email} (${u.role})`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
