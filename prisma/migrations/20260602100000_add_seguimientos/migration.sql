-- CreateTable
CREATE TABLE "Seguimiento" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota" TEXT NOT NULL,

    CONSTRAINT "Seguimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Seguimiento_clienteId_idx" ON "Seguimiento"("clienteId");

-- AddForeignKey
ALTER TABLE "Seguimiento"
ADD CONSTRAINT "Seguimiento_clienteId_fkey"
FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
