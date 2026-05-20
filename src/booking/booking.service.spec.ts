import { BookingService } from './booking.service.js';

describe('BookingService timezone rules', () => {
  let service: BookingService;

  beforeEach(() => {
    service = new BookingService({} as never);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('filters same-day past slots using America/Costa_Rica time', () => {
    jest.setSystemTime(new Date('2026-08-04T15:15:00.000Z')); // 09:15 in Costa Rica

    const slots = [
      { time: '08:00', available: true, doctor_id: 'doctor-1' },
      { time: '09:00', available: true, doctor_id: 'doctor-1' },
      { time: '10:00', available: true, doctor_id: 'doctor-1' },
    ];

    const filtered = (service as any).filterPastSlots('2026-08-04', slots);

    expect(filtered).toEqual([
      { time: '08:00', available: false, doctor_id: null },
      { time: '09:00', available: false, doctor_id: null },
      { time: '10:00', available: true, doctor_id: 'doctor-1' },
    ]);
  });

  it('does not filter future clinic-day slots even if UTC date differs', () => {
    jest.setSystemTime(new Date('2026-08-04T05:30:00.000Z')); // 23:30 on Aug 3 in Costa Rica

    const slots = [{ time: '08:00', available: true, doctor_id: 'doctor-1' }];
    const filtered = (service as any).filterPastSlots('2026-08-04', slots);

    expect(filtered).toEqual(slots);
  });
});
