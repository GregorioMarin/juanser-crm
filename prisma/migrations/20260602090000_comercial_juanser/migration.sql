-- AlterTable
ALTER TABLE "Cliente"
ADD COLUMN "presupuesto" DECIMAL(12, 2),
ADD COLUMN "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "fechaSeguimiento" TIMESTAMP(3);

-- Backfill existing records and align old CRM states with the commercial flow.
UPDATE "Cliente"
SET "fechaAlta" = "createdAt";

UPDATE "Cliente"
SET "estado" = CASE "estado"
    WHEN 'Contactado' THEN 'Visitado'
    WHEN 'En curso' THEN 'En fabricación'
    WHEN 'Finalizado' THEN 'Instalado'
    WHEN 'Archivado' THEN 'Perdido'
    ELSE "estado"
END;
