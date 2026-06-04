UPDATE "Cliente"
SET "localidad" = "zona"
WHERE "zona" IS NOT NULL AND btrim("zona") <> '';

ALTER TABLE "Cliente"
DROP COLUMN "zona";
