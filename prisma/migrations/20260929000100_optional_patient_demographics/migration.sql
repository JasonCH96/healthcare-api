-- Public booking only knows contact and appointment details. Clinical demographics
-- can be completed by staff later without inserting invented patient data.
ALTER TABLE "patients" ALTER COLUMN "birth_date" DROP NOT NULL;
ALTER TABLE "patients" ALTER COLUMN "gender" DROP NOT NULL;
