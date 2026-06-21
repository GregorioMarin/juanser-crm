-- CreateEnum
CREATE TYPE "FrecuenciaVencimiento" AS ENUM ('SEMANAL', 'MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "EstadoVencimiento" AS ENUM ('PENDIENTE', 'PAGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "OrigenVencimiento" AS ENUM ('MANUAL', 'RECURRENTE');

-- CreateTable
CREATE TABLE "VencimientoRecurrente" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL,
    "proveedor" TEXT,
    "titularGastoId" INTEGER,
    "importeEstimado" DECIMAL(12,2) NOT NULL,
    "frecuencia" "FrecuenciaVencimiento" NOT NULL,
    "intervalo" INTEGER NOT NULL DEFAULT 1,
    "diaMes" INTEGER,
    "mesAplicable" INTEGER,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoGeneradoHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VencimientoRecurrente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vencimiento" (
    "id" TEXT NOT NULL,
    "recurrenteId" TEXT,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL,
    "proveedor" TEXT,
    "titularGastoId" INTEGER,
    "importe" DECIMAL(12,2) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoVencimiento" NOT NULL DEFAULT 'PENDIENTE',
    "origen" "OrigenVencimiento" NOT NULL DEFAULT 'MANUAL',
    "fechaPago" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vencimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VencimientoRecurrente_activo_idx" ON "VencimientoRecurrente"("activo");
CREATE INDEX "VencimientoRecurrente_fechaInicio_idx" ON "VencimientoRecurrente"("fechaInicio");
CREATE INDEX "VencimientoRecurrente_fechaFin_idx" ON "VencimientoRecurrente"("fechaFin");
CREATE INDEX "VencimientoRecurrente_categoria_idx" ON "VencimientoRecurrente"("categoria");
CREATE INDEX "VencimientoRecurrente_titularGastoId_idx" ON "VencimientoRecurrente"("titularGastoId");
CREATE UNIQUE INDEX "Vencimiento_recurrenteId_fechaVencimiento_key" ON "Vencimiento"("recurrenteId", "fechaVencimiento");
CREATE INDEX "Vencimiento_fechaVencimiento_idx" ON "Vencimiento"("fechaVencimiento");
CREATE INDEX "Vencimiento_estado_idx" ON "Vencimiento"("estado");
CREATE INDEX "Vencimiento_origen_idx" ON "Vencimiento"("origen");
CREATE INDEX "Vencimiento_categoria_idx" ON "Vencimiento"("categoria");
CREATE INDEX "Vencimiento_titularGastoId_idx" ON "Vencimiento"("titularGastoId");

-- AddForeignKey
ALTER TABLE "VencimientoRecurrente" ADD CONSTRAINT "VencimientoRecurrente_titularGastoId_fkey" FOREIGN KEY ("titularGastoId") REFERENCES "TitularGasto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vencimiento" ADD CONSTRAINT "Vencimiento_recurrenteId_fkey" FOREIGN KEY ("recurrenteId") REFERENCES "VencimientoRecurrente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vencimiento" ADD CONSTRAINT "Vencimiento_titularGastoId_fkey" FOREIGN KEY ("titularGastoId") REFERENCES "TitularGasto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
