-- CreateEnum
CREATE TYPE "PresupuestoEstado" AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "Presupuesto" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "importe" DECIMAL(12, 2) NOT NULL,
    "estado" "PresupuestoEstado" NOT NULL DEFAULT 'PENDIENTE',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Presupuesto_clienteId_idx" ON "Presupuesto"("clienteId");

-- CreateIndex
CREATE INDEX "Presupuesto_estado_idx" ON "Presupuesto"("estado");

-- AddForeignKey
ALTER TABLE "Presupuesto"
ADD CONSTRAINT "Presupuesto_clienteId_fkey"
FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
