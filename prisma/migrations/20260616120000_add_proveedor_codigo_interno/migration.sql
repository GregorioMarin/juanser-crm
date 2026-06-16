ALTER TABLE "Proveedor"
ADD COLUMN "codigoInterno" TEXT;

CREATE UNIQUE INDEX "Proveedor_codigoInterno_key"
ON "Proveedor"("codigoInterno");
