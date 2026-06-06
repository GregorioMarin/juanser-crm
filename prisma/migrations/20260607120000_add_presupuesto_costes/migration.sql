ALTER TABLE "Presupuesto"
ADD COLUMN "costeHorasEstimadas" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "costeHora" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "costeTransporte" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "costeMontaje" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "PresupuestoCosteMaterial" (
  "id" SERIAL NOT NULL,
  "presupuestoId" INTEGER NOT NULL,
  "materialId" TEXT,
  "descripcion" TEXT NOT NULL,
  "cantidad" DECIMAL(10,2) NOT NULL DEFAULT 1,
  "precioCoste" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PresupuestoCosteMaterial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PresupuestoCosteOtro" (
  "id" SERIAL NOT NULL,
  "presupuestoId" INTEGER NOT NULL,
  "descripcion" TEXT NOT NULL,
  "importe" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PresupuestoCosteOtro_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PresupuestoCosteMaterial_presupuestoId_idx" ON "PresupuestoCosteMaterial"("presupuestoId");
CREATE INDEX "PresupuestoCosteMaterial_materialId_idx" ON "PresupuestoCosteMaterial"("materialId");
CREATE INDEX "PresupuestoCosteOtro_presupuestoId_idx" ON "PresupuestoCosteOtro"("presupuestoId");

ALTER TABLE "PresupuestoCosteMaterial"
ADD CONSTRAINT "PresupuestoCosteMaterial_presupuestoId_fkey"
FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PresupuestoCosteMaterial"
ADD CONSTRAINT "PresupuestoCosteMaterial_materialId_fkey"
FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PresupuestoCosteOtro"
ADD CONSTRAINT "PresupuestoCosteOtro_presupuestoId_fkey"
FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
