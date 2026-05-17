export const CLINIC_TYPES = [
  'GENERAL_MEDICINE',
  'DENTAL',
  'GYNECOLOGY',
  'PEDIATRICS',
  'DERMATOLOGY',
  'PSYCHOLOGY',
  'PHYSIOTHERAPY',
  'OTHER',
] as const;

export type ClinicType = (typeof CLINIC_TYPES)[number];

export const SPECIALTY_MODULES = [
  'GENERAL_MEDICINE',
  'DENTAL',
  'GYNECOLOGY',
  'PRESCRIPTIONS',
] as const;

export type SpecialtyModule = (typeof SPECIALTY_MODULES)[number];
