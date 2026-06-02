-- AlterTable
ALTER TABLE "Cliente"
ADD COLUMN "motivoRechazo" TEXT,
ADD COLUMN "fechaMedicion" TIMESTAMP(3),
ADD COLUMN "fechaInstalacion" TIMESTAMP(3),
ADD COLUMN "importeAceptado" DECIMAL(12, 2),
ADD COLUMN "zona" TEXT;
