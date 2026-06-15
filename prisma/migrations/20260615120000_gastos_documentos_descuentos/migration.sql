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

CREATE UNIQUE INDEX "Gasto_numeroInterno_key" ON "Gasto"("numeroInterno");
CREATE INDEX "Gasto_numeroInterno_idx" ON "Gasto"("numeroInterno");
CREATE UNIQUE INDEX "DocumentoSecuencia_tipoDocumento_ano_key" ON "DocumentoSecuencia"("tipoDocumento", "ano");
CREATE INDEX "DocumentoSecuencia_tipoDocumento_idx" ON "DocumentoSecuencia"("tipoDocumento");
CREATE INDEX "DocumentoSecuencia_ano_idx" ON "DocumentoSecuencia"("ano");
