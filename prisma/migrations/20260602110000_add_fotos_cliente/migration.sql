-- CreateEnum
CREATE TYPE "FotoTipo" AS ENUM ('CLIENTE', 'JUANSER');

-- CreateTable
CREATE TABLE "FotoCliente" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "tipo" "FotoTipo" NOT NULL,
    "url" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FotoCliente_clienteId_idx" ON "FotoCliente"("clienteId");

-- CreateIndex
CREATE INDEX "FotoCliente_tipo_idx" ON "FotoCliente"("tipo");

-- AddForeignKey
ALTER TABLE "FotoCliente"
ADD CONSTRAINT "FotoCliente_clienteId_fkey"
FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
