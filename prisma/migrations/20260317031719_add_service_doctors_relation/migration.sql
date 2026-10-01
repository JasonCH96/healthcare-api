-- CreateTable
CREATE TABLE "service_doctors" (
    "service_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,

    CONSTRAINT "service_doctors_pkey" PRIMARY KEY ("service_id","doctor_id")
);

-- AddForeignKey
ALTER TABLE "service_doctors" ADD CONSTRAINT "service_doctors_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_doctors" ADD CONSTRAINT "service_doctors_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
