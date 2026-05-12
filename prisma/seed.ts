import {
  PrismaClient,
  Role,
  Gender,
  AppointmentStatus,
  HaciendaStatus,
  PaymentStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);
const DEFAULT_PASSWORD = process.env.MOCK_USER_PASSWORD ?? 'Password123';

const clinicSeeds = [
  {
    key: 'demo',
    name: 'Clinica Demo',
    slug: 'clinica-demo',
    tax_id: '3-101-000000',
    phone: '2200-0000',
    email: 'info@clinica.cr',
    address: 'San Jose, Costa Rica',
    theme_color: '#3ECF62',
  },
  {
    key: 'escazu',
    name: 'Clinica Escazu',
    slug: 'clinica-escazu',
    tax_id: '3-101-000001',
    phone: '2210-0000',
    email: 'info@escazu.cr',
    address: 'Escazu, Costa Rica',
    theme_color: '#2563EB',
  },
  {
    key: 'cartago',
    name: 'Clinica Cartago Centro',
    slug: 'clinica-cartago-centro',
    tax_id: '3-101-000002',
    phone: '2550-0000',
    email: 'info@cartago.cr',
    address: 'Cartago, Costa Rica',
    theme_color: '#F97316',
  },
  {
    key: 'alajuela',
    name: 'Clinica Alajuela Norte',
    slug: 'clinica-alajuela-norte',
    tax_id: '3-101-000003',
    phone: '2440-0000',
    email: 'info@alajuela.cr',
    address: 'Alajuela, Costa Rica',
    theme_color: '#7C3AED',
  },
];

const userSeeds = [
  {
    key: 'super',
    email: process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@citabox.app',
    password: process.env.SUPER_ADMIN_PASSWORD ?? DEFAULT_PASSWORD,
    first_name: process.env.SUPER_ADMIN_FIRST_NAME ?? 'Super',
    last_name: process.env.SUPER_ADMIN_LAST_NAME ?? 'Admin',
  },
  {
    key: 'platform-ops',
    email: 'ops@citabox.app',
    password: DEFAULT_PASSWORD,
    first_name: 'Platform',
    last_name: 'Ops',
  },
  {
    key: 'demo-admin',
    email: 'admin@clinica.cr',
    password: 'admin123',
    first_name: 'Andrea',
    last_name: 'Mora',
  },
  {
    key: 'demo-admin-2',
    email: 'admin2@clinica.cr',
    password: DEFAULT_PASSWORD,
    first_name: 'Luis',
    last_name: 'Campos',
  },
  {
    key: 'escazu-admin',
    email: 'admin@escazu.cr',
    password: DEFAULT_PASSWORD,
    first_name: 'Mariana',
    last_name: 'Solano',
  },
  {
    key: 'cartago-admin',
    email: 'admin@cartago.cr',
    password: DEFAULT_PASSWORD,
    first_name: 'Rafael',
    last_name: 'Vargas',
  },
  {
    key: 'alajuela-admin',
    email: 'admin@alajuela.cr',
    password: DEFAULT_PASSWORD,
    first_name: 'Sofia',
    last_name: 'Rojas',
  },
  {
    key: 'doctor-carlos',
    email: 'doctor@clinica.cr',
    password: 'doctor123',
    first_name: 'Carlos',
    last_name: 'Mendez',
  },
  {
    key: 'doctor-laura',
    email: 'laura@clinica.cr',
    password: DEFAULT_PASSWORD,
    first_name: 'Laura',
    last_name: 'Martinez',
  },
  {
    key: 'doctor-escazu',
    email: 'doctor@escazu.cr',
    password: DEFAULT_PASSWORD,
    first_name: 'Esteban',
    last_name: 'Pineda',
  },
  {
    key: 'doctor-cartago',
    email: 'doctor@cartago.cr',
    password: DEFAULT_PASSWORD,
    first_name: 'Valeria',
    last_name: 'Jimenez',
  },
  {
    key: 'doctor-alajuela',
    email: 'doctor@alajuela.cr',
    password: DEFAULT_PASSWORD,
    first_name: 'Diego',
    last_name: 'Navarro',
  },
  {
    key: 'staff-demo',
    email: 'staff@clinica.cr',
    password: 'staff123',
    first_name: 'Ana',
    last_name: 'Rodriguez',
  },
  {
    key: 'staff-escazu',
    email: 'staff@escazu.cr',
    password: DEFAULT_PASSWORD,
    first_name: 'Paola',
    last_name: 'Castro',
  },
  {
    key: 'staff-cartago',
    email: 'staff@cartago.cr',
    password: DEFAULT_PASSWORD,
    first_name: 'Kevin',
    last_name: 'Araya',
  },
  {
    key: 'staff-alajuela',
    email: 'staff@alajuela.cr',
    password: DEFAULT_PASSWORD,
    first_name: 'Natalia',
    last_name: 'Quesada',
  },
];

const membershipSeeds = [
  { user: 'super', clinic: 'demo', role: Role.SUPER_ADMIN },
  { user: 'super', clinic: 'escazu', role: Role.SUPER_ADMIN },
  { user: 'super', clinic: 'cartago', role: Role.SUPER_ADMIN },
  { user: 'super', clinic: 'alajuela', role: Role.SUPER_ADMIN },
  { user: 'platform-ops', clinic: 'demo', role: Role.SUPER_ADMIN },
  { user: 'platform-ops', clinic: 'escazu', role: Role.SUPER_ADMIN },
  { user: 'demo-admin', clinic: 'demo', role: Role.ADMIN },
  { user: 'demo-admin', clinic: 'escazu', role: Role.ADMIN },
  { user: 'demo-admin-2', clinic: 'demo', role: Role.ADMIN },
  { user: 'escazu-admin', clinic: 'escazu', role: Role.ADMIN },
  { user: 'cartago-admin', clinic: 'cartago', role: Role.ADMIN },
  { user: 'alajuela-admin', clinic: 'alajuela', role: Role.ADMIN },
  {
    user: 'doctor-carlos',
    clinic: 'demo',
    role: Role.DOCTOR,
    specialty: 'General Dentistry',
  },
  {
    user: 'doctor-laura',
    clinic: 'demo',
    role: Role.DOCTOR,
    specialty: 'Orthodontics',
  },
  {
    user: 'doctor-escazu',
    clinic: 'escazu',
    role: Role.DOCTOR,
    specialty: 'Endodontics',
  },
  {
    user: 'doctor-cartago',
    clinic: 'cartago',
    role: Role.DOCTOR,
    specialty: 'Pediatric Dentistry',
  },
  {
    user: 'doctor-alajuela',
    clinic: 'alajuela',
    role: Role.DOCTOR,
    specialty: 'Oral Surgery',
  },
  { user: 'staff-demo', clinic: 'demo', role: Role.STAFF },
  { user: 'staff-escazu', clinic: 'escazu', role: Role.STAFF },
  { user: 'staff-cartago', clinic: 'cartago', role: Role.STAFF },
  { user: 'staff-alajuela', clinic: 'alajuela', role: Role.STAFF },
];

const serviceSeeds = [
  {
    key: 'cleaning',
    name: 'Dental Cleaning',
    description: 'Routine cleaning and exam',
    duration_minutes: 45,
    price: 4500000,
  },
  {
    key: 'whitening',
    name: 'Teeth Whitening',
    description: 'In-office whitening session',
    duration_minutes: 60,
    price: 9500000,
  },
  {
    key: 'root-canal',
    name: 'Root Canal',
    description: 'Endodontic treatment',
    duration_minutes: 90,
    price: 18500000,
  },
  {
    key: 'orthodontics',
    name: 'Orthodontic Review',
    description: 'Braces and aligner follow-up',
    duration_minutes: 30,
    price: 3500000,
  },
  {
    key: 'surgery',
    name: 'Oral Surgery Consult',
    description: 'Surgical evaluation',
    duration_minutes: 45,
    price: 6500000,
  },
];

const patientSeeds = [
  {
    clinic: 'demo',
    identification: '1-1000-0001',
    first_name: 'Maria',
    last_name: 'Gonzalez',
    gender: Gender.F,
    birth_date: '1988-04-12',
    whatsapp_phone: '8888-0001',
  },
  {
    clinic: 'demo',
    identification: '1-1000-0002',
    first_name: 'Carlos',
    last_name: 'Rivera',
    gender: Gender.M,
    birth_date: '1979-09-22',
    whatsapp_phone: '8888-0002',
  },
  {
    clinic: 'demo',
    identification: '1-1000-0003',
    first_name: 'Samantha',
    last_name: 'Lopez',
    gender: Gender.F,
    birth_date: '1995-01-18',
    whatsapp_phone: '8888-0003',
  },
  {
    clinic: 'escazu',
    identification: '1-2000-0001',
    first_name: 'Daniel',
    last_name: 'Arias',
    gender: Gender.M,
    birth_date: '1984-11-02',
    whatsapp_phone: '8888-1001',
  },
  {
    clinic: 'escazu',
    identification: '1-2000-0002',
    first_name: 'Fernanda',
    last_name: 'Soto',
    gender: Gender.F,
    birth_date: '1990-07-15',
    whatsapp_phone: '8888-1002',
  },
  {
    clinic: 'cartago',
    identification: '1-3000-0001',
    first_name: 'Mateo',
    last_name: 'Vega',
    gender: Gender.M,
    birth_date: '2012-03-08',
    whatsapp_phone: '8888-2001',
  },
  {
    clinic: 'cartago',
    identification: '1-3000-0002',
    first_name: 'Lucia',
    last_name: 'Molina',
    gender: Gender.F,
    birth_date: '2016-12-21',
    whatsapp_phone: '8888-2002',
  },
  {
    clinic: 'alajuela',
    identification: '1-4000-0001',
    first_name: 'Jose',
    last_name: 'Mendez',
    gender: Gender.M,
    birth_date: '1972-05-10',
    whatsapp_phone: '8888-3001',
  },
  {
    clinic: 'alajuela',
    identification: '1-4000-0002',
    first_name: 'Camila',
    last_name: 'Herrera',
    gender: Gender.F,
    birth_date: '1999-10-27',
    whatsapp_phone: '8888-3002',
  },
];

async function main() {
  console.log('Seeding mock SaaS database...');

  const clinics = new Map<
    string,
    Awaited<ReturnType<typeof prisma.clinic.upsert>>
  >();
  for (const clinic of clinicSeeds) {
    const { key, ...clinicData } = clinic;
    const record = await prisma.clinic.upsert({
      where: { tax_id: clinicData.tax_id },
      update: {
        name: clinicData.name,
        slug: clinicData.slug,
        phone: clinicData.phone,
        email: clinicData.email,
        address: clinicData.address,
        public_phone: clinicData.phone,
        public_email: clinicData.email,
        theme_color: clinicData.theme_color,
        booking_enabled: true,
        is_active: true,
        deletedAt: null,
      },
      create: {
        ...clinicData,
        public_phone: clinicData.phone,
        public_email: clinicData.email,
        booking_enabled: true,
        is_active: true,
      },
    });
    clinics.set(key, record);
  }

  const users = new Map<
    string,
    Awaited<ReturnType<typeof prisma.user.upsert>>
  >();
  for (const seed of userSeeds) {
    const password = await bcrypt.hash(seed.password, ROUNDS);
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        first_name: seed.first_name,
        last_name: seed.last_name,
        password,
        deletedAt: null,
      },
      create: {
        email: seed.email,
        password,
        first_name: seed.first_name,
        last_name: seed.last_name,
      },
    });
    users.set(seed.key, user);
  }

  for (const seed of membershipSeeds) {
    const user = users.get(seed.user)!;
    const clinic = clinics.get(seed.clinic)!;
    await prisma.clinicMembership.upsert({
      where: {
        user_id_clinic_id: {
          user_id: user.id,
          clinic_id: clinic.id,
        },
      },
      update: {
        role: seed.role,
        specialty: seed.specialty ?? null,
        is_active: true,
        deletedAt: null,
      },
      create: {
        user_id: user.id,
        clinic_id: clinic.id,
        role: seed.role,
        specialty: seed.specialty ?? null,
        is_active: true,
      },
    });
  }

  const services = new Map<
    string,
    Awaited<ReturnType<typeof prisma.service.upsert>>
  >();
  for (const clinicSeed of clinicSeeds) {
    const clinic = clinics.get(clinicSeed.key)!;
    for (const service of serviceSeeds) {
      const record = await prisma.service.upsert({
        where: { id: `svc-${clinicSeed.key}-${service.key}` },
        update: {
          name: service.name,
          description: service.description,
          duration_minutes: service.duration_minutes,
          price: service.price,
          is_active: true,
          deletedAt: null,
        },
        create: {
          id: `svc-${clinicSeed.key}-${service.key}`,
          clinic_id: clinic.id,
          name: service.name,
          description: service.description,
          duration_minutes: service.duration_minutes,
          price: service.price,
          is_active: true,
        },
      });
      services.set(`${clinicSeed.key}:${service.key}`, record);
    }
  }

  const doctorByClinic: Record<string, string[]> = {
    demo: ['doctor-carlos', 'doctor-laura'],
    escazu: ['doctor-escazu'],
    cartago: ['doctor-cartago'],
    alajuela: ['doctor-alajuela'],
  };

  for (const [clinicKey, doctorKeys] of Object.entries(doctorByClinic)) {
    for (const doctorKey of doctorKeys) {
      const doctor = users.get(doctorKey)!;
      const serviceKeys =
        clinicKey === 'demo' && doctorKey === 'doctor-laura'
          ? ['orthodontics', 'whitening']
          : ['cleaning', 'root-canal', 'surgery'];

      for (const serviceKey of serviceKeys) {
        const service = services.get(`${clinicKey}:${serviceKey}`)!;
        await prisma.serviceDoctor.upsert({
          where: {
            service_id_doctor_id: {
              service_id: service.id,
              doctor_id: doctor.id,
            },
          },
          update: {},
          create: {
            service_id: service.id,
            doctor_id: doctor.id,
          },
        });
      }
    }
  }

  const patients = new Map<
    string,
    Awaited<ReturnType<typeof prisma.patient.upsert>>
  >();
  for (const seed of patientSeeds) {
    const clinic = clinics.get(seed.clinic)!;
    const patient = await prisma.patient.upsert({
      where: {
        clinic_id_identification: {
          clinic_id: clinic.id,
          identification: seed.identification,
        },
      },
      update: {
        first_name: seed.first_name,
        last_name: seed.last_name,
        birth_date: new Date(seed.birth_date),
        gender: seed.gender,
        whatsapp_phone: seed.whatsapp_phone,
        emergency_contact: {
          name: 'Emergency Contact',
          phone: seed.whatsapp_phone,
        },
        deletedAt: null,
      },
      create: {
        clinic_id: clinic.id,
        first_name: seed.first_name,
        last_name: seed.last_name,
        identification: seed.identification,
        birth_date: new Date(seed.birth_date),
        gender: seed.gender,
        whatsapp_phone: seed.whatsapp_phone,
        emergency_contact: {
          name: 'Emergency Contact',
          phone: seed.whatsapp_phone,
        },
      },
    });
    patients.set(`${seed.clinic}:${seed.identification}`, patient);
  }

  const appointmentSeeds = [
    {
      id: 'appt-demo-001',
      clinic: 'demo',
      patient: '1-1000-0001',
      doctor: 'doctor-carlos',
      service: 'cleaning',
      start: '2026-05-12T15:00:00.000Z',
      end: '2026-05-12T15:45:00.000Z',
      status: AppointmentStatus.CONFIRMED,
      reason: 'Routine cleaning',
    },
    {
      id: 'appt-demo-002',
      clinic: 'demo',
      patient: '1-1000-0002',
      doctor: 'doctor-laura',
      service: 'orthodontics',
      start: '2026-05-12T17:00:00.000Z',
      end: '2026-05-12T17:30:00.000Z',
      status: AppointmentStatus.WAITING,
      reason: 'Aligner follow-up',
    },
    {
      id: 'appt-demo-003',
      clinic: 'demo',
      patient: '1-1000-0003',
      doctor: 'doctor-carlos',
      service: 'root-canal',
      start: '2026-05-13T16:00:00.000Z',
      end: '2026-05-13T17:30:00.000Z',
      status: AppointmentStatus.PENDING,
      reason: 'Pain evaluation',
    },
    {
      id: 'appt-escazu-001',
      clinic: 'escazu',
      patient: '1-2000-0001',
      doctor: 'doctor-escazu',
      service: 'root-canal',
      start: '2026-05-12T16:00:00.000Z',
      end: '2026-05-12T17:30:00.000Z',
      status: AppointmentStatus.CONFIRMED,
      reason: 'Endodontic treatment',
    },
    {
      id: 'appt-cartago-001',
      clinic: 'cartago',
      patient: '1-3000-0001',
      doctor: 'doctor-cartago',
      service: 'cleaning',
      start: '2026-05-14T15:00:00.000Z',
      end: '2026-05-14T15:45:00.000Z',
      status: AppointmentStatus.PENDING,
      reason: 'Child checkup',
    },
    {
      id: 'appt-alajuela-001',
      clinic: 'alajuela',
      patient: '1-4000-0001',
      doctor: 'doctor-alajuela',
      service: 'surgery',
      start: '2026-05-15T18:00:00.000Z',
      end: '2026-05-15T18:45:00.000Z',
      status: AppointmentStatus.CONFIRMED,
      reason: 'Implant consult',
    },
  ];

  for (const seed of appointmentSeeds) {
    const clinic = clinics.get(seed.clinic)!;
    const doctor = users.get(seed.doctor)!;
    const patient = patients.get(`${seed.clinic}:${seed.patient}`)!;
    const service = services.get(`${seed.clinic}:${seed.service}`)!;
    await prisma.appointment.upsert({
      where: { id: seed.id },
      update: {
        clinic_id: clinic.id,
        patient_id: patient.id,
        doctor_id: doctor.id,
        service_id: service.id,
        start_time: new Date(seed.start),
        end_time: new Date(seed.end),
        status: seed.status,
        reason: seed.reason,
        deletedAt: null,
      },
      create: {
        id: seed.id,
        clinic_id: clinic.id,
        patient_id: patient.id,
        doctor_id: doctor.id,
        service_id: service.id,
        start_time: new Date(seed.start),
        end_time: new Date(seed.end),
        status: seed.status,
        reason: seed.reason,
      },
    });
  }

  const invoiceSeeds = [
    {
      id: 'inv-demo-001',
      clinic: 'demo',
      patient: '1-1000-0001',
      amount: 4500000,
      description: 'Dental Cleaning',
      hacienda: HaciendaStatus.ACCEPTED,
      payment: PaymentStatus.PAID,
    },
    {
      id: 'inv-demo-002',
      clinic: 'demo',
      patient: '1-1000-0002',
      amount: 3500000,
      description: 'Orthodontic Review',
      hacienda: HaciendaStatus.DRAFT,
      payment: PaymentStatus.UNPAID,
    },
    {
      id: 'inv-escazu-001',
      clinic: 'escazu',
      patient: '1-2000-0001',
      amount: 18500000,
      description: 'Root Canal',
      hacienda: HaciendaStatus.ACCEPTED,
      payment: PaymentStatus.PARTIAL,
    },
    {
      id: 'inv-cartago-001',
      clinic: 'cartago',
      patient: '1-3000-0001',
      amount: 4500000,
      description: 'Dental Cleaning',
      hacienda: HaciendaStatus.DRAFT,
      payment: PaymentStatus.UNPAID,
    },
    {
      id: 'inv-alajuela-001',
      clinic: 'alajuela',
      patient: '1-4000-0001',
      amount: 6500000,
      description: 'Oral Surgery Consult',
      hacienda: HaciendaStatus.REJECTED,
      payment: PaymentStatus.UNPAID,
    },
  ];

  for (const seed of invoiceSeeds) {
    const clinic = clinics.get(seed.clinic)!;
    const patient = patients.get(`${seed.clinic}:${seed.patient}`)!;
    await prisma.invoice.upsert({
      where: { id: seed.id },
      update: {
        clinic_id: clinic.id,
        patient_id: patient.id,
        total_amount: seed.amount,
        service_description: seed.description,
        hacienda_status: seed.hacienda,
        payment_status: seed.payment,
        deletedAt: null,
      },
      create: {
        id: seed.id,
        clinic_id: clinic.id,
        patient_id: patient.id,
        total_amount: seed.amount,
        service_description: seed.description,
        hacienda_status: seed.hacienda,
        payment_status: seed.payment,
      },
    });
  }

  console.log(
    `Seeded ${clinics.size} clinics, ${users.size} users, ${patientSeeds.length} patients.`,
  );
  console.log(`Default mock user password: ${DEFAULT_PASSWORD}`);
  console.log(
    `Superadmin: ${process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@citabox.app'}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
