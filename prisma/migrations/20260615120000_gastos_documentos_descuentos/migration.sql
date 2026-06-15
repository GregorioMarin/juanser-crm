ALTER TABLE "Gasto"
ADD COLUMN "numeroInterno" TEXT;

UPDATE "Gasto"
SET "tipoDocumento" = CASE
  WHEN lower("tipoDocumento") IN ('albaran', 'albarán') THEN 'ALBARAN'
  WHEN lower("tipoDocumento") = 'factura' THEN 'FACTURA'
  WHEN lower("tipoDocumento") = 'ticket' THEN 'TICKET'
  WHEN "tipoDocumento" IS NULL OR btrim("tipoDocumento") = '' THEN NULL
  ELSE 'OTRO'
END
WHERE "tipoDocumento" IS NOT NULL;

ALTER TABLE "GastoLinea"
ADD COLUMN "descuentoPorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0;

CREATE TABLE "DocumentoSecuencia" (
  "id" SERIAL NOT NULL,
  "tipoDocumento" TEXT NOT NULL,
  "ano" INTEGER NOT NULL,
  "ultimoNumero" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentoSecuencia_pkey" PRIMARY KEY ("id")
);

WITH numbered AS (
  SELECT
    "id",
    "tipoDocumento",
    EXTRACT(YEAR FROM COALESCE("fecha", "createdAt"))::INTEGER AS "ano",
    CASE "tipoDocumento"
      WHEN 'ALBARAN' THEN 'ALB'
      WHEN 'FACTURA' THEN 'FAC'
      WHEN 'TICKET' THEN 'TCK'
      WHEN 'OTRO' THEN 'DOC'
    END AS "prefix",
    ROW_NUMBER() OVER (
      PARTITION BY "tipoDocumento", EXTRACT(YEAR FROM COALESCE("fecha", "createdAt"))::INTEGER
      ORDER BY COALESCE("fecha", "createdAt"), "createdAt", "id"
    ) AS "seq"
  FROM "Gasto"
  WHERE "numeroInterno" IS NULL
    AND "tipoDocumento" IN ('ALBARAN', 'FACTURA', 'TICKET', 'OTRO')
)
UPDATE "Gasto" AS g
SET "numeroInterno" = CONCAT(numbered."prefix", '-', numbered."ano", '-', LPAD(numbered."seq"::TEXT, 4, '0'))
FROM numbered
WHERE g."id" = numbered."id";

INSERT INTO "DocumentoSecuencia" ("tipoDocumento", "ano", "ultimoNumero", "updatedAt")
SELECT "tipoDocumento", "ano", MAX("seq")::INTEGER, CURRENT_TIMESTAMP
FROM (
  SELECT
    "tipoDocumento",
    EXTRACT(YEAR FROM COALESCE("fecha", "createdAt"))::INTEGER AS "ano",
    ROW_NUMBER() OVER (
      PARTITION BY "tipoDocumento", EXTRACT(YEAR FROM COALESCE("fecha", "createdAt"))::INTEGER
      ORDER BY COALESCE("fecha", "createdAt"), "createdAt", "id"
    ) AS "seq"
  FROM "Gasto"
  WHERE "tipoDocumento" IN ('ALBARAN', 'FACTURA', 'TICKET', 'OTRO')
) AS numbered
GROUP BY "tipoDocumento", "ano";

CREATE UNIQUE INDEX "Gasto_numeroInterno_key" ON "Gasto"("numeroInterno");
CREATE INDEX "Gasto_numeroInterno_idx" ON "Gasto"("numeroInterno");
CREATE UNIQUE INDEX "DocumentoSecuencia_tipoDocumento_ano_key" ON "DocumentoSecuencia"("tipoDocumento", "ano");
CREATE INDEX "DocumentoSecuencia_tipoDocumento_idx" ON "DocumentoSecuencia"("tipoDocumento");
CREATE INDEX "DocumentoSecuencia_ano_idx" ON "DocumentoSecuencia"("ano");
