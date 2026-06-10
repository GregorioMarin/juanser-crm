-- Add commercial and production status values used by the application.
-- The status columns are TEXT, so this migration updates the database default
-- and normalizes existing non-accepted clients to the non-production state.

ALTER TABLE "Cliente"
ALTER COLUMN "estadoProduccion" SET DEFAULT 'NO_APLICA';

UPDATE "Cliente"
SET "estadoProduccion" = 'NO_APLICA'
WHERE "estado" <> 'ACEPTADO';
