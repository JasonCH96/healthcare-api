import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

type LoginContext = {
  token: string;
  clinicId: string;
};

async function loginAdmin(app: INestApplication): Promise<LoginContext> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'admin@clinica.cr', password: 'admin123' })
    .expect(200);

  const membership = response.body.memberships.find(
    (item: { clinic_slug: string }) => item.clinic_slug === 'clinica-demo',
  );

  return {
    token: response.body.access_token,
    clinicId: membership.clinic_id,
  };
}

function authHeaders(ctx: LoginContext) {
  return {
    Authorization: `Bearer ${ctx.token}`,
    'x-clinic-id': ctx.clinicId,
  };
}

describe('Public booking QA rules (e2e)', () => {
  let app: INestApplication;
  let admin: LoginContext;

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

    admin = await loginAdmin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('B1 filters services by selected doctor and shows all services for any doctor', async () => {
    const doctors = await request(app.getHttpServer())
      .get(`/booking/doctors?clinic_id=${admin.clinicId}`)
      .expect(200);

    const carlos = doctors.body.find(
      (doctor: { first_name: string }) => doctor.first_name === 'Carlos',
    );
    const laura = doctors.body.find(
      (doctor: { first_name: string }) => doctor.first_name === 'Laura',
    );
    expect(carlos).toBeTruthy();
    expect(laura).toBeTruthy();

    const serviceName = `QA Limpieza ${Date.now()}`;
    const service = await request(app.getHttpServer())
      .post('/services')
      .set(authHeaders(admin))
      .send({
        name: serviceName,
        description: 'Servicio QA de una hora',
        duration_minutes: 60,
        price: 25000,
        doctor_ids: [carlos.id],
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/booking/services?clinic_id=${admin.clinicId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { id: string }) => item.id === service.body.id)).toBe(true);
      });

    await request(app.getHttpServer())
      .get(`/booking/services?clinic_id=${admin.clinicId}&doctor_id=${carlos.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { id: string }) => item.id === service.body.id)).toBe(true);
      });

    await request(app.getHttpServer())
      .get(`/booking/services?clinic_id=${admin.clinicId}&doctor_id=${laura.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.some((item: { id: string }) => item.id === service.body.id)).toBe(false);
      });
  });

  it('B1 returns one-hour slot steps for a one-hour service and validates WhatsApp digits', async () => {
    const doctors = await request(app.getHttpServer())
      .get(`/booking/doctors?clinic_id=${admin.clinicId}`)
      .expect(200);
    const carlos = doctors.body.find(
      (doctor: { first_name: string }) => doctor.first_name === 'Carlos',
    );

    const service = await request(app.getHttpServer())
      .post('/services')
      .set(authHeaders(admin))
      .send({
        name: `QA Slots 60 ${Date.now()}`,
        description: 'Servicio QA para slots',
        duration_minutes: 60,
        price: 25000,
        doctor_ids: [carlos.id],
      })
      .expect(201);

    const slots = await request(app.getHttpServer())
      .get(
        `/booking/available-slots?clinic_id=${admin.clinicId}&doctor_id=${carlos.id}&service_id=${service.body.id}&date=2026-06-22`,
      )
      .expect(200);

    const availableTimes = slots.body.slots
      .filter((slot: { available: boolean }) => slot.available)
      .map((slot: { time: string }) => slot.time);

    expect(availableTimes.length).toBeGreaterThan(1);
    expect(minutesBetween(availableTimes[0], availableTimes[1])).toBe(60);

    await request(app.getHttpServer())
      .post('/booking/appointments')
      .send({
        clinic_id: admin.clinicId,
        service_id: service.body.id,
        doctor_id: carlos.id,
        date: '2026-06-22',
        time: availableTimes[0],
        first_name: 'QA',
        last_name: 'Booking',
        identification: `QA-BAD-${Date.now()}`,
        whatsapp_phone: 'abc888812345',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/booking/appointments')
      .send({
        clinic_id: admin.clinicId,
        service_id: service.body.id,
        doctor_id: carlos.id,
        date: '2026-06-22',
        time: availableTimes[0],
        first_name: 'QA',
        last_name: 'Booking',
        identification: `QA-GOOD-${Date.now()}`,
        whatsapp_phone: '88881234',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.id).toBeTruthy();
        expect(body.service.name).toBe(service.body.name);
      });
  });

  it('B1 rejects booking when doctor is not assigned to the selected service', async () => {
    const doctors = await request(app.getHttpServer())
      .get(`/booking/doctors?clinic_id=${admin.clinicId}`)
      .expect(200);
    const carlos = doctors.body.find(
      (doctor: { first_name: string }) => doctor.first_name === 'Carlos',
    );
    const laura = doctors.body.find(
      (doctor: { first_name: string }) => doctor.first_name === 'Laura',
    );

    const service = await request(app.getHttpServer())
      .post('/services')
      .set(authHeaders(admin))
      .send({
        name: `QA Doctor Service Guard ${Date.now()}`,
        description: 'Servicio asignado solo a Carlos',
        duration_minutes: 60,
        price: 25000,
        doctor_ids: [carlos.id],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/booking/appointments')
      .send({
        clinic_id: admin.clinicId,
        service_id: service.body.id,
        doctor_id: laura.id,
        date: '2026-06-23',
        time: '08:00',
        first_name: 'QA',
        last_name: 'Wrong Doctor',
        identification: `QA-WRONG-${Date.now()}`,
        whatsapp_phone: '88881234',
      })
      .expect(400);
  });

});

function minutesBetween(start: string, end: string) {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}
