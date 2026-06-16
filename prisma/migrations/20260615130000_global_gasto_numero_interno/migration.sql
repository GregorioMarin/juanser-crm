DROP INDEX IF EXISTS "DocumentoSecuencia_tipoDocumento_ano_key";
DROP INDEX IF EXISTS "DocumentoSecuencia_ano_idx";

ALTER TABLE "DocumentoSecuencia"
DROP COLUMN IF EXISTS "ano";

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "tipoDocumento"
      ORDER BY "ultimoNumero" DESC, "updatedAt" DESC, "id" DESC
    ) AS "rank"
  FROM "DocumentoSecuencia"
)
DELETE FROM "DocumentoSecuencia"
USING ranked
WHERE "DocumentoSecuencia"."id" = ranked."id"
  AND ranked."rank" > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentoSecuencia_tipoDocumento_key"
ON "DocumentoSecuencia"("tipoDocumento");

UPDATE "Gasto"
SET "numeroInterno" = CONCAT('__RENUMERANDO__', "id")
WHERE "tipoDocumento" IN ('ALBARAN', 'FACTURA', 'TICKET', 'OTRO');

WITH numbered AS (
  SELECT
    g."id",
    g."tipoDocumento",
    CASE g."tipoDocumento"
      WHEN 'ALBARAN' THEN 'ALB'
      WHEN 'FACTURA' THEN 'FAC'
      WHEN 'TICKET' THEN 'TCK'
      WHEN 'OTRO' THEN 'DOC'
    END AS "prefix",
    ROW_NUMBER() OVER (
      PARTITION BY g."tipoDocumento"
      ORDER BY g."createdAt" ASC, g."id" ASC
    ) AS "seq"
  FROM "Gasto" AS g
  WHERE g."tipoDocumento" IN ('ALBARAN', 'FACTURA', 'TICKET', 'OTRO')
)
UPDATE "Gasto" AS g
SET "numeroInterno" = CONCAT(numbered."prefix", '-', LPAD(numbered."seq"::TEXT, 4, '0'))
FROM numbered
WHERE g."id" = numbered."id";
WITH numbered AS (
  SELECT
    g."id",
    g."tipoDocumento",
    CASE g."tipoDocumento"
      WHEN 'ALBARAN' THEN 'ALB'
      WHEN 'FACTURA' THEN 'FAC'
      WHEN 'TICKET' THEN 'TCK'
      WHEN 'OTRO' THEN 'DOC'
    END AS "prefix",
    ROW_NUMBER() OVER (
      PARTITION BY g."tipoDocumento"
      ORDER BY g."createdAt" ASC, g."id" ASC
    ) AS "seq"
  FROM "Gasto" AS g
  WHERE g."tipoDocumento" IN ('ALBARAN', 'FACTURA', 'TICKET', 'OTRO')
)
INSERT INTO "DocumentoSecuencia" ("tipoDocumento", "ultimoNumero", "updatedAt")
SELECT "tipoDocumento", MAX("seq")::INTEGER, CURRENT_TIMESTAMP
FROM numbered
GROUP BY "tipoDocumento"
ON CONFLICT ("tipoDocumento")
DO UPDATE SET
  "ultimoNumero" = EXCLUDED."ultimoNumero",
  "updatedAt" = CURRENT_TIMESTAMP;
