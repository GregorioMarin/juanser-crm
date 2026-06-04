-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('Transferencia', 'Efectivo', 'Tarjeta', 'Bizum', 'Otro');

-- AlterEnum
ALTER TYPE "ActividadClienteTipo" ADD VALUE 'PAGO_CUENTA_REGISTRADO';
ALTER TYPE "ActividadClienteTipo" ADD VALUE 'PAGO_CUENTA_ELIMINADO';

-- CreateTable
CREATE TABLE "PagoCuenta" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "presupuestoId" INTEGER,
    "concepto" TEXT NOT NULL,
    "importe" DECIMAL(12,2) NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "referencia" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagoCuenta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PagoCuenta_clienteId_idx" ON "PagoCuenta"("clienteId");

-- CreateIndex
CREATE INDEX "PagoCuenta_presupuestoId_idx" ON "PagoCuenta"("presupuestoId");

-- CreateIndex
CREATE INDEX "PagoCuenta_fechaPago_idx" ON "PagoCuenta"("fechaPago");

-- AddForeignKey
ALTER TABLE "PagoCuenta" ADD CONSTRAINT "PagoCuenta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoCuenta" ADD CONSTRAINT "PagoCuenta_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
