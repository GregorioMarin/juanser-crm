-- CreateEnum
CREATE TYPE "ArchivoClienteTipo" AS ENUM ('IMAGEN', 'VIDEO');

-- AlterTable
ALTER TABLE "FotoCliente"
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "tamanoBytes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tipoArchivo" "ArchivoClienteTipo" NOT NULL DEFAULT 'IMAGEN';

-- CreateIndex
CREATE INDEX "FotoCliente_tipoArchivo_idx" ON "FotoCliente"("tipoArchivo");
