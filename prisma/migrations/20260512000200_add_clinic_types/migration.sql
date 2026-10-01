ALTER TABLE "clinics"
ADD COLUMN "clinic_type" TEXT NOT NULL DEFAULT 'GENERAL_MEDICINE',
ADD COLUMN "specialty_modules" TEXT[] NOT NULL DEFAULT ARRAY['GENERAL_MEDICINE']::TEXT[];

UPDATE "clinics"
SET
  "clinic_type" = CASE
    WHEN lower("name") LIKE '%dental%' OR lower("name") LIKE '%odont%' THEN 'DENTAL'
    ELSE "clinic_type"
  END,
  "specialty_modules" = CASE
    WHEN lower("name") LIKE '%dental%' OR lower("name") LIKE '%odont%' THEN ARRAY['GENERAL_MEDICINE', 'DENTAL']::TEXT[]
    ELSE "specialty_modules"
  END;
