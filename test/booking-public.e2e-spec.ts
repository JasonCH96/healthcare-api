import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  getClinicDateKey,
  getClinicUtcDateTime,
} from '../src/common/utils/clinic-time.util';

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

async function findAvailableDateForTime(
  app: INestApplication,
  clinicId: string,
  doctorId: string,
  serviceId: string,
  time: string,
  startOffsetDays: number,
): Promise<string> {
  for (let offset = startOffsetDays; offset < startOffsetDays + 90; offset++) {
    const date = getClinicDateKey(new Date(Date.now() + offset * 86_400_000));
    const response = await request(app.getHttpServer())
      .get(
        `/booking/available-slots?clinic_id=${clinicId}&doctor_id=${doctorId}&service_id=${serviceId}&date=${date}`,
      )
      .expect(200);
    if (
      response.body.slots.some(
        (slot: { time: string; available: boolean }) =>
          slot.time === time && slot.available,
      )
    ) {
      return date;
    }
  }
  throw new Error(`No available ${time} slot found for the booking test`);
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
        expect(
          body.some((item: { id: string }) => item.id === service.body.id),
        ).toBe(true);
      });

    await request(app.getHttpServer())
      .get(
        `/booking/services?clinic_id=${admin.clinicId}&doctor_id=${carlos.id}`,
      )
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.some((item: { id: string }) => item.id === service.body.id),
        ).toBe(true);
      });

    await request(app.getHttpServer())
      .get(
        `/booking/services?clinic_id=${admin.clinicId}&doctor_id=${laura.id}`,
      )
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.some((item: { id: string }) => item.id === service.body.id),
        ).toBe(false);
      });
  });

  it('B1 returns one-hour slot steps for a one-hour service and validates WhatsApp digits', async () => {
    const date = getClinicDateKey(new Date(Date.now() + 14 * 86_400_000));
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
        `/booking/available-slots?clinic_id=${admin.clinicId}&doctor_id=${carlos.id}&service_id=${service.body.id}&date=${date}`,
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
        date,
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
        date,
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
    const date = getClinicDateKey(new Date(Date.now() + 15 * 86_400_000));
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
        date,
        time: '08:00',
        first_name: 'QA',
        last_name: 'Wrong Doctor',
        identification: `QA-WRONG-${Date.now()}`,
        whatsapp_phone: '88881234',
      })
      .expect(400);
  });

  it('rejects blocked, closed and past slots even when posted directly', async () => {
    const pastDate = getClinicDateKey(new Date(Date.now() - 2 * 86_400_000));
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
        name: `QA Protected Slots ${Date.now()}`,
        duration_minutes: 60,
        price: 25000,
        doctor_ids: [carlos.id],
      })
      .expect(201);

    const date = await findAvailableDateForTime(
      app,
      admin.clinicId,
      carlos.id,
      service.body.id,
      '08:00',
      20,
    );

    await request(app.getHttpServer())
      .post('/time-blocks')
      .set(authHeaders(admin))
      .send({
        doctor_id: carlos.id,
        start_time: getClinicUtcDateTime(date, '08:00').toISOString(),
        end_time: getClinicUtcDateTime(date, '09:00').toISOString(),
      })
      .expect(201);

    const payload = {
      clinic_id: admin.clinicId,
      service_id: service.body.id,
      doctor_id: carlos.id,
      first_name: 'QA',
      last_name: 'Protected',
      identification: `QA-PROTECTED-${Date.now()}`,
      whatsapp_phone: '88881234',
    };
    for (const [requestedDate, time] of [
      [date, '08:00'],
      [date, '07:00'],
      [pastDate, '10:00'],
    ]) {
      await request(app.getHttpServer())
        .post('/booking/appointments')
        .send({ ...payload, date: requestedDate, time })
        .expect(400);
    }
  });

  it('accepts only one simultaneous booking and does not invent demographics', async () => {
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
        name: `QA Concurrent Slot ${Date.now()}`,
        duration_minutes: 60,
        price: 25000,
        doctor_ids: [carlos.id],
      })
      .expect(201);
    const date = await findAvailableDateForTime(
      app,
      admin.clinicId,
      carlos.id,
      service.body.id,
      '10:00',
      25,
    );
    const identification = `QA-CONCURRENT-${Date.now()}`;
    const payload = {
      clinic_id: admin.clinicId,
      service_id: service.body.id,
      doctor_id: carlos.id,
      date,
      time: '10:00',
      first_name: 'QA',
      last_name: 'Concurrent',
      whatsapp_phone: '88881234',
    };
    const responses = await Promise.all([
      request(app.getHttpServer())
        .post('/booking/appointments')
        .send({ ...payload, identification }),
      request(app.getHttpServer())
        .post('/booking/appointments')
        .send({ ...payload, identification: `${identification}-2` }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 400,
    ]);

    const patients = await request(app.getHttpServer())
      .get(`/patients?search=${identification}`)
      .set(authHeaders(admin))
      .expect(200);
    expect(patients.body.data).toHaveLength(1);
    expect(patients.body.data[0].birth_date).toBeNull();
    expect(patients.body.data[0].gender).toBeNull();
  });
});

function minutesBetween(start: string, end: string) {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}
