CREATE TABLE "GastoArchivo" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GastoArchivo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GastoArchivo_gastoId_orden_key" ON "GastoArchivo"("gastoId", "orden");
CREATE INDEX "GastoArchivo_gastoId_idx" ON "GastoArchivo"("gastoId");

ALTER TABLE "GastoArchivo"
ADD CONSTRAINT "GastoArchivo_gastoId_fkey"
FOREIGN KEY ("gastoId") REFERENCES "Gasto"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
