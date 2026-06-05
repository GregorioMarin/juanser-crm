-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "proveedor" TEXT,
    "fecha" TIMESTAMP(3),
    "tipoDocumento" TEXT,
    "numeroDocumento" TEXT,
    "categoria" TEXT,
    "baseImponible" DECIMAL(10,2),
    "iva" DECIMAL(10,2),
    "total" DECIMAL(10,2),
    "formaPago" TEXT,
    "descripcion" TEXT,
    "observaciones" TEXT,
    "archivoUrl" TEXT,
    "clienteId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Gasto_proveedor_idx" ON "Gasto"("proveedor");

-- CreateIndex
CREATE INDEX "Gasto_fecha_idx" ON "Gasto"("fecha");

-- CreateIndex
CREATE INDEX "Gasto_tipoDocumento_idx" ON "Gasto"("tipoDocumento");

-- CreateIndex
CREATE INDEX "Gasto_categoria_idx" ON "Gasto"("categoria");

-- CreateIndex
CREATE INDEX "Gasto_clienteId_idx" ON "Gasto"("clienteId");

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
