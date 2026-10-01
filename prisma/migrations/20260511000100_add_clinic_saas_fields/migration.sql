ALTER TABLE "clinics"
ADD COLUMN "slug" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Costa_Rica',
ADD COLUMN "public_phone" TEXT,
ADD COLUMN "public_email" TEXT,
ADD COLUMN "theme_color" TEXT,
ADD COLUMN "booking_enabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "clinics"
SET "slug" = lower(
  regexp_replace(
    regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'),
    '(^-|-$)',
    '',
    'g'
  )
) || '-' || substring("id" from 1 for 8)
WHERE "slug" IS NULL;

ALTER TABLE "clinics" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "clinics_slug_key" ON "clinics"("slug");
