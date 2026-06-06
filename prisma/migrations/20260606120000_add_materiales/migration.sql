CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "unidadBase" TEXT,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GastoLinea"
ADD COLUMN "materialId" TEXT,
ADD COLUMN "codigoMaterialDetectado" TEXT;

CREATE UNIQUE INDEX "Material_codigo_key" ON "Material"("codigo");
CREATE INDEX "Material_nombre_idx" ON "Material"("nombre");
CREATE INDEX "Material_categoria_idx" ON "Material"("categoria");
CREATE INDEX "GastoLinea_materialId_idx" ON "GastoLinea"("materialId");
CREATE INDEX "GastoLinea_codigoMaterialDetectado_idx" ON "GastoLinea"("codigoMaterialDetectado");

ALTER TABLE "GastoLinea"
ADD CONSTRAINT "GastoLinea_materialId_fkey"
FOREIGN KEY ("materialId") REFERENCES "Material"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
