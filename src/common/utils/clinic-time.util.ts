import { addHours, subDays } from 'date-fns';
import {
  formatInTimeZone,
  fromZonedTime,
} from 'date-fns-tz';

export const CLINIC_TZ = 'America/Costa_Rica';

export function getClinicDateKey(date: Date) {
  return formatInTimeZone(date, CLINIC_TZ, 'yyyy-MM-dd');
}

export function getClinicTimeKey(date: Date) {
  return formatInTimeZone(date, CLINIC_TZ, 'HH:mm');
}

export function getClinicDayBounds(date: string) {
  return {
    dayStart: fromZonedTime(`${date}T00:00:00`, CLINIC_TZ),
    dayEnd: fromZonedTime(`${date}T23:59:59.999`, CLINIC_TZ),
  };
}

export function getClinicNow(now = new Date()) {
  return now;
}

export function getClinicMinutes(date: Date) {
  const [hours, minutes] = getClinicTimeKey(date).split(':').map(Number);
  return hours * 60 + minutes;
}

export function getClinicUtcDateTime(date: string, time: string) {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return fromZonedTime(`${date}T${normalizedTime}`, CLINIC_TZ);
}

export function getReminderWindowUtc() {
  const now = new Date();
  const windowStartLocal = addHours(now, 24);
  const windowEndLocal = addHours(now, 25);

  return {
    start: windowStartLocal,
    end: windowEndLocal,
  };
}

export function getClinicMonthStartUtc() {
  const monthStartLocal = formatInTimeZone(new Date(), CLINIC_TZ, 'yyyy-MM-01');
  return fromZonedTime(`${monthStartLocal}T00:00:00`, CLINIC_TZ);
}

export function getClinicDaysAgoUtc(days: number) {
  const target = subDays(new Date(), days);
  const targetLocal = formatInTimeZone(target, CLINIC_TZ, "yyyy-MM-dd'T'HH:mm:ss");
  return fromZonedTime(targetLocal, CLINIC_TZ);
}
