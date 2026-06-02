-- CreateEnum
CREATE TYPE "ActividadClienteTipo" AS ENUM (
    'CLIENTE_CREADO',
    'ESTADO_CAMBIADO',
    'PRESUPUESTO_CREADO',
    'PRESUPUESTO_ELIMINADO',
    'SEGUIMIENTO_CREADO',
    'IMAGEN_CLIENTE_SUBIDA',
    'IMAGEN_JUANSER_SUBIDA'
);

-- CreateTable
CREATE TABLE "ActividadCliente" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "ActividadClienteTipo" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "usuario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActividadCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActividadCliente_clienteId_idx" ON "ActividadCliente"("clienteId");

-- CreateIndex
CREATE INDEX "ActividadCliente_fecha_idx" ON "ActividadCliente"("fecha");

-- CreateIndex
CREATE INDEX "ActividadCliente_tipo_idx" ON "ActividadCliente"("tipo");

-- AddForeignKey
ALTER TABLE "ActividadCliente"
ADD CONSTRAINT "ActividadCliente_clienteId_fkey"
FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
