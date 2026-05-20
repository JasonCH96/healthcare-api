import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

type LoginContext = {
  token: string;
  clinicId: string;
  clinicSlug: string;
};

async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<LoginContext> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  const membership = response.body.memberships.find(
    (item: { clinic_slug: string }) => item.clinic_slug === 'clinica-demo',
  );

  expect(response.body.access_token).toBeTruthy();
  expect(membership).toBeTruthy();

  return {
    token: response.body.access_token,
    clinicId: membership.clinic_id,
    clinicSlug: membership.clinic_slug,
  };
}

function authHeaders(ctx: LoginContext) {
  return {
    Authorization: `Bearer ${ctx.token}`,
    'x-clinic-id': ctx.clinicId,
  };
}

describe('CitaBox functional API QA (e2e)', () => {
  let app: INestApplication;
  let admin: LoginContext;
  let staff: LoginContext;
  let doctor: LoginContext;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    admin = await login(app, 'admin@clinica.cr', 'admin123');
    staff = await login(app, 'staff@clinica.cr', 'staff123');
    doctor = await login(app, 'doctor@clinica.cr', 'doctor123');
  });

  afterAll(async () => {
    await app.close();
  });

  it('A1/S1/D1 authenticates seeded admin, staff and doctor users', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set(authHeaders(admin))
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('admin@clinica.cr');
        expect(body.active_membership.role).toBe('ADMIN');
      });

    await request(app.getHttpServer())
      .get('/auth/me')
      .set(authHeaders(staff))
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('staff@clinica.cr');
        expect(body.active_membership.role).toBe('STAFF');
      });

    await request(app.getHttpServer())
      .get('/auth/me')
      .set(authHeaders(doctor))
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('doctor@clinica.cr');
        expect(body.active_membership.role).toBe('DOCTOR');
      });
  });

  it('A3/P1 creates a patient, searches it and exposes its appointment history endpoint', async () => {
    const unique = Date.now();
    const identification = `QA-${unique}`;

    const created = await request(app.getHttpServer())
      .post('/patients')
      .set(authHeaders(admin))
      .send({
        first_name: 'QA',
        last_name: 'Paciente',
        identification,
        birth_date: '1990-01-01',
        gender: 'OTHER',
        whatsapp_phone: '88880000',
      })
      .expect(201);

    expect(created.body.id).toBeTruthy();

    await request(app.getHttpServer())
      .get(`/patients?search=${encodeURIComponent(identification)}&page=1&limit=10`)
      .set(authHeaders(admin))
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.some((patient: { id: string }) => patient.id === created.body.id)).toBe(true);
        expect(body.meta.total).toBeGreaterThanOrEqual(1);
      });

    await request(app.getHttpServer())
      .get(`/patients/${created.body.id}/appointments`)
      .set(authHeaders(admin))
      .expect(200)
      .expect(({ body }) => {
        expect(Array.isArray(body)).toBe(true);
      });
  });

  it('A4/A6/A7 creates, updates, cancels and deletes an internal appointment', async () => {
    const [patients, doctors] = await Promise.all([
      request(app.getHttpServer()).get('/patients?limit=1').set(authHeaders(admin)).expect(200),
      request(app.getHttpServer())
        .get(`/booking/doctors?clinic_id=${admin.clinicId}`)
        .expect(200),
    ]);

    const patientId = patients.body.data[0].id;
    const doctorId = doctors.body.find(
      (item: { first_name: string }) => item.first_name === 'Carlos',
    ).id;

    const appointment = await request(app.getHttpServer())
      .post('/appointments')
      .set(authHeaders(admin))
      .send({
        patient_id: patientId,
        doctor_id: doctorId,
        start_time: '2026-06-10T15:00:00.000Z',
        end_time: '2026-06-10T15:45:00.000Z',
        reason: 'QA appointment',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/appointments/${appointment.body.id}`)
      .set(authHeaders(admin))
      .send({ reason: 'QA appointment updated' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.reason).toBe('QA appointment updated');
      });

    await request(app.getHttpServer())
      .patch(`/appointments/${appointment.body.id}/status`)
      .set(authHeaders(admin))
      .send({ status: 'CANCELLED' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('CANCELLED');
      });

    await request(app.getHttpServer())
      .delete(`/appointments/${appointment.body.id}`)
      .set(authHeaders(admin))
      .expect(200);
  });

  it('S1/S3 allows staff to list and update manual billing invoices', async () => {
    const invoices = await request(app.getHttpServer())
      .get('/billing/invoices')
      .set(authHeaders(staff))
      .expect(200);

    expect(Array.isArray(invoices.body)).toBe(true);
    expect(invoices.body.length).toBeGreaterThan(0);

    const invoiceId = invoices.body[0].id;
    await request(app.getHttpServer())
      .patch(`/billing/invoices/${invoiceId}`)
      .set(authHeaders(staff))
      .send({
        payment_status: 'PARTIAL',
        payment_method: 'SINPE_MOVIL',
        payment_reference: `QA-SINPE-${Date.now()}`,
        paid_amount: 1000,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.payment_status).toBe('PARTIAL');
        expect(body.payment_method).toBe('SINPE_MOVIL');
      });
  });

  it('D3/D4/D6 persists clinical records, odontogram entries, prescription and PDF generation', async () => {
    const [patients, doctors] = await Promise.all([
      request(app.getHttpServer()).get('/patients?limit=1').set(authHeaders(admin)).expect(200),
      request(app.getHttpServer())
        .get(`/booking/doctors?clinic_id=${admin.clinicId}`)
        .expect(200),
    ]);

    const patientId = patients.body.data[0].id;
    const doctorId = doctors.body.find(
      (item: { first_name: string }) => item.first_name === 'Carlos',
    ).id;

    const record = await request(app.getHttpServer())
      .post('/medical-records')
      .set(authHeaders(doctor))
      .send({
        patient_id: patientId,
        doctor_id: doctorId,
        diagnosis: 'QA diagnosis',
        treatment_plan: 'QA treatment plan',
        dentalRecords: [
          {
            tooth_number: 11,
            condition: 'CARIES',
            surface: 'O',
            estimated_budget: 25000,
          },
        ],
        prescription: {
          medications: [
            {
              name: 'Ibuprofeno',
              dosage: '400mg',
              frequency: 'Cada 8 horas',
            },
          ],
          additional_notes: 'Tomar con comida',
        },
      })
      .expect(201);

    expect(record.body.dentalRecords).toHaveLength(1);
    expect(record.body.prescriptions).toHaveLength(1);

    await request(app.getHttpServer())
      .get(`/medical-records/${record.body.id}`)
      .set(authHeaders(doctor))
      .expect(200)
      .expect(({ body }) => {
        expect(body.diagnosis).toBe('QA diagnosis');
        expect(body.dentalRecords[0].tooth_number).toBe(11);
        expect(body.prescriptions[0].medications[0].name).toBe('Ibuprofeno');
      });

    await request(app.getHttpServer())
      .get(`/medical-records/${record.body.id}/pdf`)
      .set(authHeaders(doctor))
      .expect(200)
      .expect('Content-Type', /application\/pdf/);
  });

  it('A5 blocks a doctor time range and removes the block', async () => {
    const doctors = await request(app.getHttpServer())
      .get(`/booking/doctors?clinic_id=${admin.clinicId}`)
      .expect(200);

    const doctorId = doctors.body.find(
      (item: { first_name: string }) => item.first_name === 'Carlos',
    ).id;

    const block = await request(app.getHttpServer())
      .post('/time-blocks')
      .set(authHeaders(admin))
      .send({
        doctor_id: doctorId,
        start_time: '2026-06-11T15:00:00.000Z',
        end_time: '2026-06-11T16:00:00.000Z',
        reason: 'QA bloqueado',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/time-blocks?startDate=2026-06-11&endDate=2026-06-11')
      .set(authHeaders(admin))
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { id: string }) => item.id === block.body.id)).toBe(true);
      });

    await request(app.getHttpServer())
      .delete(`/time-blocks/${block.body.id}`)
      .set(authHeaders(admin))
      .expect(200);
  });

  it('TZ1 keeps late-night Costa Rica appointments on the correct clinic date', async () => {
    const [patients, doctors] = await Promise.all([
      request(app.getHttpServer()).get('/patients?limit=1').set(authHeaders(admin)).expect(200),
      request(app.getHttpServer())
        .get(`/booking/doctors?clinic_id=${admin.clinicId}`)
        .expect(200),
    ]);

    const patientId = patients.body.data[0].id;
    const doctorId = doctors.body.find(
      (item: { first_name: string }) => item.first_name === 'Carlos',
    ).id;

    const appointment = await request(app.getHttpServer())
      .post('/appointments')
      .set(authHeaders(admin))
      .send({
        patient_id: patientId,
        doctor_id: doctorId,
        start_time: '2026-08-02T05:30:00.000Z',
        end_time: '2026-08-02T05:55:00.000Z',
        reason: 'QA timezone midnight',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/appointments?date=2026-08-01')
      .set(authHeaders(admin))
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { id: string }) => item.id === appointment.body.id)).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/appointments?date=2026-08-02')
      .set(authHeaders(admin))
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { id: string }) => item.id === appointment.body.id)).toBe(false);
      });

    await request(app.getHttpServer())
      .delete(`/appointments/${appointment.body.id}`)
      .set(authHeaders(admin))
      .expect(200);
  });

  it('TZ2 keeps late-night Costa Rica time blocks on the correct clinic date', async () => {
    const doctors = await request(app.getHttpServer())
      .get(`/booking/doctors?clinic_id=${admin.clinicId}`)
      .expect(200);

    const doctorId = doctors.body.find(
      (item: { first_name: string }) => item.first_name === 'Carlos',
    ).id;

    const block = await request(app.getHttpServer())
      .post('/time-blocks')
      .set(authHeaders(admin))
      .send({
        doctor_id: doctorId,
        start_time: '2026-08-03T05:30:00.000Z',
        end_time: '2026-08-03T05:55:00.000Z',
        reason: 'QA timezone block',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/time-blocks?startDate=2026-08-02&endDate=2026-08-02')
      .set(authHeaders(admin))
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { id: string }) => item.id === block.body.id)).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/time-blocks?startDate=2026-08-03&endDate=2026-08-03')
      .set(authHeaders(admin))
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { id: string }) => item.id === block.body.id)).toBe(false);
      });

    await request(app.getHttpServer())
      .delete(`/time-blocks/${block.body.id}`)
      .set(authHeaders(admin))
      .expect(200);
  });

  it('PT1 exposes the patient portal with seeded patient credentials', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/portal/login')
      .send({
        clinic_id: admin.clinicId,
        identification: '1-1000-0001',
        password: 'Paciente123',
      })
      .expect(200);

    expect(loginResponse.body.access_token).toBeTruthy();
    expect(loginResponse.body.patient.first_name).toBe('Maria');

    const portalAuth = {
      Authorization: `Bearer ${loginResponse.body.access_token}`,
    };

    await request(app.getHttpServer())
      .get('/portal/profile')
      .set(portalAuth)
      .expect(200)
      .expect(({ body }) => {
        expect(body.identification).toBe('1-1000-0001');
      });

    await request(app.getHttpServer())
      .get('/portal/appointments')
      .set(portalAuth)
      .expect(200)
      .expect(({ body }) => {
        expect(Array.isArray(body)).toBe(true);
      });
  });
});
