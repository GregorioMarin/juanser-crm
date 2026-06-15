WITH missing AS (
  SELECT
    g."id",
    g."tipoDocumento",
    EXTRACT(YEAR FROM COALESCE(g."fecha", g."createdAt"))::INTEGER AS "ano",
    CASE g."tipoDocumento"
      WHEN 'ALBARAN' THEN 'ALB'
      WHEN 'FACTURA' THEN 'FAC'
      WHEN 'TICKET' THEN 'TCK'
      WHEN 'OTRO' THEN 'DOC'
    END AS "prefix",
    ROW_NUMBER() OVER (
      PARTITION BY g."tipoDocumento", EXTRACT(YEAR FROM COALESCE(g."fecha", g."createdAt"))::INTEGER
      ORDER BY COALESCE(g."fecha", g."createdAt"), g."createdAt", g."id"
    ) AS "offsetNumber"
  FROM "Gasto" AS g
  WHERE g."numeroInterno" IS NULL
    AND g."tipoDocumento" IN ('ALBARAN', 'FACTURA', 'TICKET', 'OTRO')
),
existing_max AS (
  SELECT
    g."tipoDocumento",
    EXTRACT(YEAR FROM COALESCE(g."fecha", g."createdAt"))::INTEGER AS "ano",
    COALESCE(
      MAX(NULLIF(SPLIT_PART(g."numeroInterno", '-', 3), '')::INTEGER),
      0
    ) AS "lastNumber"
  FROM "Gasto" AS g
  WHERE g."numeroInterno" IS NOT NULL
    AND g."tipoDocumento" IN ('ALBARAN', 'FACTURA', 'TICKET', 'OTRO')
    AND g."numeroInterno" ~ '^[A-Z]+-[0-9]{4}-[0-9]+$'
  GROUP BY g."tipoDocumento", EXTRACT(YEAR FROM COALESCE(g."fecha", g."createdAt"))::INTEGER
),
numbered AS (
  SELECT
    missing."id",
    missing."tipoDocumento",
    missing."ano",
    missing."prefix",
    missing."offsetNumber" + COALESCE(existing_max."lastNumber", 0) AS "seq"
  FROM missing
  LEFT JOIN existing_max
    ON existing_max."tipoDocumento" = missing."tipoDocumento"
   AND existing_max."ano" = missing."ano"
)
UPDATE "Gasto" AS g
SET "numeroInterno" = CONCAT(numbered."prefix", '-', numbered."ano", '-', LPAD(numbered."seq"::TEXT, 4, '0'))
FROM numbered
WHERE g."id" = numbered."id";

INSERT INTO "DocumentoSecuencia" ("tipoDocumento", "ano", "ultimoNumero", "updatedAt")
SELECT
  g."tipoDocumento",
  EXTRACT(YEAR FROM COALESCE(g."fecha", g."createdAt"))::INTEGER AS "ano",
  MAX(NULLIF(SPLIT_PART(g."numeroInterno", '-', 3), '')::INTEGER) AS "ultimoNumero",
  CURRENT_TIMESTAMP
FROM "Gasto" AS g
WHERE g."numeroInterno" IS NOT NULL
  AND g."tipoDocumento" IN ('ALBARAN', 'FACTURA', 'TICKET', 'OTRO')
  AND g."numeroInterno" ~ '^[A-Z]+-[0-9]{4}-[0-9]+$'
GROUP BY g."tipoDocumento", EXTRACT(YEAR FROM COALESCE(g."fecha", g."createdAt"))::INTEGER
ON CONFLICT ("tipoDocumento", "ano")
DO UPDATE SET
  "ultimoNumero" = GREATEST("DocumentoSecuencia"."ultimoNumero", EXCLUDED."ultimoNumero"),
  "updatedAt" = CURRENT_TIMESTAMP;
