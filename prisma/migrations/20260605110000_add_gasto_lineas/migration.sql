-- CreateTable
CREATE TABLE "GastoLinea" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(10,2),
    "precioUnitario" DECIMAL(10,2),
    "importe" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GastoLinea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GastoLinea_gastoId_idx" ON "GastoLinea"("gastoId");

-- CreateIndex
CREATE INDEX "GastoLinea_descripcion_idx" ON "GastoLinea"("descripcion");

-- AddForeignKey
ALTER TABLE "GastoLinea" ADD CONSTRAINT "GastoLinea_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "Gasto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
