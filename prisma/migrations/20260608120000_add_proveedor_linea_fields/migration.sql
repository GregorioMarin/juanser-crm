ALTER TABLE "GastoLinea"
ADD COLUMN "unidadMedidaProveedor" TEXT,
ADD COLUMN "esPorte" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "esPendienteServir" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pedidoProveedor" TEXT;

ALTER TABLE "GastoLinea"
ALTER COLUMN "precioUnidadMedida" TYPE DECIMAL(12,5);

CREATE INDEX "GastoLinea_pedidoProveedor_idx" ON "GastoLinea"("pedidoProveedor");
