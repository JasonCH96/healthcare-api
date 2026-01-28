import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash password for admin user
  const hashedPassword = await bcrypt.hash('Admin123!', 12);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinic.com' },
    update: {},
    create: {
      email: 'admin@clinic.com',
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
      passwordChangedAt: new Date(),
    },
  });

  console.log('✅ Admin user created:', {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });

  // Create sample doctor
  const doctorPassword = await bcrypt.hash('Doctor123!', 12);
  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@clinic.com' },
    update: {},
    create: {
      email: 'doctor@clinic.com',
      password: doctorPassword,
      role: Role.DOCTOR,
      isActive: true,
      passwordChangedAt: new Date(),
    },
  });

  console.log('✅ Doctor user created:', {
    id: doctor.id,
    email: doctor.email,
    role: doctor.role,
  });

  // Create sample staff
  const staffPassword = await bcrypt.hash('Staff123!', 12);
  const staff = await prisma.user.upsert({
    where: { email: 'staff@clinic.com' },
    update: {},
    create: {
      email: 'staff@clinic.com',
      password: staffPassword,
      role: Role.STAFF,
      isActive: true,
      passwordChangedAt: new Date(),
    },
  });

  console.log('✅ Staff user created:', {
    id: staff.id,
    email: staff.email,
    role: staff.role,
  });

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Test credentials:');
  console.log('   Admin: admin@clinic.com / Admin123!');
  console.log('   Doctor: doctor@clinic.com / Doctor123!');
  console.log('   Staff: staff@clinic.com / Staff123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
