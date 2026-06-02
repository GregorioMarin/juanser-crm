-- CreateEnum
CREATE TYPE "TrabajoMediaTipo" AS ENUM ('IMAGEN', 'VIDEO');

-- CreateEnum
CREATE TYPE "TrabajoMediaCategoria" AS ENUM ('ANTES', 'DESPUES', 'VIDEO');

-- CreateTable
CREATE TABLE "TrabajoTerminado" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "clienteNombre" TEXT,
    "localidad" TEXT NOT NULL,
    "tipoTrabajo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "importe" DECIMAL(12,2) NOT NULL,
    "fechaTrabajo" TIMESTAMP(3) NOT NULL,
    "destacadoWeb" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrabajoTerminado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrabajoTerminadoMedia" (
    "id" SERIAL NOT NULL,
    "trabajoId" INTEGER NOT NULL,
    "tipoArchivo" "TrabajoMediaTipo" NOT NULL,
    "categoria" "TrabajoMediaCategoria" NOT NULL DEFAULT 'DESPUES',
    "url" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "descripcion" TEXT,
    "mimeType" TEXT,
    "tamanoBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrabajoTerminadoMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrabajoTerminado_localidad_idx" ON "TrabajoTerminado"("localidad");

-- CreateIndex
CREATE INDEX "TrabajoTerminado_tipoTrabajo_idx" ON "TrabajoTerminado"("tipoTrabajo");

-- CreateIndex
CREATE INDEX "TrabajoTerminado_fechaTrabajo_idx" ON "TrabajoTerminado"("fechaTrabajo");

-- CreateIndex
CREATE INDEX "TrabajoTerminado_destacadoWeb_idx" ON "TrabajoTerminado"("destacadoWeb");

-- CreateIndex
CREATE INDEX "TrabajoTerminadoMedia_trabajoId_idx" ON "TrabajoTerminadoMedia"("trabajoId");

-- CreateIndex
CREATE INDEX "TrabajoTerminadoMedia_tipoArchivo_idx" ON "TrabajoTerminadoMedia"("tipoArchivo");

-- CreateIndex
CREATE INDEX "TrabajoTerminadoMedia_categoria_idx" ON "TrabajoTerminadoMedia"("categoria");

-- AddForeignKey
ALTER TABLE "TrabajoTerminadoMedia" ADD CONSTRAINT "TrabajoTerminadoMedia_trabajoId_fkey" FOREIGN KEY ("trabajoId") REFERENCES "TrabajoTerminado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
