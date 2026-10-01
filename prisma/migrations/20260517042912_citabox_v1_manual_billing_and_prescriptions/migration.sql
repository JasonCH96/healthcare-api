-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('SINPE_MOVIL', 'TARJETA', 'EFECTIVO', 'TRANSFERENCIA');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "appointment_id" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paid_amount" DECIMAL(10,2),
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "payment_method" "PaymentMethod",
ADD COLUMN     "payment_reference" TEXT;

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "medical_record_id" TEXT NOT NULL,
    "medications" JSONB NOT NULL,
    "additional_notes" TEXT,
    "pdf_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
