-- CreateEnum
CREATE TYPE "CitaOrigen" AS ENUM ('AMELIA', 'MANUAL');

-- CreateEnum
CREATE TYPE "CitaEstado" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'REALIZADA');

-- CreateTable
CREATE TABLE "Cita" (
    "id" SERIAL NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "origen" "CitaOrigen" NOT NULL DEFAULT 'MANUAL',
    "estado" "CitaEstado" NOT NULL DEFAULT 'PENDIENTE',
    "nota" TEXT,
    "ameliaBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cita_ameliaBookingId_key" ON "Cita"("ameliaBookingId");

-- CreateIndex
CREATE INDEX "Cita_fechaHora_idx" ON "Cita"("fechaHora");

-- CreateIndex
CREATE INDEX "Cita_estado_idx" ON "Cita"("estado");

-- CreateIndex
CREATE INDEX "Cita_origen_idx" ON "Cita"("origen");
