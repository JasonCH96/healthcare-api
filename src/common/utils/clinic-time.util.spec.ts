import {
  getClinicDateKey,
  getClinicDaysAgoUtc,
  getClinicDayBounds,
  getClinicMonthStartUtc,
  getClinicUtcDateTime,
  getReminderWindowUtc,
} from './clinic-time.util.js';

describe('clinic-time util', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds Costa Rica day bounds in UTC', () => {
    const { dayStart, dayEnd } = getClinicDayBounds('2026-05-17');

    expect(dayStart.toISOString()).toBe('2026-05-17T06:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-05-18T05:59:59.999Z');
  });

  it('converts Costa Rica local slot time to UTC', () => {
    const slot = getClinicUtcDateTime('2026-05-17', '08:30');

    expect(slot.toISOString()).toBe('2026-05-17T14:30:00.000Z');
  });

  it('derives the clinic date key from a UTC instant', () => {
    const key = getClinicDateKey(new Date('2026-05-18T05:30:00.000Z'));

    expect(key).toBe('2026-05-17');
  });

  it('builds a 24h reminder window in Costa Rica time', () => {
    jest.setSystemTime(new Date('2026-05-17T15:10:00.000Z'));

    const { start, end } = getReminderWindowUtc();

    expect(start.toISOString()).toBe('2026-05-18T15:10:00.000Z');
    expect(end.toISOString()).toBe('2026-05-18T16:10:00.000Z');
  });

  it('uses Costa Rica month boundaries even when UTC is still the previous month locally', () => {
    jest.setSystemTime(new Date('2026-06-01T05:30:00.000Z'));

    expect(getClinicDateKey(new Date())).toBe('2026-05-31');
    expect(getClinicMonthStartUtc().toISOString()).toBe('2026-05-01T06:00:00.000Z');
  });

  it('subtracts clinic days from the Costa Rica local date/time', () => {
    jest.setSystemTime(new Date('2026-06-01T05:30:00.000Z'));

    expect(getClinicDaysAgoUtc(1).toISOString()).toBe('2026-05-31T05:30:00.000Z');
  });
});
