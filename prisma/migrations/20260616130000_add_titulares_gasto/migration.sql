CREATE TABLE "TitularGasto" (
    "id" SERIAL NOT NULL,
    "codigoInterno" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nif" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TitularGasto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TitularGasto_codigoInterno_key"
ON "TitularGasto"("codigoInterno");

CREATE INDEX "TitularGasto_nombre_idx"
ON "TitularGasto"("nombre");

CREATE INDEX "TitularGasto_activo_idx"
ON "TitularGasto"("activo");

INSERT INTO "TitularGasto" ("codigoInterno", "nombre", "activo")
VALUES
  ('JUANMA', 'Juanma', true),
  ('SERGIO', 'Sergio', true)
ON CONFLICT ("codigoInterno") DO NOTHING;

ALTER TABLE "Gasto"
ADD COLUMN "titularGastoId" INTEGER;

ALTER TABLE "Gasto"
ADD CONSTRAINT "Gasto_titularGastoId_fkey"
FOREIGN KEY ("titularGastoId") REFERENCES "TitularGasto"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Gasto_titularGastoId_idx"
ON "Gasto"("titularGastoId");

DROP INDEX IF EXISTS "Gasto_clienteId_idx";

ALTER TABLE "Gasto"
DROP CONSTRAINT IF EXISTS "Gasto_clienteId_fkey";

ALTER TABLE "Gasto"
DROP COLUMN IF EXISTS "clienteId";
