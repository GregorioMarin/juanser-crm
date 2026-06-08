-- CreateEnum
CREATE TYPE "EstadoCobroFacturaVenta" AS ENUM ('PENDIENTE', 'PARCIAL', 'COBRADA');

-- AlterEnum
ALTER TYPE "PresupuestoEstado" ADD VALUE IF NOT EXISTS 'INSTALADO';

-- CreateTable
CREATE TABLE "FacturaVenta" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "presupuestoId" INTEGER,
    "numeroFactura" TEXT NOT NULL,
    "fechaFactura" TIMESTAMP(3) NOT NULL,
    "baseImponible" DECIMAL(12,2) NOT NULL,
    "iva" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "estadoCobro" "EstadoCobroFacturaVenta" NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "archivoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacturaVenta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacturaVenta_clienteId_idx" ON "FacturaVenta"("clienteId");

-- CreateIndex
CREATE INDEX "FacturaVenta_presupuestoId_idx" ON "FacturaVenta"("presupuestoId");

-- CreateIndex
CREATE INDEX "FacturaVenta_numeroFactura_idx" ON "FacturaVenta"("numeroFactura");

-- CreateIndex
CREATE INDEX "FacturaVenta_fechaFactura_idx" ON "FacturaVenta"("fechaFactura");

-- CreateIndex
CREATE INDEX "FacturaVenta_estadoCobro_idx" ON "FacturaVenta"("estadoCobro");

-- AddForeignKey
ALTER TABLE "FacturaVenta" ADD CONSTRAINT "FacturaVenta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaVenta" ADD CONSTRAINT "FacturaVenta_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
